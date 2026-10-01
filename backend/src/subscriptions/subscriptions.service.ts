import {
  Injectable, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe = require('stripe');

import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { CreateSubscriptionDto } from './dto/subscription.dto';
import {
  ALL_PLANS,
  FREE_TRIAL_DAYS,
  REFERRAL_BONUS_DAYS,
  getPlanById, BillingPeriod, BILLING_PERIOD_MONTHS,
  parsePlaySubscriptionProductId,
  getPlayCatalog, enrichPlanWithPlayIds,
  isTrialActive, isSubscriptionActive, isPaidFeaturesDisabled,
} from './subscription.constants';
import { GooglePlayBillingService } from './google-play-billing.service';
import { AuditService } from '../audits/audits.service';
import { PaymentActivityName } from '../audits/audit.constants';

@Injectable()
export class SubscriptionsService {
  private stripe: any;

  constructor(
    @InjectRepository(Subscription)
    private readonly subRepository: Repository<Subscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly googlePlay: GooglePlayBillingService,
    private readonly auditService: AuditService,
  ) {
    this.stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
      apiVersion: '2026-04-22.dahlia',
    });
  }

  getAccessStatus(user: User) {
    const trialActive = isTrialActive(user);
    const subscriptionActive = isSubscriptionActive(user);
    const trialDaysLeft = trialActive
      ? Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      : 0;
    return {
      hasPremiumAccess: trialActive || subscriptionActive,
      trialActive,
      trialEndsAt: user.trialEndsAt ?? null,
      trialDaysLeft,
      subscriptionActive,
      subscriptionExpiresAt: subscriptionActive ? user.subscriptionExpiresAt ?? null : null,
    };
  }

  getPlansForUser(user: User) {
    return {
      plans: ALL_PLANS.map(enrichPlanWithPlayIds),
      billingPeriods: [{ id: 'monthly' as BillingPeriod, label: '1 Month', months: 1 }],
      freeTrialDays: FREE_TRIAL_DAYS,
      referralBonusDays: REFERRAL_BONUS_DAYS,
      access: this.getAccessStatus(user),
      paymentProvider: 'google_play',
      playCatalog: getPlayCatalog(),
    };
  }

  getPlayCatalog() {
    return getPlayCatalog();
  }

  getFeatureFlags() {
    return { paidFeaturesDisabled: isPaidFeaturesDisabled() };
  }

  getAllPlansPublic() {
    return {
      plans: ALL_PLANS.map(enrichPlanWithPlayIds),
      freeTrialDays: FREE_TRIAL_DAYS,
      referralBonusDays: REFERRAL_BONUS_DAYS,
      billingPeriods: ['monthly'],
      paymentProvider: 'google_play',
      playCatalog: getPlayCatalog(),
    };
  }

  async verifyGooglePlaySubscription(
    userId: string,
    productId: string,
    purchaseToken: string,
  ) {
    try {
      const parsed = parsePlaySubscriptionProductId(productId);
      if (!parsed) {
        throw new BadRequestException('Unknown Google Play subscription product');
      }

      const existing = await this.subRepository.findOne({
        where: { googlePlayPurchaseToken: purchaseToken },
      });
      if (existing) {
        const plan = getPlanById(existing.planId);
        return {
          alreadyProcessed: true,
          subscription: existing,
          plan,
          expiresAt: existing.expiresAt,
        };
      }

      const verification = await this.googlePlay.verifySubscription(productId, purchaseToken);
      if (!verification.valid) {
        throw new BadRequestException('Google Play subscription is not valid');
      }

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      const plan = getPlanById(parsed.planId);
      if (!plan) throw new BadRequestException('Invalid plan');

      const previousPlan = user.subscriptionPlan || null;
      const sub = await this.activateSubscription({
        userId,
        planId: parsed.planId,
        tier: plan.tier,
        billingPeriod: parsed.period,
        amountPaid: plan.monthlyPrice * 100,
        googlePlayProductId: productId,
        googlePlayPurchaseToken: purchaseToken,
        googlePlayOrderId: verification.orderId,
        playExpiryTimeMillis: verification.expiryTimeMillis,
      });

      const updatedUser = await this.userRepository.findOne({ where: { id: userId } });

      await this.auditService.logPayment({
        forUser: userId,
        byUser: userId,
        activityName: PaymentActivityName.PAYMENT_SUBSCRIPTION,
        affectedDataName: 'SubscriptionPlan',
        fromValue: previousPlan,
        toValue: parsed.planId,
        notes: [
          `productId=${productId}`,
          `period=${parsed.period}`,
          verification.orderId ? `orderId=${verification.orderId}` : null,
          `amountInr=${plan.monthlyPrice}`,
        ]
          .filter(Boolean)
          .join(' | '),
      });

      return {
        alreadyProcessed: false,
        subscription: sub,
        plan,
        expiresAt: updatedUser?.subscriptionExpiresAt,
        user: {
          subscriptionPlan: updatedUser?.subscriptionPlan,
          subscriptionTier: updatedUser?.subscriptionTier,
          subscriptionExpiresAt: updatedUser?.subscriptionExpiresAt,
          trialEndsAt: updatedUser?.trialEndsAt,
        },
      };
    } catch (err) {
      await this.auditService.logPayment({
        forUser: userId,
        byUser: userId,
        activityName: PaymentActivityName.PAYMENT_SUBSCRIPTION_FAILED,
        affectedDataName: 'SubscriptionPlan',
        fromValue: null,
        toValue: productId,
        notes: (err as Error)?.message || 'verification failed',
      });
      throw err;
    }
  }

  private async activateSubscription(opts: {
    userId: string;
    planId: string;
    tier: number;
    billingPeriod: BillingPeriod;
    amountPaid: number;
    googlePlayProductId?: string;
    googlePlayPurchaseToken?: string;
    googlePlayOrderId?: string;
    stripeSessionId?: string;
    playExpiryTimeMillis?: number;
  }): Promise<Subscription> {
    const plan = getPlanById(opts.planId);
    const now = new Date();

    const user = await this.userRepository.findOne({ where: { id: opts.userId } });
    const baseStart =
      user?.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > now
        ? new Date(user.subscriptionExpiresAt)
        : now;

    let expiresAt: Date;
    if (opts.playExpiryTimeMillis && opts.playExpiryTimeMillis > Date.now()) {
      expiresAt = new Date(opts.playExpiryTimeMillis);
    } else {
      expiresAt = new Date(baseStart);
      expiresAt.setMonth(
        expiresAt.getMonth() + BILLING_PERIOD_MONTHS[opts.billingPeriod],
      );
    }

    const sub = this.subRepository.create({
      userId: opts.userId,
      planId: opts.planId,
      tier: opts.tier,
      billingPeriod: opts.billingPeriod,
      amountPaid: opts.amountPaid,
      stripeSessionId: opts.stripeSessionId,
      googlePlayProductId: opts.googlePlayProductId,
      googlePlayPurchaseToken: opts.googlePlayPurchaseToken,
      googlePlayOrderId: opts.googlePlayOrderId,
      status: SubscriptionStatus.ACTIVE,
      startsAt: now,
      expiresAt,
    });
    await this.subRepository.save(sub);

    await this.userRepository.update(opts.userId, {
      subscriptionPlan: opts.planId,
      subscriptionTier: opts.tier,
      subscriptionExpiresAt: expiresAt,
    });

    return sub;
  }

  async createSubscriptionCheckout(_userId: string, _dto: CreateSubscriptionDto) {
    throw new BadRequestException(
      'Use Google Play billing in the app. Stripe checkout is disabled for mobile subscriptions.',
    );
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || '',
      );
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const meta = session.metadata;
      if (meta.type === 'subscription') {
        const period: BillingPeriod = 'monthly';
        const plan = getPlanById(meta.planId);
        await this.activateSubscription({
          userId: meta.userId,
          planId: meta.planId,
          tier: parseInt(meta.tier, 10),
          billingPeriod: period,
          amountPaid: plan ? plan.monthlyPrice * 100 : 0,
          stripeSessionId: session.id,
        });
      }
    }
  }

  async getCurrentSubscription(user: User) {
    const sub = await this.subRepository.findOne({
      where: { userId: user.id, status: SubscriptionStatus.ACTIVE },
      order: { expiresAt: 'DESC' },
    });
    const plan = sub && isSubscriptionActive(user) ? getPlanById(sub.planId) : null;
    return {
      subscription: sub,
      plan: plan ? enrichPlanWithPlayIds(plan) : null,
      access: this.getAccessStatus(user),
    };
  }

  async getSubscriptionHistory(userId: string) {
    return this.subRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
