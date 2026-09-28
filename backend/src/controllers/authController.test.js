/**
 * backend/src/controllers/authController.test.js
 *
 * No live MongoDB is available in this sandbox (fastdl.mongodb.org is not on the
 * network allowlist, so mongodb-memory-server can't download a binary here). These
 * tests mock the User model instead, so they verify the actual business logic -
 * validation, hashing, password comparison, token issuance, and error responses -
 * without needing a real database. A full integration test against real Mongo is
 * still worth running manually (see README) before this ships.
 */
process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod';

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../models/User');
const User = require('../models/User');

const authRoutes = require('../routes/auth');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  return app;
}

// The login token now arrives as an HttpOnly Set-Cookie header instead of in
// the JSON body (see authController.js) - pull it back out for assertions.
function extractTokenCookie(res) {
  const setCookie = res.headers['set-cookie'] || [];
  const tokenCookie = setCookie.find((c) => c.startsWith('token='));
  if (!tokenCookie) return null;
  return tokenCookie.split(';')[0].split('=')[1];
}

describe('POST /api/auth/register', () => {
  const app = buildApp();

  beforeEach(() => {
    jest.clearAllMocks();
    User.hashPassword = jest.fn((plain) => bcrypt.hash(plain, 4));
  });

  it('rejects a missing username or password', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'bob' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects a short password', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'bob', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 6/);
  });

  it('rejects an invalid username (special characters)', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'bo b!', password: 'longenough' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/letters, numbers, underscore/);
  });

  it('rejects a duplicate username', async () => {
    User.findOne = jest.fn().mockResolvedValue({ _id: 'existing-id', username: 'bob' });
    const res = await request(app).post('/api/auth/register').send({ username: 'bob', password: 'longenough' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already taken/);
  });

  it('creates a new user and returns a valid, decodable token', async () => {
    User.findOne = jest.fn().mockResolvedValue(null);
    User.create = jest.fn().mockResolvedValue({ _id: 'new-id-123', username: 'newuser' });

    const res = await request(app).post('/api/auth/register').send({ username: 'newuser', password: 'longenough' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toEqual({ id: 'new-id-123', username: 'newuser' });
    expect(User.hashPassword).toHaveBeenCalledWith('longenough');

    const token = extractTokenCookie(res);
    expect(token).toBeTruthy();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe('new-id-123');
    expect(decoded.username).toBe('newuser');
  });
});

describe('POST /api/auth/login', () => {
  const app = buildApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an unknown username without leaking whether the user exists', async () => {
    User.findOne = jest.fn().mockResolvedValue(null);
    const res = await request(app).post('/api/auth/login').send({ username: 'ghost', password: 'whatever1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid username or password.');
  });

  it('rejects a wrong password with the same generic message as unknown username', async () => {
    const fakeUser = { _id: 'id-1', username: 'bob', comparePassword: jest.fn().mockResolvedValue(false) };
    User.findOne = jest.fn().mockResolvedValue(fakeUser);
    const res = await request(app).post('/api/auth/login').send({ username: 'bob', password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid username or password.');
  });

  it('logs in successfully with correct credentials', async () => {
    const fakeUser = { _id: 'id-1', username: 'bob', comparePassword: jest.fn().mockResolvedValue(true) };
    User.findOne = jest.fn().mockResolvedValue(fakeUser);

    const res = await request(app).post('/api/auth/login').send({ username: 'bob', password: 'correctpass' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toEqual({ id: 'id-1', username: 'bob' });
    const token = extractTokenCookie(res);
    expect(token).toBeTruthy();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe('id-1');
  });
});

describe('GET /api/auth/me', () => {
  const app = buildApp();

  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a garbage/expired token', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'token=not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('accepts a valid token and returns the decoded user', async () => {
    const token = jwt.sign({ id: 'id-1', username: 'bob' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app).get('/api/auth/me').set('Cookie', `token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: 'id-1', username: 'bob' });
  });
});
