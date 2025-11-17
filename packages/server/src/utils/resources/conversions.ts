/**
 * Resource limit conversion utilities
 *
 * Converts between user-friendly units (MB, decimal cores) and Docker API units (bytes, nanoseconds)
 */

/**
 * Convert megabytes to bytes
 * @param mb - Memory in MB as string (e.g., "512")
 * @returns Memory in bytes as string (e.g., "536870912")
 */
export const mbToBytes = (mb: string): string => {
	if (!mb || mb.trim() === "") {
		throw new Error("Memory value cannot be empty");
	}

	const mbNum = Number.parseFloat(mb);

	if (Number.isNaN(mbNum) || mbNum < 0) {
		throw new Error(`Invalid memory value: ${mb}`);
	}

	const bytes = mbNum * 1024 * 1024;
	return Math.floor(bytes).toString();
};

/**
 * Convert bytes to megabytes
 * @param bytes - Memory in bytes as string (e.g., "536870912")
 * @returns Memory in MB as string (e.g., "512")
 */
export const bytesToMb = (bytes: string): string => {
	if (!bytes || bytes.trim() === "") {
		throw new Error("Bytes value cannot be empty");
	}

	const bytesNum = Number.parseFloat(bytes);

	if (Number.isNaN(bytesNum) || bytesNum < 0) {
		throw new Error(`Invalid bytes value: ${bytes}`);
	}

	const mb = bytesNum / 1024 / 1024;
	return Math.floor(mb).toString();
};

/**
 * Convert CPU cores (decimal) to nanoseconds
 * @param cores - CPU cores as decimal string (e.g., "1.5")
 * @returns CPU in nanoseconds as string (e.g., "1500000000")
 */
export const coresToNanoseconds = (cores: string): string => {
	if (!cores || cores.trim() === "") {
		throw new Error("CPU cores value cannot be empty");
	}

	const coresNum = Number.parseFloat(cores);

	if (Number.isNaN(coresNum) || coresNum < 0) {
		throw new Error(`Invalid CPU cores value: ${cores}`);
	}

	const nanoseconds = coresNum * 1000000000;
	return Math.floor(nanoseconds).toString();
};

/**
 * Convert nanoseconds to CPU cores (decimal)
 * @param nanoseconds - CPU in nanoseconds as string (e.g., "1500000000")
 * @returns CPU cores as decimal string (e.g., "1.5")
 */
export const nanosecondsToCores = (nanoseconds: string): string => {
	if (!nanoseconds || nanoseconds.trim() === "") {
		throw new Error("Nanoseconds value cannot be empty");
	}

	const nsNum = Number.parseFloat(nanoseconds);

	if (Number.isNaN(nsNum) || nsNum < 0) {
		throw new Error(`Invalid nanoseconds value: ${nanoseconds}`);
	}

	const cores = nsNum / 1000000000;
	// Round to 2 decimal places for display
	return cores.toFixed(2);
};

/**
 * Convert bytes to Docker Compose memory format (e.g., "512M", "2G")
 * @param bytes - Memory in bytes as string
 * @returns Memory in compose format (e.g., "512M")
 */
export const bytesToComposeMemory = (bytes: string): string => {
	const mb = Number.parseFloat(bytesToMb(bytes));

	if (mb >= 1024) {
		const gb = mb / 1024;
		return `${gb.toFixed(1)}G`;
	}

	return `${Math.floor(mb)}M`;
};

/**
 * Convert nanoseconds to Docker Compose CPU format (decimal string)
 * @param nanoseconds - CPU in nanoseconds as string
 * @returns CPU in compose format (e.g., "1.5")
 */
export const nanosecondsToComposeCpu = (nanoseconds: string): string => {
	return nanosecondsToCores(nanoseconds);
};
