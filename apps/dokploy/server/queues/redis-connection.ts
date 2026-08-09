import type { ConnectionOptions } from "bullmq";

export const redisConfig: ConnectionOptions = {
	host:
		process.env.NODE_ENV === "production"
			? process.env.REDIS_HOST || "dokploy-redis"
			: "127.0.0.1",
	port:
		process.env.NODE_ENV === "production"
			? 6379
			: Number.parseInt(process.env.DOKPLOY_REDIS_PORT ?? "6379", 10),
};
