import { describe, expect, it } from 'vitest';
import { createBoardToken, verifyBoardToken } from '../src/lib/board-token';

const secret = 'test-secret-that-is-long-enough';
const now = new Date('2026-06-03T12:00:00.000Z');

function futureExp(): number {
  return Math.floor(now.getTime() / 1000) + 60;
}

describe('board tokens', () => {
  it('verifies a valid scoped token', async () => {
    const token = await createBoardToken(
      {
        boardId: 'board_mean_weasel_demo',
        externalUserId: 'user_1',
        displayName: 'Ada',
        exp: futureExp(),
        aud: 'bugdrop-board',
        iss: 'dummy-host',
      },
      secret
    );

    await expect(
      verifyBoardToken(token, {
        secret,
        expectedBoardId: 'board_mean_weasel_demo',
        expectedAudience: 'bugdrop-board',
        expectedIssuer: 'dummy-host',
        now,
      })
    ).resolves.toMatchObject({ externalUserId: 'user_1', displayName: 'Ada' });
  });

  it('rejects malformed tokens', async () => {
    await expect(
      verifyBoardToken('not-a-token', {
        secret,
        expectedBoardId: 'board_mean_weasel_demo',
        now,
      })
    ).rejects.toThrow('format');
  });

  it('rejects missing tokens', async () => {
    await expect(
      verifyBoardToken('', {
        secret,
        expectedBoardId: 'board_mean_weasel_demo',
        now,
      })
    ).rejects.toThrow('format');
  });

  it('rejects invalid payloads', async () => {
    await expect(
      verifyBoardToken('bad.payload', {
        secret,
        expectedBoardId: 'board_mean_weasel_demo',
        now,
      })
    ).rejects.toThrow('signature');
  });

  it('rejects expired tokens', async () => {
    const token = await createBoardToken(
      {
        boardId: 'board_mean_weasel_demo',
        externalUserId: 'user_1',
        exp: Math.floor(now.getTime() / 1000) - 1,
      },
      secret
    );

    await expect(
      verifyBoardToken(token, {
        secret,
        expectedBoardId: 'board_mean_weasel_demo',
        now,
      })
    ).rejects.toThrow('expired');
  });

  it('rejects wrong board scope', async () => {
    const token = await createBoardToken(
      {
        boardId: 'board_mean_weasel_demo',
        externalUserId: 'user_1',
        exp: futureExp(),
      },
      secret
    );

    await expect(
      verifyBoardToken(token, {
        secret,
        expectedBoardId: 'board_other_repo',
        now,
      })
    ).rejects.toThrow('scope');
  });

  it('rejects wrong audience', async () => {
    const token = await createBoardToken(
      {
        boardId: 'board_mean_weasel_demo',
        externalUserId: 'user_1',
        exp: futureExp(),
        aud: 'other',
      },
      secret
    );

    await expect(
      verifyBoardToken(token, {
        secret,
        expectedBoardId: 'board_mean_weasel_demo',
        expectedAudience: 'bugdrop-board',
        now,
      })
    ).rejects.toThrow('audience');
  });

  it('rejects wrong issuer', async () => {
    const token = await createBoardToken(
      {
        boardId: 'board_mean_weasel_demo',
        externalUserId: 'user_1',
        exp: futureExp(),
        iss: 'other-host',
      },
      secret
    );

    await expect(
      verifyBoardToken(token, {
        secret,
        expectedBoardId: 'board_mean_weasel_demo',
        expectedIssuer: 'dummy-host',
        now,
      })
    ).rejects.toThrow('issuer');
  });

  it('rejects tampering', async () => {
    const token = await createBoardToken(
      {
        boardId: 'board_mean_weasel_demo',
        externalUserId: 'user_1',
        exp: futureExp(),
      },
      secret
    );

    await expect(
      verifyBoardToken(`${token}tampered`, {
        secret,
        expectedBoardId: 'board_mean_weasel_demo',
        now,
      })
    ).rejects.toThrow('signature');
  });

  it('rejects missing external user ids', async () => {
    const token = await createBoardToken(
      {
        boardId: 'board_mean_weasel_demo',
        externalUserId: '',
        exp: futureExp(),
      },
      secret
    );

    await expect(
      verifyBoardToken(token, {
        secret,
        expectedBoardId: 'board_mean_weasel_demo',
        now,
      })
    ).rejects.toThrow('external user id');
  });

  it('rejects tokens signed with another secret', async () => {
    const token = await createBoardToken(
      {
        boardId: 'board_mean_weasel_demo',
        externalUserId: 'user_1',
        exp: futureExp(),
      },
      'different-secret'
    );

    await expect(
      verifyBoardToken(token, {
        secret,
        expectedBoardId: 'board_mean_weasel_demo',
        now,
      })
    ).rejects.toThrow('signature');
  });
});
