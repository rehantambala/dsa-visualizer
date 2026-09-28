/**
 * backend/src/__integration__/liveDb.integration.test.js
 *
 * Everything else in this test suite mocks the User/SimulationState models,
 * because this sandbox's network can't reach fastdl.mongodb.org to download a
 * mongodb-memory-server binary. This file is the real thing: it connects to
 * whatever MONGO_URI you give it and exercises the actual register -> login ->
 * save simulation -> read it back -> cross-user isolation flow against a real
 * database.
 *
 * FIXED: this used to send `Authorization: Bearer <res.body.token>`, which
 * stopped matching reality once auth moved to an HttpOnly cookie - the
 * register/login responses no longer include a `token` field at all, and
 * requireAuth/optionalAuth only ever read `req.cookies.token` (see
 * middleware/auth.js), never an Authorization header. That made every "logged
 * in" request in this file silently fall through to guest behavior. It was
 * never caught because this suite is skipped by default and CI doesn't run
 * it. Fixed by using supertest's `agent()`, which keeps a real cookie jar
 * across requests the same way a browser does, and by adding cookie-parser to
 * this file's own minimal Express app (it was missing here too - without it
 * req.cookies is always undefined regardless of what the client sends).
 *
 * Skipped by default (and by CI) so a normal `npm test` never needs a live DB.
 * Run it yourself before shipping:
 *
 *   RUN_INTEGRATION=true MONGO_URI="mongodb+srv://...your-atlas-uri..." \
 *     JWT_SECRET=any-string npx jest liveDb.integration --runInBand
 *
 * Uses disposable "itest_"-prefixed usernames and cleans up every document it
 * creates, but point this at a scratch/dev database, not production data,
 * just in case.
 */
const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');

const RUN = process.env.RUN_INTEGRATION === 'true';
const describeIfLive = RUN ? describe : describe.skip;

describeIfLive('live MongoDB integration', () => {
  let app;
  let User;
  let SimulationState;
  const testUsername = `itest_${Date.now()}`;
  const secondUsername = `${testUsername}_2`;

  beforeAll(async () => {
    if (!process.env.MONGO_URI) {
      throw new Error('RUN_INTEGRATION=true requires MONGO_URI to be set to a real database.');
    }
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });

    User = require('../models/User');
    SimulationState = require('../models/SimulationState');

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', require('../routes/auth'));
    app.use('/api/simulations', require('../routes/simulations'));

    // Each user gets its own supertest agent, which keeps its own cookie jar -
    // exactly like two different people in two different browsers. Must be
    // created here (after `app` exists), not at module scope.
    agent = request.agent(app);
    secondAgent = request.agent(app);
  }, 15000);

  afterAll(async () => {
    // If beforeAll failed before connecting (e.g. bad MONGO_URI), User/SimulationState
    // were never assigned - guard so that failure isn't masked by a second, confusing
    // "Cannot read properties of undefined" crash here. Scoped to exactly the
    // sessionIds this suite created (not a broad "every LinkedList save" regex) so
    // running this against a shared dev database never touches anyone else's data.
    if (User) await User.deleteMany({ username: { $regex: `^${testUsername}` } });
    if (SimulationState) {
      const ids = [userId, secondUserId].filter(Boolean).map((id) => `user:${id}`);
      if (ids.length > 0) {
        await SimulationState.deleteMany({ sessionId: { $in: ids }, dataStructure: 'LinkedList' });
      }
    }
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });

  let agent;
  let secondAgent;
  let userId;
  let secondUserId;

  it('registers a real user in the real database', async () => {
    const res = await agent.post('/api/auth/register').send({ username: testUsername, password: 'integration-test-pw' });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe(testUsername);
    userId = res.body.user.id;

    // The token must arrive as an HttpOnly cookie, never in the JSON body -
    // a body token would mean it's readable by JS (and by anyone logging
    // the response), defeating the point of HttpOnly.
    expect(res.body.token).toBeUndefined();
    const setCookie = res.headers['set-cookie'] || [];
    expect(setCookie.some((c) => c.startsWith('token=') && /HttpOnly/i.test(c))).toBe(true);

    const stored = await User.findOne({ username: testUsername });
    expect(stored).not.toBeNull();
    expect(stored.passwordHash).not.toBe('integration-test-pw'); // must be hashed, not plaintext
  });

  it('rejects a duplicate registration against the real unique index', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: testUsername, password: 'another-password' });
    expect(res.status).toBe(409);
  });

  it('logs in with the real stored password hash', async () => {
    const res = await agent.post('/api/auth/login').send({ username: testUsername, password: 'integration-test-pw' });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(userId);
  });

  it('saves a LinkedList simulation keyed to the real user id, not a shared string', async () => {
    // No Authorization header - the agent's cookie jar sends the session
    // cookie automatically, exactly like a real browser would.
    const res = await agent
      .post('/api/simulations/save')
      .send({ dataStructure: 'LinkedList', currentState: [{ value: 1 }, { value: 2 }], history: [] });

    expect(res.status).toBe(200);
    expect(res.body.data.sessionId).toBe(`user:${userId}`);

    const stored = await SimulationState.findOne({ sessionId: `user:${userId}`, dataStructure: 'LinkedList' });
    expect(stored).not.toBeNull();
    expect(stored.currentState).toHaveLength(2);
  });

  it('reads the saved simulation back through the authenticated route', async () => {
    const res = await agent.get('/api/simulations/whatever-client-sends/LinkedList');

    expect(res.status).toBe(200);
    expect(res.body.data.currentState).toHaveLength(2);
  });

  it('a second, unauthenticated request cannot read the first user\'s save via a guessed sessionId', async () => {
    const res = await request(app).get(`/api/simulations/user:${userId}/LinkedList`);
    // No cookie at all -> resolveSessionId falls back to the literal path param,
    // which is a DIFFERENT sessionId string than the stored "user:<id>" unless
    // someone guesses it exactly - this just confirms the route doesn't grant
    // special access without a valid session.
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      // If this ever returns 200 for an unauthenticated guess, that's a real
      // security regression worth investigating immediately.
      throw new Error('SECURITY: unauthenticated request could read another user\'s saved state by guessing the sessionId.');
    }
  });

  it('a second, DIFFERENT logged-in user cannot read the first user\'s save even guessing the exact path', async () => {
    const res = await secondAgent.post('/api/auth/register').send({ username: secondUsername, password: 'integration-test-pw-2' });
    expect(res.status).toBe(201);
    secondUserId = res.body.user.id;
    expect(secondUserId).not.toBe(userId);

    // Authenticated as user 2, but asking for the exact path user 1's data is
    // stored under. optionalAuth ignores the client-supplied path segment for
    // any logged-in caller and substitutes THEIR OWN account id instead (see
    // resolveSessionId in simulationController.js) - so user 2 can only ever
    // see user 2's own (nonexistent) save, never user 1's, no matter what
    // sessionId they put in the URL.
    const readAttempt = await secondAgent.get(`/api/simulations/user:${userId}/LinkedList`);
    expect(readAttempt.status).toBe(404);
  });
});
