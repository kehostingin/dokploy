import { describe, expect, it } from "vitest";
import {
	bytesToComposeMemory,
	bytesToMb,
	coresToNanoseconds,
	mbToBytes,
	nanosecondsToCores,
	nanosecondsToComposeCpu,
} from "@dokploy/server/utils/resources/conversions";

describe("Resource Conversion Utilities", () => {
	describe("mbToBytes", () => {
		it("should convert MB to bytes correctly", () => {
			expect(mbToBytes("512")).toBe("536870912");
			expect(mbToBytes("1024")).toBe("1073741824");
			expect(mbToBytes("256")).toBe("268435456");
		});

		it("should handle decimal MB values", () => {
			expect(mbToBytes("512.5")).toBe("537395200");
		});

		it("should handle zero", () => {
			expect(mbToBytes("0")).toBe("0");
		});

		it("should throw error for empty string", () => {
			expect(() => mbToBytes("")).toThrow("Memory value cannot be empty");
		});

		it("should throw error for invalid values", () => {
			expect(() => mbToBytes("invalid")).toThrow("Invalid memory value");
			expect(() => mbToBytes("-100")).toThrow("Invalid memory value");
		});
	});

	describe("bytesToMb", () => {
		it("should convert bytes to MB correctly", () => {
			expect(bytesToMb("536870912")).toBe("512");
			expect(bytesToMb("1073741824")).toBe("1024");
			expect(bytesToMb("268435456")).toBe("256");
		});

		it("should floor decimal values", () => {
			expect(bytesToMb("537395200")).toBe("512"); // 512.5 MB floored
		});

		it("should handle zero", () => {
			expect(bytesToMb("0")).toBe("0");
		});

		it("should throw error for empty string", () => {
			expect(() => bytesToMb("")).toThrow("Bytes value cannot be empty");
		});

		it("should throw error for invalid values", () => {
			expect(() => bytesToMb("invalid")).toThrow("Invalid bytes value");
			expect(() => bytesToMb("-100")).toThrow("Invalid bytes value");
		});
	});

	describe("coresToNanoseconds", () => {
		it("should convert CPU cores to nanoseconds correctly", () => {
			expect(coresToNanoseconds("1")).toBe("1000000000");
			expect(coresToNanoseconds("0.5")).toBe("500000000");
			expect(coresToNanoseconds("2.0")).toBe("2000000000");
			expect(coresToNanoseconds("1.5")).toBe("1500000000");
		});

		it("should handle very small values", () => {
			expect(coresToNanoseconds("0.1")).toBe("100000000");
			expect(coresToNanoseconds("0.25")).toBe("250000000");
		});

		it("should handle zero", () => {
			expect(coresToNanoseconds("0")).toBe("0");
		});

		it("should throw error for empty string", () => {
			expect(() => coresToNanoseconds("")).toThrow(
				"CPU cores value cannot be empty",
			);
		});

		it("should throw error for invalid values", () => {
			expect(() => coresToNanoseconds("invalid")).toThrow(
				"Invalid CPU cores value",
			);
			expect(() => coresToNanoseconds("-1")).toThrow(
				"Invalid CPU cores value",
			);
		});
	});

	describe("nanosecondsToCores", () => {
		it("should convert nanoseconds to CPU cores correctly", () => {
			expect(nanosecondsToCores("1000000000")).toBe("1.00");
			expect(nanosecondsToCores("500000000")).toBe("0.50");
			expect(nanosecondsToCores("2000000000")).toBe("2.00");
			expect(nanosecondsToCores("1500000000")).toBe("1.50");
		});

		it("should round to 2 decimal places", () => {
			expect(nanosecondsToCores("100000000")).toBe("0.10");
			expect(nanosecondsToCores("250000000")).toBe("0.25");
			expect(nanosecondsToCores("333333333")).toBe("0.33");
		});

		it("should handle zero", () => {
			expect(nanosecondsToCores("0")).toBe("0.00");
		});

		it("should throw error for empty string", () => {
			expect(() => nanosecondsToCores("")).toThrow(
				"Nanoseconds value cannot be empty",
			);
		});

		it("should throw error for invalid values", () => {
			expect(() => nanosecondsToCores("invalid")).toThrow(
				"Invalid nanoseconds value",
			);
			expect(() => nanosecondsToCores("-1000000000")).toThrow(
				"Invalid nanoseconds value",
			);
		});
	});

	describe("bytesToComposeMemory", () => {
		it("should convert bytes to compose memory format (MB)", () => {
			expect(bytesToComposeMemory("536870912")).toBe("512M");
			expect(bytesToComposeMemory("268435456")).toBe("256M");
		});

		it("should convert bytes to compose memory format (GB)", () => {
			expect(bytesToComposeMemory("1073741824")).toBe("1.0G");
			expect(bytesToComposeMemory("2147483648")).toBe("2.0G");
			expect(bytesToComposeMemory("5368709120")).toBe("5.0G");
		});

		it("should handle fractional GB values", () => {
			expect(bytesToComposeMemory("1610612736")).toBe("1.5G"); // 1.5 GB
		});
	});

	describe("nanosecondsToComposeCpu", () => {
		it("should convert nanoseconds to compose CPU format", () => {
			expect(nanosecondsToComposeCpu("1000000000")).toBe("1.00");
			expect(nanosecondsToComposeCpu("1500000000")).toBe("1.50");
			expect(nanosecondsToComposeCpu("500000000")).toBe("0.50");
		});
	});

	describe("Round-trip conversions", () => {
		it("should maintain value through MB <-> bytes conversion", () => {
			const originalMb = "1024";
			const bytes = mbToBytes(originalMb);
			const backToMb = bytesToMb(bytes);
			expect(backToMb).toBe(originalMb);
		});

		it("should maintain value through cores <-> nanoseconds conversion", () => {
			const originalCores = "2.00";
			const ns = coresToNanoseconds(originalCores);
			const backToCores = nanosecondsToCores(ns);
			expect(backToCores).toBe(originalCores);
		});
	});
});
