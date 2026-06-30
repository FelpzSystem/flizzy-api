import express, { type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PostModel, ReelModel, MessageModel } from "../lib/mongodb";
import { asyncHandler } from "../lib/async-handler";
import { createOne, findMany, toggleLike } from "../lib/crud-handlers";

const router = express.Router();

const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

router.use("/files", express.static(uploadDir));

router.post("/upload", upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const host = `${req.protocol}://${req.get("host")}`;
  const url = `${host}/api/media/files/${req.file.filename}`;
  res.json({ url, filename: req.file.originalname, mimetype: req.file.mimetype });
});

router.post("/posts", createOne(PostModel));
router.get("/posts", findMany(PostModel, { timestamp: -1 }));
router.post("/posts/:id/like", toggleLike(PostModel));

router.post("/posts/:id/comment", asyncHandler(async (req: Request, res: Response) => {
  const post = await PostModel.findById(req.params["id"]);
  if (!post) { res.status(404).json({ error: "Not found" }); return; }
  const comment = { id: `c${Date.now()}`, ...req.body, timestamp: Date.now() };
  post.comments.push(comment);
  await post.save();
  res.json(post);
}));

router.post("/reels", createOne(ReelModel));
router.get("/reels", findMany(ReelModel, { viralScore: -1 }));
router.post("/reels/:id/like", toggleLike(ReelModel));

router.get("/messages/:conversationId", asyncHandler(async (req: Request, res: Response) => {
  const messages = await MessageModel.find({ conversationId: req.params["conversationId"] }).sort({ timestamp: 1 });
  res.json(messages);
}));

router.post("/messages", createOne(MessageModel));

export default router;
