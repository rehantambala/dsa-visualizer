/**
 * backend/src/__integration__/liveDb.integration.test.js
 *
 * Everything else in this test suite mocks the User/SimulationState models,
 * because this sandbox's network can't reach fastdl.mongodb.org to download a
 * mongodb-memory-server binary. This file is the real thing: it connects to
 * whatever MONGO_URI you give it and exercises the actual register -> login ->
 * save simulation -> read it back flow against a real database.
 *
 * Skipped by default (and by CI) so a normal `npm test` never needs a live DB.
 * Run it yourself before shipping:
 *
 *   RUN_INTEGRATION=true MONGO_URI="mongodb+srv://...your-atlas-uri..." \
 *     JWT_SECRET=any-string npx jest liveDb.integration --runInBand
 *
 * Uses a disposable "itest_" username and cleans up every document it creates,
 * but point this at a scratch/dev database, not production data, just in case.
 */
const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');

const RUN = process.env.RUN_INTEGRATION === 'true';
const describeIfLive = RUN ? describe : describe.skip;

describeIfLive('live MongoDB integration', () => {
  let app;
  let User;
  let SimulationState;
  const testUsername = `itest_${Date.now()}`;

  beforeAll(async () => {
    if (!process.env.MONGO_URI) {
      throw new Error('RUN_INTEGRATION=true requires MONGO_URI to be set to a real database.');
    }
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });

    User = require('../models/User');
    SimulationState = require('../models/SimulationState');

    app = express();
    app.use(express.json());
    app.use('/api/auth', require('../routes/auth'));
    app.use('/api/simulations', require('../routes/simulations'));
  }, 15000);

  afterAll(async () => {
    // If beforeAll failed before connecting (e.g. bad MONGO_URI), User/SimulationState
    // were never assigned - guard so that failure isn't masked by a second, confusing
    // "Cannot read properties of undefined" crash here.
    if (User) await User.deleteMany({ username: testUsername });
    if (SimulationState) {
      await SimulationState.deleteMany({ sessionId: { $regex: /^user:/ } }).where('dataStructure').equals('LinkedList');
    }
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });

  let token;
  let userId;

  it('registers a real user in the real database', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: testUsername, password: 'integration-test-pw' });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe(testUsername);
    token = res.body.token;
    userId = res.body.user.id;

    const stored = await User.findOne({ username: testUsername });
    expect(stored).not.toBeNull();
    expect(stored.passwordHash).not.toBe('integration-test-pw'); // must be hashed, not plaintext
  });

  it('rejects a duplicate registration against the real unique index', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: testUsername, password: 'another-password' });
    expect(res.status).toBe(409);
  });

  it('logs in with the real stored password hash', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: testUsername, password: 'integration-test-pw' });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(userId);
  });

  it('saves a LinkedList simulation keyed to the real user id, not a shared string', async () => {
    const res = await request(app)
      .post('/api/simulations/save')
      .set('Authorization', `Bearer ${token}`)
      .send({ dataStructure: 'LinkedList', currentState: [{ value: 1 }, { value: 2 }], history: [] });

    expect(res.status).toBe(200);
    expect(res.body.data.sessionId).toBe(`user:${userId}`);

    const stored = await SimulationState.findOne({ sessionId: `user:${userId}`, dataStructure: 'LinkedList' });
    expect(stored).not.toBeNull();
    expect(stored.currentState).toHaveLength(2);
  });

  it('reads the saved simulation back through the authenticated route', async () => {
    const res = await request(app)
      .get('/api/simulations/whatever-client-sends/LinkedList')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.currentState).toHaveLength(2);
  });

  it('a second, unauthenticated request cannot read the first user\'s save via a guessed sessionId', async () => {
    const res = await request(app).get(`/api/simulations/user:${userId}/LinkedList`);
    // No auth header -> resolveSessionId falls back to the literal path param,
    // which is a DIFFERENT sessionId string than the stored "user:<id>" unless
    // someone guesses it exactly - this just confirms the route doesn't grant
    // special access without a valid token.
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      // If this ever returns 200 for an unauthenticated guess, that's a real
      // security regression worth investigating immediately.
      throw new Error('SECURITY: unauthenticated request could read another user\'s saved state by guessing the sessionId.');
    }
  });
});
