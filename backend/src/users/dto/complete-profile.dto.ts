import {
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsEmail,
  IsOptional,
  Length,
  IsArray,
  ArrayMaxSize,
  IsBoolean,
  IsIn,
  IsDateString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserGender } from '../entities/user.entity';
import {
  PROFILE_CREATED_BY,
  MARITAL_STATUSES,
  HAS_CHILDREN,
  RELIGIONS,
  MANGLIK,
  RESIDENCY_STATUSES,
  RELOCATE_OPTIONS,
  EDUCATION_LEVELS,
  WORK_SECTORS,
  INCOME_BRACKETS,
  DIETS,
  HABIT_OPTIONS,
  FAMILY_TYPES,
  FAMILY_VALUES,
  FAMILY_STATUSES,
  MIN_AGE,
  MAX_AGE,
  MIN_HEIGHT_CM,
  MAX_HEIGHT_CM,
} from '../profile-options';

export class PartnerPreferencesDto {
  @ApiProperty({ required: false, example: 25 })
  @IsOptional() @IsInt() @Min(MIN_AGE) @Max(MAX_AGE)
  minAge?: number;

  @ApiProperty({ required: false, example: 32 })
  @IsOptional() @IsInt() @Min(MIN_AGE) @Max(MAX_AGE)
  maxAge?: number;

  @ApiProperty({ required: false, example: 152 })
  @IsOptional() @IsInt() @Min(MIN_HEIGHT_CM) @Max(MAX_HEIGHT_CM)
  minHeightCm?: number;

  @ApiProperty({ required: false, example: 185 })
  @IsOptional() @IsInt() @Min(MIN_HEIGHT_CM) @Max(MAX_HEIGHT_CM)
  maxHeightCm?: number;

  @ApiProperty({ required: false, isArray: true, enum: MARITAL_STATUSES })
  @IsOptional() @IsArray() @IsIn([...MARITAL_STATUSES], { each: true })
  maritalStatuses?: string[];

  @ApiProperty({ required: false, isArray: true, enum: RELIGIONS })
  @IsOptional() @IsArray() @IsIn([...RELIGIONS], { each: true })
  religions?: string[];

  @ApiProperty({ required: false, isArray: true, example: ['Punjabi Khatri'] })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 60, { each: true })
  communities?: string[];

  @ApiProperty({ required: false, isArray: true, example: ['Hindi', 'Punjabi'] })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 40, { each: true })
  motherTongues?: string[];

  @ApiProperty({ required: false, isArray: true, example: ['United States', 'Canada'] })
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @Length(2, 60, { each: true })
  countries?: string[];

  @ApiProperty({ required: false, isArray: true, enum: EDUCATION_LEVELS })
  @IsOptional() @IsArray() @IsIn([...EDUCATION_LEVELS], { each: true })
  educationLevels?: string[];

  @ApiProperty({ required: false, isArray: true, enum: DIETS })
  @IsOptional() @IsArray() @IsIn([...DIETS], { each: true })
  diets?: string[];

  @ApiProperty({ required: false, enum: ['any', 'no', 'yes'] })
  @IsOptional() @IsIn(['any', 'no', 'yes'])
  manglik?: string;

  @ApiProperty({ required: false, description: 'What you are looking for in a partner' })
  @IsOptional() @IsString() @Length(0, 500)
  about?: string;
}

export class UpdatePartnerPreferencesDto {
  @ApiProperty({ type: PartnerPreferencesDto })
  @ValidateNested()
  @Type(() => PartnerPreferencesDto)
  partnerPreferences: PartnerPreferencesDto;
}

export class UpdateContactPrivacyDto {
  @ApiProperty({ description: 'Show phone/email to members you are connected with' })
  @IsBoolean()
  showContactToConnections: boolean;
}

export class CompleteStage1Dto {
  // ─── Basic details ───────────────────────────────────────────────────────
  @ApiProperty({ enum: PROFILE_CREATED_BY, example: 'self' })
  @IsIn([...PROFILE_CREATED_BY])
  profileCreatedBy: string;

  @ApiProperty({ example: 'Priya Sharma' })
  @IsString()
  @Length(2, 60)
  name: string;

  @ApiProperty({ enum: UserGender })
  @IsEnum(UserGender)
  gender: UserGender;

  @ApiProperty({ example: '1995-04-18' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ example: 165 })
  @IsInt()
  @Min(MIN_HEIGHT_CM)
  @Max(MAX_HEIGHT_CM)
  heightCm: number;

  @ApiProperty({ enum: MARITAL_STATUSES })
  @IsIn([...MARITAL_STATUSES])
  maritalStatus: string;

  @ApiProperty({ required: false, enum: HAS_CHILDREN })
  @IsOptional() @IsIn([...HAS_CHILDREN])
  hasChildren?: string;

  @ApiProperty({ example: 'priya@gmail.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  // ─── Religion & community ────────────────────────────────────────────────
  @ApiProperty({ enum: RELIGIONS })
  @IsIn([...RELIGIONS])
  religion: string;

  @ApiProperty({ required: false, example: 'Brahmin' })
  @IsOptional() @IsString() @Length(0, 60)
  community?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @Length(0, 60)
  subCommunity?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @Length(0, 60)
  gotra?: string;

  @ApiProperty({ required: false, description: 'Open to partners from any caste' })
  @IsOptional() @IsBoolean()
  casteNoBar?: boolean;

  @ApiProperty({ example: 'Hindi' })
  @IsString()
  @Length(2, 40)
  motherTongue: string;

  // ─── Horoscope ───────────────────────────────────────────────────────────
  @ApiProperty({ required: false, enum: MANGLIK })
  @IsOptional() @IsIn([...MANGLIK])
  manglik?: string;

  @ApiProperty({ required: false, example: '06:45' })
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'birthTime must be HH:mm' })
  birthTime?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @Length(0, 100)
  birthPlace?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @Length(0, 40)
  rashi?: string;

  // ─── NRI residency ───────────────────────────────────────────────────────
  @ApiProperty({ example: 'United States', description: 'Country you currently live in' })
  @IsString()
  @Length(2, 60)
  country: string;

  @ApiProperty({ required: false, example: 'California' })
  @IsOptional() @IsString() @Length(0, 60)
  state?: string;

  @ApiProperty({ example: 'San Jose' })
  @IsString()
  @Length(2, 100)
  city: string;

  @ApiProperty({ required: false, example: 'India' })
  @IsOptional() @IsString() @Length(2, 60)
  citizenship?: string;

  @ApiProperty({ required: false, enum: RESIDENCY_STATUSES })
  @IsOptional() @IsIn([...RESIDENCY_STATUSES])
  residencyStatus?: string;

  @ApiProperty({ required: false, example: 'India' })
  @IsOptional() @IsString() @Length(2, 60)
  grewUpIn?: string;

  @ApiProperty({ required: false, example: 'Punjab' })
  @IsOptional() @IsString() @Length(0, 60)
  nativeState?: string;

  @ApiProperty({ required: false, example: 'Ludhiana' })
  @IsOptional() @IsString() @Length(0, 100)
  nativeCity?: string;

  @ApiProperty({ required: false, enum: RELOCATE_OPTIONS })
  @IsOptional() @IsIn([...RELOCATE_OPTIONS])
  willingToRelocate?: string;

  // ─── Education & career ──────────────────────────────────────────────────
  @ApiProperty({ required: false, enum: EDUCATION_LEVELS })
  @IsOptional() @IsIn([...EDUCATION_LEVELS])
  educationLevel?: string;

  @ApiProperty({ required: false, example: 'Computer Science' })
  @IsOptional() @IsString() @Length(0, 100)
  educationField?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @Length(0, 120)
  college?: string;

  @ApiProperty({ required: false, example: 'Software Engineer' })
  @IsOptional() @IsString() @Length(0, 100)
  occupation?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @Length(0, 100)
  employer?: string;

  @ApiProperty({ required: false, enum: WORK_SECTORS })
  @IsOptional() @IsIn([...WORK_SECTORS])
  workSector?: string;

  @ApiProperty({ required: false, enum: INCOME_BRACKETS })
  @IsOptional() @IsIn([...INCOME_BRACKETS])
  annualIncome?: string;

  // ─── Lifestyle ───────────────────────────────────────────────────────────
  @ApiProperty({ required: false, enum: DIETS })
  @IsOptional() @IsIn([...DIETS])
  diet?: string;

  @ApiProperty({ required: false, enum: HABIT_OPTIONS })
  @IsOptional() @IsIn([...HABIT_OPTIONS])
  smoking?: string;

  @ApiProperty({ required: false, enum: HABIT_OPTIONS })
  @IsOptional() @IsIn([...HABIT_OPTIONS])
  drinking?: string;

  @ApiProperty({ required: false, isArray: true, example: ['Travel', 'Cooking'] })
  @IsOptional() @IsArray() @ArrayMaxSize(15) @IsString({ each: true }) @Length(1, 40, { each: true })
  hobbies?: string[];

  // ─── Family ──────────────────────────────────────────────────────────────
  @ApiProperty({ required: false, enum: FAMILY_TYPES })
  @IsOptional() @IsIn([...FAMILY_TYPES])
  familyType?: string;

  @ApiProperty({ required: false, enum: FAMILY_VALUES })
  @IsOptional() @IsIn([...FAMILY_VALUES])
  familyValues?: string;

  @ApiProperty({ required: false, enum: FAMILY_STATUSES })
  @IsOptional() @IsIn([...FAMILY_STATUSES])
  familyStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @Length(0, 100)
  fatherOccupation?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @Length(0, 100)
  motherOccupation?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsInt() @Min(0) @Max(15)
  brothers?: number;

  @ApiProperty({ required: false })
  @IsOptional() @IsInt() @Min(0) @Max(15)
  sisters?: number;

  @ApiProperty({ required: false, example: 'Delhi, India' })
  @IsOptional() @IsString() @Length(0, 100)
  familyLocation?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @Length(0, 1000)
  aboutFamily?: string;

  // ─── About ───────────────────────────────────────────────────────────────
  @ApiProperty({ required: false, description: 'About me (max 1000 chars)' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  bio?: string;

  @ApiProperty({ required: false, type: PartnerPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PartnerPreferencesDto)
  partnerPreferences?: PartnerPreferencesDto;

  @ApiProperty({ required: false, description: 'Show phone/email to accepted connections' })
  @IsOptional() @IsBoolean()
  showContactToConnections?: boolean;

  @ApiProperty({ required: false, description: 'Referral code from a friend' })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  referredByCode?: string;
}
