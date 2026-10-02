import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, changePassword, getApiHealth } from './index.js';

afterEach(() => vi.unstubAllGlobals());

describe('ApiError', () => {
  it.each([400, 401, 403, 404, 409, 422, 500])(
    'preserves HTTP status %i',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({
                statusCode: status,
                message: 'Request rejected',
              }),
              { status, headers: { 'Content-Type': 'application/json' } },
            ),
          ),
      );
      await expect(getApiHealth()).rejects.toMatchObject({
        name: 'ApiError',
        status,
        message:
          status >= 500
            ? 'The server could not complete the request'
            : 'Request rejected',
      });
    },
  );

  it('marks network failures separately from HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(getApiHealth()).rejects.toBeInstanceOf(ApiError);
    await expect(getApiHealth()).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('publishes the typed password change client and handles 204', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      changePassword({
        currentPassword: 'old-password',
        newPassword: 'new-password',
      }),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/change-password',
      expect.objectContaining({ method: 'POST', credentials: 'same-origin' }),
    );
  });
});
