import { IsOptional, IsNumber, IsEnum, IsInt, Min, Max, IsIn, IsBoolean, IsString, Length, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserGender } from '../../users/entities/user.entity';
import {
  MARITAL_STATUSES,
  RELIGIONS,
  EDUCATION_LEVELS,
  DIETS,
  RESIDENCY_STATUSES,
  MIN_AGE,
  MAX_AGE,
  MIN_HEIGHT_CM,
  MAX_HEIGHT_CM,
} from '../../users/profile-options';

export class UpdateLocationDto {
  @ApiProperty({ example: 19.076 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 72.8777 })
  @IsNumber()
  longitude: number;
}

/** Accepts `a,b,c`, repeated query keys, or an array. */
const toList = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  const list = (Array.isArray(value) ? value : String(value).split(','))
    .map((v) => String(v).trim())
    .filter(Boolean);
  return list.length ? list : undefined;
};

const toBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1' ? true : value === false || value === 'false' || value === '0' ? false : undefined;

export class DiscoverQueryDto {
  @ApiProperty({ required: false, enum: ['recommended', 'newest', 'active'], default: 'recommended' })
  @IsOptional()
  @IsIn(['recommended', 'newest', 'active'])
  sort?: 'recommended' | 'newest' | 'active' = 'recommended';

  @ApiProperty({ required: false, enum: UserGender, description: 'Defaults to the opposite of your gender' })
  @IsOptional()
  @IsEnum(UserGender)
  gender?: UserGender;

  @ApiProperty({ required: false })
  @IsOptional() @Type(() => Number) @IsInt() @Min(MIN_AGE) @Max(MAX_AGE)
  minAge?: number;

  @ApiProperty({ required: false })
  @IsOptional() @Type(() => Number) @IsInt() @Min(MIN_AGE) @Max(MAX_AGE)
  maxAge?: number;

  @ApiProperty({ required: false })
  @IsOptional() @Type(() => Number) @IsInt() @Min(MIN_HEIGHT_CM) @Max(MAX_HEIGHT_CM)
  minHeightCm?: number;

  @ApiProperty({ required: false })
  @IsOptional() @Type(() => Number) @IsInt() @Min(MIN_HEIGHT_CM) @Max(MAX_HEIGHT_CM)
  maxHeightCm?: number;

  @ApiProperty({ required: false, description: 'Comma separated', example: 'hindu,sikh' })
  @IsOptional() @Transform(toList) @IsArray() @IsIn([...RELIGIONS], { each: true })
  religions?: string[];

  @ApiProperty({ required: false, description: 'Comma separated', example: 'Hindi,Punjabi' })
  @IsOptional() @Transform(toList) @IsArray() @IsString({ each: true })
  motherTongues?: string[];

  @ApiProperty({ required: false, description: 'Country of residence, comma separated', example: 'United States,Canada' })
  @IsOptional() @Transform(toList) @IsArray() @IsString({ each: true })
  countries?: string[];

  @ApiProperty({ required: false, description: 'Comma separated' })
  @IsOptional() @Transform(toList) @IsArray() @IsIn([...MARITAL_STATUSES], { each: true })
  maritalStatuses?: string[];

  @ApiProperty({ required: false, description: 'Comma separated' })
  @IsOptional() @Transform(toList) @IsArray() @IsIn([...EDUCATION_LEVELS], { each: true })
  educationLevels?: string[];

  @ApiProperty({ required: false, description: 'Comma separated' })
  @IsOptional() @Transform(toList) @IsArray() @IsIn([...DIETS], { each: true })
  diets?: string[];

  @ApiProperty({ required: false, description: 'Comma separated' })
  @IsOptional() @Transform(toList) @IsArray() @IsIn([...RESIDENCY_STATUSES], { each: true })
  residencyStatuses?: string[];

  @ApiProperty({ required: false, description: 'Community / caste contains' })
  @IsOptional() @IsString() @Length(1, 60)
  community?: string;

  @ApiProperty({ required: false, description: 'Search name, occupation, city or community' })
  @IsOptional() @IsString() @Length(1, 60)
  keyword?: string;

  @ApiProperty({ required: false })
  @IsOptional() @Transform(toBool) @IsBoolean()
  verifiedOnly?: boolean;

  @ApiProperty({ required: false })
  @IsOptional() @Transform(toBool) @IsBoolean()
  withPhotoOnly?: boolean;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit?: number = 10;
}
