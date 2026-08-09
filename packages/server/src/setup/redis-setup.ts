import type { CreateServiceOptions } from "dockerode";
import { docker } from "../constants";
import { pullImage } from "../utils/docker/utils";

export const initializeRedis = async () => {
	const imageName = "redis:7";
	const containerName = "dokploy-redis";
	const publishedPort = Number.parseInt(
		process.env.DOKPLOY_REDIS_PORT ?? "6379",
		10,
	);
	if (
		!Number.isInteger(publishedPort) ||
		publishedPort < 1 ||
		publishedPort > 65535
	) {
		throw new Error("DOKPLOY_REDIS_PORT must be a valid TCP port");
	}

	const settings: CreateServiceOptions = {
		Name: containerName,
		TaskTemplate: {
			ContainerSpec: {
				Image: imageName,
				Mounts: [
					{
						Type: "volume",
						Source: "dokploy-redis",
						Target: "/data",
					},
				],
			},
			Networks: [{ Target: "dokploy-network" }],
			Placement: {
				Constraints: ["node.role==manager"],
			},
		},
		Mode: {
			Replicated: {
				Replicas: 1,
			},
		},
		...(process.env.NODE_ENV === "development" && {
			EndpointSpec: {
				Ports: [
					{
						TargetPort: 6379,
						PublishedPort: publishedPort,
						Protocol: "tcp",
						PublishMode: "host",
					},
				],
			},
		}),
	};
	try {
		await pullImage(imageName);

		const service = docker.getService(containerName);
		const inspect = await service.inspect();
		await service.update({
			version: Number.parseInt(inspect.Version.Index),
			...settings,
		});
		console.log("Redis Started ✅");
	} catch (_) {
		try {
			await docker.createService(settings);
		} catch (error: any) {
			if (error?.statusCode !== 409) {
				throw error;
			}
			console.log("Redis service already exists, continuing...");
		}
		console.log("Redis Not Found: Starting ✅");
	}
};
