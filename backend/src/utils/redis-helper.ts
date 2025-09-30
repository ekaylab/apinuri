import { Redis } from 'ioredis';

/**
 * SCAN 명령어를 사용하여 안전하게 키를 검색하고 삭제합니다.
 */
export async function scanAndDeleteKeys(redis: Redis, pattern: string, batchSize = 100): Promise<number> {
  let cursor = '0';
  let deletedCount = 0;

  do {
    // SCAN으로 키를 안전하게 가져옴
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', batchSize.toString());

    cursor = nextCursor;

    // 키가 있으면 삭제
    if (keys.length > 0) {
      await redis.unlink(...keys);
      deletedCount += keys.length;
    }
  } while (cursor !== '0');

  return deletedCount;
}
