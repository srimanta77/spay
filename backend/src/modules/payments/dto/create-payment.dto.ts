import { IsString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  toUserId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  currency?: string = 'USD';
}