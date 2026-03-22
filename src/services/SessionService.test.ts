import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockGet = vi.fn();
const mockInsertValues = vi.fn();
const mockDeleteWhere = vi.fn();
const mockSelectFrom = vi.fn();

vi.mock('astro:db', () => {
  const eq = vi.fn((col: unknown, val: unknown) => ({ col, val }));
  return {
    eq,
    Sessions: { token: 'Sessions.token' },
    db: {
      insert: vi.fn(() => ({ values: mockInsertValues })),
      delete: vi.fn(() => ({ where: mockDeleteWhere })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ get: mockGet })),
          // Direct iteration for purgeExpiredSessions (selectAll)
        })),
      })),
    },
  };
});

// Re-mock select to support both .get() chain and direct array return
const { db } = await import('astro:db');

describe('SessionService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createSession', () => {
    it('inserts a session row and returns a UUID token', async () => {
      const { createSession } = await import('./SessionService.js');
      mockInsertValues.mockResolvedValue(undefined);

      const token = await createSession();

      expect(token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(db.insert).toHaveBeenCalled();
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          token,
          createdAt: expect.any(Date),
          expiresAt: expect.any(Date),
        }),
      );
    });

    it('sets expiresAt to 24 hours from now', async () => {
      const { createSession } = await import('./SessionService.js');
      mockInsertValues.mockResolvedValue(undefined);

      const now = new Date('2026-03-21T12:00:00Z');
      vi.setSystemTime(now);

      await createSession();

      const call = mockInsertValues.mock.calls[0]?.[0];
      const expiresAt = new Date(call.expiresAt);
      const expected = new Date('2026-03-22T12:00:00Z');
      expect(expiresAt.getTime()).toBe(expected.getTime());
    });
  });

  describe('validateSession', () => {
    it('returns true for a valid unexpired session', async () => {
      const { validateSession } = await import('./SessionService.js');
      const future = new Date(Date.now() + 60 * 60 * 1000);
      mockGet.mockResolvedValue({ token: 'abc', expiresAt: future });

      const result = await validateSession('abc');
      expect(result).toBe(true);
    });

    it('returns false for an expired session', async () => {
      const { validateSession } = await import('./SessionService.js');
      const past = new Date(Date.now() - 1000);
      mockGet.mockResolvedValue({ token: 'abc', expiresAt: past });

      const result = await validateSession('abc');
      expect(result).toBe(false);
    });

    it('returns false when session does not exist', async () => {
      const { validateSession } = await import('./SessionService.js');
      mockGet.mockResolvedValue(undefined);

      const result = await validateSession('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('deleteSession', () => {
    it('deletes the session row by token', async () => {
      const { deleteSession } = await import('./SessionService.js');
      mockDeleteWhere.mockResolvedValue(undefined);

      await deleteSession('abc');

      expect(db.delete).toHaveBeenCalled();
      expect(mockDeleteWhere).toHaveBeenCalled();
    });
  });

  describe('purgeExpiredSessions', () => {
    it('deletes expired sessions and keeps valid ones', async () => {
      const { purgeExpiredSessions } = await import('./SessionService.js');

      const now = new Date();
      const expired = { token: 'old', expiresAt: new Date(now.getTime() - 1000) };
      const valid = { token: 'fresh', expiresAt: new Date(now.getTime() + 60000) };

      // Override select().from() to return array directly
      (db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([expired, valid]),
      });
      mockDeleteWhere.mockResolvedValue(undefined);

      await purgeExpiredSessions();

      // Should only delete the expired one
      expect(db.delete).toHaveBeenCalledTimes(1);
    });
  });
});
