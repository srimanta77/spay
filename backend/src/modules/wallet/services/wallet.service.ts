import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    private dataSource: DataSource,
  ) {}

  async getWalletByUserId(userId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }

  async createWallet(user: User): Promise<Wallet> {
    const walletNumber = this.generateWalletNumber();
    const wallet = this.walletRepository.create({
      user,
      walletNumber,
      balance: 0,
    });
    return this.walletRepository.save(wallet);
  }

  async addFunds(userId: string, amount: number, description?: string): Promise<Wallet> {
    const wallet = await this.getWalletByUserId(userId);
    wallet.balance = Number(wallet.balance) + amount;
    return this.walletRepository.save(wallet);
  }

  async deductFunds(userId: string, amount: number, description?: string): Promise<Wallet> {
    const wallet = await this.getWalletByUserId(userId);
    if (Number(wallet.balance) < amount) {
      throw new BadRequestException('Insufficient balance');
    }
    wallet.balance = Number(wallet.balance) - amount;
    return this.walletRepository.save(wallet);
  }

  private generateWalletNumber(): string {
    return 'SP' + Date.now() + Math.floor(Math.random() * 1000);
  }
}