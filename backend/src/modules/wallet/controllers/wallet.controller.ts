import { Controller, Get, UseGuards } from '@nestjs/common';
import { WalletService } from '../services/wallet.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { User } from '../../../common/decorators/user.decorator';

@Controller('api/v1/wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  async getWallet(@User() user) {
    const wallet = await this.walletService.getWalletByUserId(user.id);
    return { wallet };
  }
}