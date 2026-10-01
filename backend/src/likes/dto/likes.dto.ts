import { IsOptional, IsInt, Min, Max, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class SendInterestDto {
  @ApiProperty({
    required: false,
    maxLength: 255,
    example: 'Hi! Our families share similar values — would love to connect.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  message?: string;
}
