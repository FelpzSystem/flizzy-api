import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";

vi.mock("@workspace/api-zod", () => ({
  HealthCheckResponse: {
    parse(data: unknown) {
      return data;
    },
  },
}));

describe("GET /healthz", () => {
  it("returns 200 with status ok", async () => {
    const { default: healthRouter } = await import("../../routes/health");
    const app = express();
    app.use(healthRouter);

    const res = await request(app).get("/healthz");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
