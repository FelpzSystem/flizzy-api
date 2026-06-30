import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import path from "path";
import fs from "fs";

const mockPostModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
};

const mockReelModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
};

const mockMessageModel = {
  create: vi.fn(),
  find: vi.fn(),
};

vi.mock("../../lib/mongodb", () => ({
  PostModel: {
    create: (...args: unknown[]) => mockPostModel.create(...args),
    find: (...args: unknown[]) => mockPostModel.find(...args),
    findById: (...args: unknown[]) => mockPostModel.findById(...args),
  },
  ReelModel: {
    create: (...args: unknown[]) => mockReelModel.create(...args),
    find: (...args: unknown[]) => mockReelModel.find(...args),
    findById: (...args: unknown[]) => mockReelModel.findById(...args),
  },
  MessageModel: {
    create: (...args: unknown[]) => mockMessageModel.create(...args),
    find: (...args: unknown[]) => mockMessageModel.find(...args),
  },
}));

describe("media routes", () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    const { default: mediaRouter } = await import("../../routes/media");
    app.use("/api/media", mediaRouter);
  });

  describe("POST /api/media/upload", () => {
    it("returns 400 when no file is uploaded", async () => {
      const res = await request(app).post("/api/media/upload");
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "No file uploaded" });
    });

    it("uploads a file and returns url", async () => {
      const testFilePath = path.resolve(process.cwd(), "test-upload.txt");
      fs.writeFileSync(testFilePath, "test content");

      const res = await request(app)
        .post("/api/media/upload")
        .attach("file", testFilePath);

      expect(res.status).toBe(200);
      expect(res.body.url).toContain("/api/media/files/");
      expect(res.body.filename).toBe("test-upload.txt");
      expect(res.body.mimetype).toBe("text/plain");

      // cleanup
      fs.unlinkSync(testFilePath);
    });
  });

  describe("POST /api/media/posts", () => {
    it("creates a post successfully", async () => {
      const postData = { userId: "user1", caption: "Hello world" };
      mockPostModel.create.mockResolvedValueOnce({ ...postData, _id: "post1" });

      const res = await request(app)
        .post("/api/media/posts")
        .send(postData);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ...postData, _id: "post1" });
      expect(mockPostModel.create).toHaveBeenCalledWith(postData);
    });

    it("returns 500 when creation fails", async () => {
      mockPostModel.create.mockRejectedValueOnce(new Error("DB error"));

      const res = await request(app)
        .post("/api/media/posts")
        .send({ userId: "user1" });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Failed to create post" });
    });
  });

  describe("GET /api/media/posts", () => {
    it("returns posts sorted by timestamp descending", async () => {
      const posts = [{ _id: "1", caption: "Post 1" }];
      mockPostModel.find.mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          limit: vi.fn().mockResolvedValueOnce(posts),
        }),
      });

      const res = await request(app).get("/api/media/posts");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(posts);
    });

    it("returns 500 when fetch fails", async () => {
      mockPostModel.find.mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          limit: vi.fn().mockRejectedValueOnce(new Error("DB error")),
        }),
      });

      const res = await request(app).get("/api/media/posts");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Failed to fetch posts" });
    });
  });

  describe("POST /api/media/posts/:id/like", () => {
    it("adds a like when user has not liked", async () => {
      const post = {
        likedByIds: [],
        save: vi.fn().mockResolvedValueOnce(undefined),
        toJSON: () => ({ likedByIds: ["user1"] }),
      };
      mockPostModel.findById.mockResolvedValueOnce(post);

      const res = await request(app)
        .post("/api/media/posts/post1/like")
        .send({ userId: "user1" });

      expect(res.status).toBe(200);
      expect(post.likedByIds).toContain("user1");
      expect(post.save).toHaveBeenCalled();
    });

    it("removes a like when user already liked", async () => {
      const post = {
        likedByIds: ["user1"],
        save: vi.fn().mockResolvedValueOnce(undefined),
        toJSON: () => ({ likedByIds: [] }),
      };
      mockPostModel.findById.mockResolvedValueOnce(post);

      const res = await request(app)
        .post("/api/media/posts/post1/like")
        .send({ userId: "user1" });

      expect(res.status).toBe(200);
      expect(post.likedByIds).not.toContain("user1");
      expect(post.save).toHaveBeenCalled();
    });

    it("returns 404 when post not found", async () => {
      mockPostModel.findById.mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/media/posts/invalid/like")
        .send({ userId: "user1" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Not found" });
    });
  });

  describe("POST /api/media/posts/:id/comment", () => {
    it("adds a comment to a post", async () => {
      const post = {
        comments: [],
        save: vi.fn().mockResolvedValueOnce(undefined),
        toJSON: () => ({ comments: [{ id: "c1", userId: "user1", text: "Nice" }] }),
      };
      mockPostModel.findById.mockResolvedValueOnce(post);

      const res = await request(app)
        .post("/api/media/posts/post1/comment")
        .send({ userId: "user1", text: "Nice" });

      expect(res.status).toBe(200);
      expect(post.comments.length).toBe(1);
      expect(post.comments[0]).toMatchObject({ userId: "user1", text: "Nice" });
      expect(post.save).toHaveBeenCalled();
    });

    it("returns 404 when post not found", async () => {
      mockPostModel.findById.mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/media/posts/invalid/comment")
        .send({ userId: "user1", text: "Nice" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Not found" });
    });
  });

  describe("POST /api/media/reels", () => {
    it("creates a reel successfully", async () => {
      const reelData = { userId: "user1", caption: "My reel" };
      mockReelModel.create.mockResolvedValueOnce({ ...reelData, _id: "reel1" });

      const res = await request(app)
        .post("/api/media/reels")
        .send(reelData);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ...reelData, _id: "reel1" });
    });

    it("returns 500 when creation fails", async () => {
      mockReelModel.create.mockRejectedValueOnce(new Error("DB error"));

      const res = await request(app)
        .post("/api/media/reels")
        .send({ userId: "user1" });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Failed to create reel" });
    });
  });

  describe("GET /api/media/reels", () => {
    it("returns reels sorted by viralScore descending", async () => {
      const reels = [{ _id: "1", caption: "Viral" }];
      mockReelModel.find.mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          limit: vi.fn().mockResolvedValueOnce(reels),
        }),
      });

      const res = await request(app).get("/api/media/reels");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(reels);
    });

    it("returns 500 when fetch fails", async () => {
      mockReelModel.find.mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          limit: vi.fn().mockRejectedValueOnce(new Error("DB error")),
        }),
      });

      const res = await request(app).get("/api/media/reels");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Failed to fetch reels" });
    });
  });

  describe("POST /api/media/reels/:id/like", () => {
    it("toggles like on a reel", async () => {
      const reel = {
        likedByIds: [],
        save: vi.fn().mockResolvedValueOnce(undefined),
        toJSON: () => ({ likedByIds: ["user1"] }),
      };
      mockReelModel.findById.mockResolvedValueOnce(reel);

      const res = await request(app)
        .post("/api/media/reels/reel1/like")
        .send({ userId: "user1" });

      expect(res.status).toBe(200);
      expect(reel.likedByIds).toContain("user1");
      expect(reel.save).toHaveBeenCalled();
    });

    it("returns 404 when reel not found", async () => {
      mockReelModel.findById.mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/media/reels/invalid/like")
        .send({ userId: "user1" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Not found" });
    });
  });

  describe("GET /api/media/messages/:conversationId", () => {
    it("returns messages for a conversation", async () => {
      const messages = [{ text: "Hello" }];
      mockMessageModel.find.mockReturnValueOnce({
        sort: vi.fn().mockResolvedValueOnce(messages),
      });

      const res = await request(app).get("/api/media/messages/conv1");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(messages);
    });
  });

  describe("POST /api/media/messages", () => {
    it("creates a message successfully", async () => {
      const msgData = { conversationId: "conv1", fromId: "user1", text: "Hi" };
      mockMessageModel.create.mockResolvedValueOnce({ ...msgData, _id: "msg1" });

      const res = await request(app)
        .post("/api/media/messages")
        .send(msgData);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ...msgData, _id: "msg1" });
    });

    it("returns 500 when message creation fails", async () => {
      mockMessageModel.create.mockRejectedValueOnce(new Error("DB error"));

      const res = await request(app)
        .post("/api/media/messages")
        .send({ conversationId: "conv1", fromId: "user1" });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Failed to save message" });
    });
  });
});
