import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    // Run migrations or sync schema (if using in-memory DB)
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/register (POST) - success', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.message).toContain('Registration successful');
      });
  });

  it('/auth/login (POST) - success', async () => {
    // First register
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'login@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Doe',
      });

    // Then login
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'login@example.com',
        password: 'Password123!',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.user.email).toBe('login@example.com');
      });
  });

  it('/auth/login (POST) - wrong password', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' })
      .expect(401);
  });
});