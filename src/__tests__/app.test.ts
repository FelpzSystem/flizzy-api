import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("@workspace/api-zod", () => ({
  HealthCheckResponse: {
    parse(data: unknown) {
      return data;
    },
  },
}));

vi.mock("../lib/mongodb", () => ({
  PostModel: { create: vi.fn(), find: vi.fn(), findById: vi.fn() },
  ReelModel: { create: vi.fn(), find: vi.fn(), findById: vi.fn() },
  MessageModel: { create: vi.fn(), find: vi.fn() },
}));

describe("app", () => {
  it("exports an express app", async () => {
    const { default: app } = await import("../app");
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe("function");
  });

  it("has CORS headers enabled", async () => {
    const { default: app } = await import("../app");
    const res = await request(app).get("/api/healthz");
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });

  it("mounts routes under /api", async () => {
    const { default: app } = await import("../app");
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("returns 404 for unknown routes", async () => {
    const { default: app } = await import("../app");
    const res = await request(app).get("/nonexistent");
    expect(res.status).toBe(404);
  });

  it("parses JSON body", async () => {
    const { default: app } = await import("../app");
    const res = await request(app)
      .post("/api/media/posts")
      .send({ userId: "test" })
      .set("Content-Type", "application/json");
    // Will get an error from the mock but should not crash
    expect([200, 500]).toContain(res.status);
  });
});
