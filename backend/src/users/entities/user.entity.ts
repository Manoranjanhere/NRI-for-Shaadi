import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BeforeInsert,
} from 'typeorm';
import type { PartnerPreferences } from '../profile-options';
import { FREE_TRIAL_DAYS } from '../../subscriptions/subscription.constants';

export enum UserGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum ProfileStage {
  REGISTERED = 0,
  STAGE1_COMPLETE = 1,
  STAGE2_COMPLETE = 2,
  ACTIVE = 3,
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Auth identifiers ---
  @Column({ nullable: true, unique: true })
  phone: string;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({ nullable: true, unique: true })
  googleId: string;

  @Column({ nullable: true, unique: true })
  facebookId: string;

  @Column({ nullable: true, unique: true })
  appleId: string;

  // --- Basic details ---
  @Column({ nullable: true })
  profileCreatedBy: string;   // self | parent | sibling | relative | friend

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'enum', enum: UserGender, nullable: true })
  gender: UserGender;

  @Column({ nullable: true, type: 'date' })
  dateOfBirth: string;

  /** Derived from dateOfBirth on save; kept for sorting/legacy rows. */
  @Column({ nullable: true })
  age: number;

  @Column({ nullable: true, type: 'int' })
  heightCm: number;

  @Column({ nullable: true })
  maritalStatus: string;

  @Column({ nullable: true })
  hasChildren: string;

  // --- Religion & community ---
  @Column({ nullable: true })
  religion: string;

  @Column({ nullable: true })
  community: string;          // caste / community

  @Column({ nullable: true })
  subCommunity: string;

  @Column({ nullable: true })
  gotra: string;

  @Column({ default: false })
  casteNoBar: boolean;

  @Column({ nullable: true })
  motherTongue: string;

  // --- Horoscope ---
  @Column({ nullable: true })
  manglik: string;

  @Column({ nullable: true })
  birthTime: string;          // HH:mm

  @Column({ nullable: true })
  birthPlace: string;

  @Column({ nullable: true })
  rashi: string;

  // --- NRI residency (country = country of residence) ---
  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  citizenship: string;

  @Column({ nullable: true })
  residencyStatus: string;    // citizen | permanent_resident | work_visa | ...

  @Column({ nullable: true })
  grewUpIn: string;

  @Column({ nullable: true })
  nativeState: string;        // Indian roots

  @Column({ nullable: true })
  nativeCity: string;

  @Column({ nullable: true })
  willingToRelocate: string;

  // --- Education & career ---
  @Column({ nullable: true })
  educationLevel: string;

  @Column({ nullable: true })
  educationField: string;

  @Column({ nullable: true })
  college: string;

  @Column({ nullable: true })
  occupation: string;

  @Column({ nullable: true })
  employer: string;

  @Column({ nullable: true })
  workSector: string;

  @Column({ nullable: true })
  annualIncome: string;       // USD bracket id

  // --- Lifestyle ---
  @Column({ nullable: true })
  diet: string;

  @Column({ nullable: true })
  smoking: string;

  @Column({ nullable: true })
  drinking: string;

  @Column({ type: 'simple-array', nullable: true })
  hobbies: string[];

  // --- Family ---
  @Column({ nullable: true })
  familyType: string;

  @Column({ nullable: true })
  familyValues: string;

  @Column({ nullable: true })
  familyStatus: string;

  @Column({ nullable: true })
  fatherOccupation: string;

  @Column({ nullable: true })
  motherOccupation: string;

  @Column({ nullable: true, type: 'int' })
  brothers: number;

  @Column({ nullable: true, type: 'int' })
  sisters: number;

  @Column({ nullable: true })
  familyLocation: string;

  @Column({ nullable: true, type: 'text' })
  aboutFamily: string;

  // --- About me ---
  @Column({ nullable: true, type: 'text' })
  bio: string;

  // --- Partner preferences ---
  @Column({ nullable: true, type: 'jsonb' })
  partnerPreferences: PartnerPreferences | null;

  // --- Privacy ---
  @Column({ default: true })
  showContactToConnections: boolean;

  // --- Photo verification ---
  @Column({ default: 'unverified' })
  photoVerifiedStatus: string;  // unverified | pending | verified | failed

  @Column({ nullable: true })
  selfieS3Key: string;

  @Column({ nullable: true, type: 'float' })
  faceMatchConfidence: number;

  // --- Profile completion tracking ---
  @Column({ type: 'int', default: ProfileStage.REGISTERED })
  profileStage: number;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isBanned: boolean;

  @Column({ type: 'text', nullable: true })
  accountWarningMessage: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  accountWarningAt: Date | null;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ default: false })
  isSuperAdmin: boolean;  // can manage admins themselves

  // --- Profile visibility ---
  @Column({ nullable: true, type: 'timestamp' })
  hiddenUntil: Date;          // if set and in future → profile hidden from discover

  @Column({ nullable: true, type: 'timestamp' })
  likedBySeenAt: Date;        // last time user opened Liked By list

  // --- Soft delete ---
  @DeleteDateColumn()
  deletedAt: Date;            // TypeORM soft-delete

  // --- Referral ---
  @Column({ nullable: true, unique: true, length: 6 })
  referralCode: string;

  @Column({ nullable: true })
  referredByCode: string;

  // --- Subscription ---
  @Column({ nullable: true })
  stripeCustomerId: string;

  @Column({ nullable: true })
  subscriptionPlan: string;       // premium

  @Column({ type: 'int', default: 0 })
  subscriptionTier: number;       // 0 = free, 1 = premium

  @Column({ nullable: true, type: 'timestamp' })
  subscriptionExpiresAt: Date;

  /** Every new member gets full premium access until this date. */
  @Column({ nullable: true, type: 'timestamp' })
  trialEndsAt: Date;

  // --- Coins ---
  @Column({ type: 'int', default: 0 })
  coins: number;

  @Column({ nullable: true, type: 'date' })
  lastDailyRewardAt: Date;

  // --- Daily Quotas (reset at midnight) ---
  @Column({ type: 'int', default: 0 })
  dailyMsgCount: number;

  @Column({ nullable: true, type: 'date' })
  dailyMsgResetAt: Date;

  @Column({ type: 'int', default: 0 })
  dailyInterestCount: number;

  @Column({ nullable: true, type: 'date' })
  dailyInterestResetAt: Date;

  @Column({ type: 'int', default: 0 })
  dailySuperLikeCount: number;

  @Column({ nullable: true, type: 'date' })
  dailySuperLikeResetAt: Date;

  @Column({ type: 'int', default: 0 })
  dailyComplimentCount: number;

  @Column({ nullable: true, type: 'date' })
  dailyComplimentResetAt: Date;

  // --- Extra quota purchased ---
  @Column({ type: 'int', default: 0 })
  extraMsgCredits: number;

  @Column({ type: 'int', default: 0 })
  extraSuperLikeCredits: number;

  // --- Location ---
  @Column({ nullable: true, type: 'float' })
  latitude: number;

  @Column({ nullable: true, type: 'float' })
  longitude: number;

  @Column({ nullable: true, type: 'timestamp' })
  locationUpdatedAt: Date;

  // --- Timestamps ---
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  lastActiveAt: Date;

  @BeforeInsert()
  startFreeTrial() {
    if (!this.trialEndsAt) {
      const ends = new Date();
      ends.setDate(ends.getDate() + FREE_TRIAL_DAYS);
      this.trialEndsAt = ends;
    }
  }
}
