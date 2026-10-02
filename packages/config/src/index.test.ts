import { describe, expect, it } from 'vitest';
import { parseServerEnvironment } from './index.js';

describe('server environment', () => {
  it('accepts the development configuration', () => {
    expect(
      parseServerEnvironment({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/inventariosaas',
        API_PORT: '3000',
        NODE_ENV: 'development',
      }).API_PORT,
    ).toBe(3000);
  });

  it('rejects an invalid database URL and port', () => {
    expect(() =>
      parseServerEnvironment({ DATABASE_URL: 'sqlite://local', API_PORT: '0' }),
    ).toThrow();
  });
});
