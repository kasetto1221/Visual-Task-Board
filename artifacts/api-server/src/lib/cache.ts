import Redis from "ioredis";
import { logger } from "./logger";

const REDIS_URL = process.env["REDIS_URL"];

let client: Redis | null = null;

if (REDIS_URL) {
  try {
    client = new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      enableOfflineQueue: false,
    });

    client.on("connect", () => logger.info("Redis connected"));
    client.on("error", (err) => logger.warn({ err }, "Redis error — cache disabled"));

    await client.connect().catch((err) => {
      logger.warn({ err }, "Redis initial connect failed — cache disabled");
      client = null;
    });
  } catch (err) {
    logger.warn({ err }, "Redis setup failed — running without cache");
    client = null;
  }
} else {
  logger.info("REDIS_URL not set — running without cache");
}

export const STATS_CACHE_KEYS = {
  summary: "stats:summary",
  workload: "stats:workload",
  velocity: (weeks: number) => `stats:velocity:${weeks}`,
  upcoming: (limit: number) => `stats:upcoming:${limit}`,
} as const;

export const TTL = {
  short: 60,    // summary, workload, upcoming
  medium: 300,  // velocity
} as const;

export async function cacheGet(key: string): Promise<unknown | null> {
  if (!client) return null;
  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!client) return;
  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // silent — cache miss on next request is fine
  }
}

export async function cacheDeleteStats(): Promise<void> {
  if (!client) return;
  try {
    const keys = await client.keys("stats:*");
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch {
    // silent
  }
}
