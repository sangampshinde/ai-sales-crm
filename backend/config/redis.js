import Redis from "ioredis";

let redis = null;
let isConnected = false;

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

try {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    retryStrategy(times) {
      if (times > 3) {
        // Stop reconnect storm if Redis is not running
        return null;
      }
      return Math.min(times * 200, 1000);
    },
    reconnectOnError(err) {
      const targetError = "READONLY";
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
    lazyConnect: true,
  });

  redis.on("connect", () => {
    isConnected = true;
    console.log("⚡ Redis connected successfully");
  });

  redis.on("error", (err) => {
    isConnected = false;
    // Don't flood the terminal if Redis is optional in development/production
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️ Redis cache unavailable (continuing without cache):", err.message);
    }
  });

  redis.on("close", () => {
    isConnected = false;
  });

  // Attempt initial non-blocking connection
  redis.connect().catch((err) => {
    isConnected = false;
    console.warn("ℹ️ Redis not running locally, continuing with database-only mode.");
  });
} catch (err) {
  console.warn("Redis initialization skipped:", err.message);
}

export const isRedisReady = () => isConnected;

/**
 * Get cached JSON data
 * @param {string} key 
 * @returns {Promise<any|null>}
 */
export const getCache = async (key) => {
  if (!isConnected || !redis) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn(`Redis get error for ${key}:`, err.message);
    return null;
  }
};

/**
 * Store JSON data in cache with TTL
 * @param {string} key 
 * @param {any} data 
 * @param {number} ttlSeconds 
 */
export const setCache = async (key, data, ttlSeconds = 300) => {
  if (!isConnected || !redis) return false;
  try {
    await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
    return true;
  } catch (err) {
    console.warn(`Redis set error for ${key}:`, err.message);
    return false;
  }
};

/**
 * Delete a specific key
 * @param {string} key 
 */
export const deleteCache = async (key) => {
  if (!isConnected || !redis) return false;
  try {
    await redis.del(key);
    return true;
  } catch (err) {
    console.warn(`Redis delete error for ${key}:`, err.message);
    return false;
  }
};

/**
 * Invalidate all keys matching a pattern (e.g. `crm:user:123:*`)
 * @param {string} pattern 
 */
export const invalidatePattern = async (pattern) => {
  if (!isConnected || !redis) return false;
  try {
    const keys = await redis.keys(pattern);
    if (keys && keys.length > 0) {
      await redis.del(...keys);
    }
    return true;
  } catch (err) {
    console.warn(`Redis invalidate error for pattern ${pattern}:`, err.message);
    return false;
  }
};

/**
 * Convenience helper to invalidate all caches for a user (analytics, ai insights)
 * @param {number} userId 
 */
export const invalidateUserCache = async (userId) => {
  if (!userId) return;
  await Promise.all([
    deleteCache(`crm:analytics:overview:${userId}`),
    deleteCache(`crm:ai:insights:${userId}`),
    invalidatePattern(`crm:ai:lead:${userId}:*`),
  ]);
};

export { redis };
