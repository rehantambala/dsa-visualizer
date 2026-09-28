/**
 * backend/src/controllers/simulationController.test.js
 *
 * Regression test for the bug where every unauthenticated visitor's LinkedList
 * save landed on the literal string "guest-session" - one shared Mongo document
 * for the entire site. resolveSessionId() must key logged-in users to their own
 * account and give each guest their own supplied (per-browser) id, never a
 * hardcoded constant.
 */
const { resolveSessionId } = require('./simulationController');

describe('resolveSessionId', () => {
  it('keys a logged-in user to their own account, ignoring whatever sessionId the client sent', () => {
    const req = { user: { id: 'abc123', username: 'bob' } };
    expect(resolveSessionId(req, 'anything-the-client-sent')).toBe('user:abc123');
  });

  it('uses the caller-supplied per-browser session id for guests', () => {
    const req = {};
    expect(resolveSessionId(req, 'session-171234-xyz')).toBe('session-171234-xyz');
  });

  it('never falls back to a shared "guest-session" constant', () => {
    const req = {};
    expect(resolveSessionId(req, 'session-A')).not.toBe(resolveSessionId({}, 'session-B'));
  });

  it('falls back to a labeled anonymous id only when no session id was supplied at all', () => {
    const req = {};
    expect(resolveSessionId(req, undefined)).toBe('anonymous-guest');
  });

  it('two different logged-in users never collide even with the same guest sessionId', () => {
    const reqA = { user: { id: 'user-A' } };
    const reqB = { user: { id: 'user-B' } };
    const a = resolveSessionId(reqA, 'same-guest-session-string');
    const b = resolveSessionId(reqB, 'same-guest-session-string');
    expect(a).not.toBe(b);
  });

  // SECURITY REGRESSION: an unauthenticated caller must never be able to read
  // another user's saved state by passing "user:<their real account id>" as
  // the sessionId - that id isn't secret (register/login return it as
  // user.id), so trusting it verbatim from a guest would let anyone fetch any
  // other user's save without ever logging in.
  it('never lets an unauthenticated guest resolve into the "user:" namespace', () => {
    const req = {};
    expect(resolveSessionId(req, 'user:some-real-account-id')).not.toBe('user:some-real-account-id');
    expect(resolveSessionId(req, 'user:some-real-account-id')).toBe('anonymous-guest');
  });
});
