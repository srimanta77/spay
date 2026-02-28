import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { v4 as uuidv4 } from 'uuid';

import { Payment } from '../entities/payment.entity';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { WalletService } from '../../wallet/services/wallet.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private walletService: WalletService,
    private dataSource: DataSource,
    @InjectRedis() private redis: Redis,
  ) {}

  async sendMoney(
    fromUser: User,
    createPaymentDto: CreatePaymentDto,
    idempotencyKey: string,
  ): Promise<Payment> {
    // Check idempotency
    const existing = await this.redis.get(`idempotency:${idempotencyKey}`);
    if (existing) {
      const payment = await this.paymentRepository.findOne({ where: { id: existing } });
      if (!payment) throw new NotFoundException('Payment not found');
      return payment;
    }

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get sender's wallet with lock
      const fromWallet = await queryRunner.manager
        .createQueryBuilder(Wallet, 'wallet')
        .setLock('pessimistic_write')
        .where('wallet.user_id = :userId', { userId: fromUser.id })
        .getOne();

      if (!fromWallet) {
        throw new NotFoundException('Sender wallet not found');
      }

      // Get receiver's wallet
      const toUserWallet = await queryRunner.manager
        .createQueryBuilder(Wallet, 'wallet')
        .where('wallet.user_id = :userId', { userId: createPaymentDto.toUserId })
        .getOne();

      if (!toUserWallet) {
        throw new NotFoundException('Receiver wallet not found');
      }

      // Check balance
      if (Number(fromWallet.balance) < createPaymentDto.amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // Create payment record
      const paymentRef = 'PAY-' + uuidv4();
      const payment = queryRunner.manager.create(Payment, {
        paymentReference: paymentRef,
        fromUser,
        toUser: { id: createPaymentDto.toUserId },
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency || 'USD',
        status: 'pending',
        idempotencyKey,
        metadata: { description: createPaymentDto.description },
      });
      await queryRunner.manager.save(payment);

      // Update balances
      fromWallet.balance = Number(fromWallet.balance) - createPaymentDto.amount;
      toUserWallet.balance = Number(toUserWallet.balance) + createPaymentDto.amount;
      await queryRunner.manager.save(fromWallet);
      await queryRunner.manager.save(toUserWallet);

      // Create ledger entries (optional)
      // ...

      payment.status = 'completed';
      await queryRunner.manager.save(payment);

      await queryRunner.commitTransaction();

      // Store idempotency result
      await this.redis.setex(`idempotency:${idempotencyKey}`, 86400, payment.id);

      return payment;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getTransactionHistory(userId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: [{ fromUser: { id: userId } }, { toUser: { id: userId } }],
      relations: ['fromUser', 'toUser'],
      order: { createdAt: 'DESC' },
    });
  }
}