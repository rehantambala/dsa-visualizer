import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './api.js';

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('api request errors', () => {
  it('401 → ApiError kind "unauthorized" with the server message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { message: 'Invalid username or password.' })));
    const err = await api.login('ada', 'wrong-pw').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ kind: 'unauthorized', status: 401, message: 'Invalid username or password.' });
  });

  it('other non-2xx → ApiError kind "server" with status and server message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(409, { message: 'That username is already taken.' })));
    const err = await api.register('ada', 'secret1').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ kind: 'server', status: 409, message: 'That username is already taken.' });
  });

  it('fetch throwing (backend down) → ApiError kind "network", status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = await api.login('ada', 'secret1').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ kind: 'network', status: 0 });
  });

  it('success still resolves to the JSON body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { user: { username: 'ada' } })));
    await expect(api.login('ada', 'secret1')).resolves.toEqual({ user: { username: 'ada' } });
  });
});
