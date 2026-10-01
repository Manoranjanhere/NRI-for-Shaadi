import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyGooglePlayCoinDto {
  @ApiProperty({ example: 'nrishaadi_coins_5' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  purchaseToken: string;
}
