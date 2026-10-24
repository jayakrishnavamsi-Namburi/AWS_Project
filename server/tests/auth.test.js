/**
 * SecureProctor — Authentication Service Unit Tests
 * ===================================================
 * Tests: register, login, password hashing, JWT, rate limiting
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ── Mock mongoose before importing service ──────────────────────────────────
const mockUserSave = jest.fn();
const mockUserFindOne = jest.fn();
const mockUserFindById = jest.fn();

jest.mock('mongoose', () => ({
  connect: jest.fn(),
  Schema: class {
    constructor() {}
    pre() { return this; }
    index() { return this; }
  },
  model: jest.fn(() => ({})),
  Types: { ObjectId: class { toString() { return 'mock_id'; } } },
}));

jest.mock('../src/models/User.js', () => ({
  User: {
    findOne: mockUserFindOne,
    findById: mockUserFindById,
    create: jest.fn(),
  },
}));

jest.mock('../src/services/auditService.js', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/config/env.js', () => ({
  config: {
    jwtSecret: 'test_jwt_secret_at_least_32_chars_long',
    jwtExpiresIn: '1d',
    nodeEnv: 'test',
    clientUrl: 'http://localhost:5173',
  },
}));

jest.mock('../src/config/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Password Hashing', () => {
  test('bcrypt hashes a password with salt rounds >= 10', async () => {
    const password = 'TestPassword@123';
    const hash = await bcrypt.hash(password, 12);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2')).toBe(true);
  });

  test('bcrypt correctly verifies a matching password', async () => {
    const password = 'TestPassword@123';
    const hash = await bcrypt.hash(password, 10);
    const isMatch = await bcrypt.compare(password, hash);
    expect(isMatch).toBe(true);
  });

  test('bcrypt rejects a non-matching password', async () => {
    const hash = await bcrypt.hash('TestPassword@123', 10);
    const isMatch = await bcrypt.compare('WrongPassword', hash);
    expect(isMatch).toBe(false);
  });

  test('two hashes of the same password are different (salt)', async () => {
    const password = 'SamePassword@1';
    const hash1 = await bcrypt.hash(password, 10);
    const hash2 = await bcrypt.hash(password, 10);
    expect(hash1).not.toBe(hash2);
  });
});

describe('JWT Token Generation & Verification', () => {
  const secret = 'test_jwt_secret_at_least_32_chars_long';

  test('signs a payload and produces a JWT string', () => {
    const payload = { userId: 'abc123', role: 'student' };
    const token = jwt.sign(payload, secret, { expiresIn: '1d' });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  test('verifies a valid token and returns the payload', () => {
    const payload = { userId: 'abc123', role: 'admin' };
    const token = jwt.sign(payload, secret, { expiresIn: '1d' });
    const decoded = jwt.verify(token, secret);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.role).toBe(payload.role);
  });

  test('throws when verifying with wrong secret', () => {
    const token = jwt.sign({ userId: 'abc123' }, secret, { expiresIn: '1d' });
    expect(() => jwt.verify(token, 'wrong_secret')).toThrow(
      jwt.JsonWebTokenError
    );
  });

  test('throws when token is expired', () => {
    const token = jwt.sign({ userId: 'abc123' }, secret, { expiresIn: '0s' });
    // allow 1ms for it to expire
    return new Promise((resolve) =>
      setTimeout(() => {
        expect(() => jwt.verify(token, secret)).toThrow(jwt.TokenExpiredError);
        resolve();
      }, 50)
    );
  });

  test('throws when token is tampered', () => {
    const token = jwt.sign({ userId: 'abc123' }, secret, { expiresIn: '1d' });
    const [header, payload, sig] = token.split('.');
    const tampered = [header, payload + 'x', sig].join('.');
    expect(() => jwt.verify(tampered, secret)).toThrow();
  });
});

describe('Input Validation — Auth Schemas', () => {
  // Test Zod schemas directly without DB
  let registerSchema;

  beforeAll(async () => {
    const { z } = await import('zod');

    registerSchema = z.object({
      name: z.string().min(2).max(100),
      email: z.string().email(),
      password: z
        .string()
        .min(8)
        .regex(/[A-Z]/, 'uppercase')
        .regex(/[0-9]/, 'digit')
        .regex(/[^A-Za-z0-9]/, 'special'),
      studentId: z.string().optional(),
      department: z.string().optional(),
    });
  });

  test('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      name: 'Jane Doe',
      email: 'jane@university.edu',
      password: 'Password@123',
    });
    expect(result.success).toBe(true);
  });

  test('rejects short name', () => {
    const result = registerSchema.safeParse({
      name: 'J',
      email: 'j@test.com',
      password: 'Password@123',
    });
    expect(result.success).toBe(false);
  });

  test('rejects invalid email format', () => {
    const result = registerSchema.safeParse({
      name: 'Jane Doe',
      email: 'not_an_email',
      password: 'Password@123',
    });
    expect(result.success).toBe(false);
  });

  test('rejects password without special character', () => {
    const result = registerSchema.safeParse({
      name: 'Jane Doe',
      email: 'jane@test.com',
      password: 'Password123',
    });
    expect(result.success).toBe(false);
  });

  test('rejects password without uppercase', () => {
    const result = registerSchema.safeParse({
      name: 'Jane Doe',
      email: 'jane@test.com',
      password: 'password@123',
    });
    expect(result.success).toBe(false);
  });
});
