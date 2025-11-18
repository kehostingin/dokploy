import { exec } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface RcloneExecutorOptions {
	configPath?: string;
	verbose?: boolean;
	dryRun?: boolean;
}

export interface RcloneCommandResult {
	success: boolean;
	stdout: string;
	stderr: string;
	error?: Error;
}

export interface RcloneCopyOptions {
	remoteName: string;
	remotePath: string;
	localPath: string;
	direction: "upload" | "download";
}

export interface RcloneListOptions {
	remoteName: string;
	remotePath: string;
}

/**
 * Execute an rclone command
 */
export async function executeRcloneCommand(
	command: string,
	options: RcloneExecutorOptions = {},
): Promise<RcloneCommandResult> {
	const { configPath, verbose = false, dryRun = false } = options;

	let fullCommand = `rclone ${command}`;

	if (configPath) {
		fullCommand += ` --config ${configPath}`;
	}

	if (verbose) {
		fullCommand += " -v";
	}

	if (dryRun) {
		fullCommand += " --dry-run";
	}

	try {
		const { stdout, stderr } = await execAsync(fullCommand, {
			maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
		});

		return {
			success: true,
			stdout,
			stderr,
		};
	} catch (error) {
		return {
			success: false,
			stdout: error instanceof Error && "stdout" in error ? String(error.stdout) : "",
			stderr: error instanceof Error && "stderr" in error ? String(error.stderr) : "",
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
}

/**
 * Copy files between local and remote
 */
export async function rcloneCopy(
	options: RcloneCopyOptions,
	executorOptions: RcloneExecutorOptions = {},
): Promise<RcloneCommandResult> {
	const { remoteName, remotePath, localPath, direction } = options;

	const remote = `${remoteName}:${remotePath}`;
	const source = direction === "upload" ? localPath : remote;
	const destination = direction === "upload" ? remote : localPath;

	const command = `copy "${source}" "${destination}" --progress`;

	return executeRcloneCommand(command, executorOptions);
}

/**
 * List files in a remote
 */
export async function rcloneList(
	options: RcloneListOptions,
	executorOptions: RcloneExecutorOptions = {},
): Promise<RcloneCommandResult> {
	const { remoteName, remotePath } = options;

	const remote = `${remoteName}:${remotePath}`;
	const command = `lsjson "${remote}"`;

	return executeRcloneCommand(command, executorOptions);
}

/**
 * Test remote connection
 */
export async function rcloneTest(
	remoteName: string,
	executorOptions: RcloneExecutorOptions = {},
): Promise<RcloneCommandResult> {
	const command = `lsd "${remoteName}:" --max-depth 1`;

	return executeRcloneCommand(command, executorOptions);
}

/**
 * Delete a file or directory on a remote
 */
export async function rcloneDelete(
	remoteName: string,
	remotePath: string,
	executorOptions: RcloneExecutorOptions = {},
): Promise<RcloneCommandResult> {
	const remote = `${remoteName}:${remotePath}`;
	const command = `delete "${remote}"`;

	return executeRcloneCommand(command, executorOptions);
}

/**
 * Get rclone version
 */
export async function getRcloneVersion(): Promise<string> {
	const result = await executeRcloneCommand("version");

	if (result.success) {
		const match = result.stdout.match(/rclone v([\d.]+)/);
		return match ? match[1] : "unknown";
	}

	return "unknown";
}

/**
 * Create a temporary rclone config file
 */
export async function createTempRcloneConfig(
	configContent: string,
): Promise<string> {
	const tmpDir = "/tmp/rclone-configs";
	await mkdir(tmpDir, { recursive: true });

	const configPath = join(tmpDir, `rclone-${Date.now()}.conf`);
	await writeFile(configPath, configContent, "utf-8");

	return configPath;
}

/**
 * Parse rclone JSON output
 */
export function parseRcloneJson<T = unknown>(stdout: string): T[] {
	try {
		return JSON.parse(stdout) as T[];
	} catch {
		return [];
	}
}
