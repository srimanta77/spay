import { Controller, Post, Body, Get, UseGuards, Headers, BadRequestException } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { User } from '../../../common/decorators/user.decorator';

@Controller('api/v1/payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('send')
  async sendMoney(
    @User() user,
    @Body() createPaymentDto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    const payment = await this.paymentService.sendMoney(user, createPaymentDto, idempotencyKey);
    return { message: 'Payment successful', payment };
  }

  @Get('history')
  async getHistory(@User() user) {
    const transactions = await this.paymentService.getTransactionHistory(user.id);
    return { transactions };
  }
}