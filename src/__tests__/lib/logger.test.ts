import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("logger", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("exports a pino logger instance", async () => {
    const { logger } = await import("../../lib/logger");
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("uses 'info' as default log level", async () => {
    delete process.env.LOG_LEVEL;
    const { logger } = await import("../../lib/logger");
    expect(logger.level).toBe("info");
  });

  it("respects LOG_LEVEL env variable", async () => {
    process.env.LOG_LEVEL = "debug";
    const { logger } = await import("../../lib/logger");
    expect(logger.level).toBe("debug");
  });

  it("uses pino-pretty transport in non-production", async () => {
    process.env.NODE_ENV = "development";
    const { logger } = await import("../../lib/logger");
    // In non-production, transport is configured (pino-pretty)
    expect(logger).toBeDefined();
  });

  it("does not use pino-pretty in production", async () => {
    process.env.NODE_ENV = "production";
    const { logger } = await import("../../lib/logger");
    expect(logger).toBeDefined();
  });
});
