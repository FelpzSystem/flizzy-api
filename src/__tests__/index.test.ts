import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../app", () => ({
  default: {
    listen: vi.fn((_port: number, cb: (err?: Error) => void) => {
      cb();
    }),
  },
}));

vi.mock("../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../lib/mongodb", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe("index (server startup)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws when PORT is not set", async () => {
    delete process.env.PORT;
    await expect(
      import("../index")
    ).rejects.toThrow("PORT environment variable is required");
  });

  it("throws when PORT is not a valid number", async () => {
    process.env.PORT = "abc";
    await expect(
      import("../index")
    ).rejects.toThrow('Invalid PORT value: "abc"');
  });

  it("throws when PORT is zero or negative", async () => {
    process.env.PORT = "0";
    await expect(
      import("../index")
    ).rejects.toThrow('Invalid PORT value: "0"');
  });

  it("starts server on valid PORT", async () => {
    process.env.PORT = "3000";
    const appModule = await import("../app");
    const { connectMongo } = await import("../lib/mongodb");
    const { logger } = await import("../lib/logger");

    await import("../index");

    // Wait for the connectMongo().then() to resolve
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(connectMongo).toHaveBeenCalled();
    expect(appModule.default.listen).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith({ port: 3000 }, "Server listening");
  });

  it("exits on listen error", async () => {
    process.env.PORT = "3000";
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Re-mock app to simulate a listen error
    vi.doMock("../app", () => ({
      default: {
        listen: vi.fn((_port: number, cb: (err?: Error) => void) => {
          cb(new Error("EADDRINUSE"));
        }),
      },
    }));

    const { logger } = await import("../lib/logger");
    await import("../index");

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(logger.error).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });
});
