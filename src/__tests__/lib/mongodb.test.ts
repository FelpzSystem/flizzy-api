import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("mongoose", () => {
  class MockSchema {
    constructor() {}
  }
  const connect = vi.fn();
  const model = vi.fn().mockReturnValue({ modelName: "MockModel" });
  return {
    default: {
      connect,
      Schema: MockSchema,
      model,
      models: {},
    },
    __esModule: true,
  };
});

vi.mock("../../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("mongodb", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("warns and returns early when MONGODB_URI is not set", async () => {
    delete process.env.MONGODB_URI;
    const { logger } = await import("../../lib/logger");
    const { connectMongo } = await import("../../lib/mongodb");

    await connectMongo();
    expect(logger.warn).toHaveBeenCalledWith("MONGODB_URI not set — MongoDB disabled");
  });

  it("connects successfully when MONGODB_URI is set", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    const mongoose = (await import("mongoose")).default;
    const { logger } = await import("../../lib/logger");
    const { connectMongo } = await import("../../lib/mongodb");

    (mongoose.connect as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    await connectMongo();
    expect(mongoose.connect).toHaveBeenCalledWith("mongodb://localhost:27017/test");
    expect(logger.info).toHaveBeenCalledWith("MongoDB connected");
  });

  it("logs error when connection fails", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    const mongoose = (await import("mongoose")).default;
    const { logger } = await import("../../lib/logger");
    const { connectMongo } = await import("../../lib/mongodb");

    const error = new Error("Connection failed");
    (mongoose.connect as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

    await connectMongo();
    expect(logger.error).toHaveBeenCalledWith({ err: error }, "MongoDB connection failed");
  });

  it("does not reconnect if already connected", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    const mongoose = (await import("mongoose")).default;
    const { connectMongo } = await import("../../lib/mongodb");

    (mongoose.connect as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const callsBefore = (mongoose.connect as ReturnType<typeof vi.fn>).mock.calls.length;
    await connectMongo();
    await connectMongo();
    const callsAfter = (mongoose.connect as ReturnType<typeof vi.fn>).mock.calls.length;
    // Only one new call should have been made (the second connectMongo should short-circuit)
    expect(callsAfter - callsBefore).toBe(1);
  });

  it("exports PostModel, ReelModel, and MessageModel", async () => {
    const { PostModel, ReelModel, MessageModel } = await import("../../lib/mongodb");
    expect(PostModel).toBeDefined();
    expect(ReelModel).toBeDefined();
    expect(MessageModel).toBeDefined();
  });
});
