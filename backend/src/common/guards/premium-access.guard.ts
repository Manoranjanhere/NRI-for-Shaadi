import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';
import {
  FREE_TRIAL_DAYS,
  PREMIUM_PLAN,
  hasPremiumAccess,
  isPaidFeaturesDisabled,
} from '../../subscriptions/subscription.constants';

export const PREMIUM_REQUIRED_MESSAGE =
  `Your ${FREE_TRIAL_DAYS}-day free trial has ended. Subscribe to ${PREMIUM_PLAN.name} ` +
  `(₹${PREMIUM_PLAN.monthlyPrice}/month) to send interests and messages.`;

export function assertPremiumAccess(user: User): void {
  if (isPaidFeaturesDisabled()) return;
  if (!hasPremiumAccess(user)) {
    throw new ForbiddenException(PREMIUM_REQUIRED_MESSAGE);
  }
}

/** Blocks the route unless the member is on the free trial or has an active subscription. */
@Injectable()
export class PremiumAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user: User = context.switchToHttp().getRequest().user;
    assertPremiumAccess(user);
    return true;
  }
}
