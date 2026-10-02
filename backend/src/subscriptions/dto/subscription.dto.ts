import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const ALL_PLAN_IDS = ['premium'];
const BILLING_PERIODS = ['monthly'] as const;

/** @deprecated Stripe checkout — use Google Play on mobile */
export class CreateSubscriptionDto {
  @ApiProperty({ example: 'premium', enum: ALL_PLAN_IDS })
  @IsString()
  @IsIn(ALL_PLAN_IDS)
  planId: string;

  @ApiProperty({ example: 'monthly', enum: BILLING_PERIODS, required: false })
  @IsOptional()
  @IsIn(BILLING_PERIODS)
  billingPeriod?: 'monthly';
}

/** Verify a Google Play subscription purchase from the app */
export class VerifyGooglePlaySubscriptionDto {
  @ApiProperty({ example: 'nrishaadi_premium_1m' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'purchaseToken from Google Play' })
  @IsString()
  purchaseToken: string;

  @ApiProperty({ required: false, example: 'com.nriconnectshaadi.app' })
  @IsOptional()
  @IsString()
  packageName?: string;
}

export class StripeWebhookDto {
  type: string;
  data: { object: any };
}
