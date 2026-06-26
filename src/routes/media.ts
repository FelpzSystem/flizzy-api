import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PostModel, ReelModel, MessageModel } from "../lib/mongodb";

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

router.post("/posts", async (req: Request, res: Response) => {
  try {
    const post = await PostModel.create(req.body);
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to create post" });
  }
});

router.get("/posts", async (_req: Request, res: Response) => {
  try {
    const posts = await PostModel.find().sort({ timestamp: -1 }).limit(50);
    res.json(posts);
  } catch {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

router.post("/posts/:id/like", async (req: Request, res: Response) => {
  const { userId } = req.body;
  const post = await PostModel.findById(req.params.id);
  if (!post) { res.status(404).json({ error: "Not found" }); return; }
  const idx = post.likedByIds.indexOf(userId);
  if (idx === -1) post.likedByIds.push(userId);
  else post.likedByIds.splice(idx, 1);
  await post.save();
  res.json(post);
});

router.post("/posts/:id/comment", async (req: Request, res: Response) => {
  const post = await PostModel.findById(req.params.id);
  if (!post) { res.status(404).json({ error: "Not found" }); return; }
  const comment = { id: `c${Date.now()}`, ...req.body, timestamp: Date.now() };
  post.comments.push(comment);
  await post.save();
  res.json(post);
});

router.post("/reels", async (req: Request, res: Response) => {
  try {
    const reel = await ReelModel.create(req.body);
    res.json(reel);
  } catch {
    res.status(500).json({ error: "Failed to create reel" });
  }
});

router.get("/reels", async (_req: Request, res: Response) => {
  try {
    const reels = await ReelModel.find().sort({ viralScore: -1 }).limit(50);
    res.json(reels);
  } catch {
    res.status(500).json({ error: "Failed to fetch reels" });
  }
});

router.post("/reels/:id/like", async (req: Request, res: Response) => {
  const { userId } = req.body;
  const reel = await ReelModel.findById(req.params.id);
  if (!reel) { res.status(404).json({ error: "Not found" }); return; }
  const idx = reel.likedByIds.indexOf(userId);
  if (idx === -1) reel.likedByIds.push(userId);
  else reel.likedByIds.splice(idx, 1);
  await reel.save();
  res.json(reel);
});

router.get("/messages/:conversationId", async (req: Request, res: Response) => {
  const messages = await MessageModel.find({ conversationId: req.params.conversationId }).sort({ timestamp: 1 });
  res.json(messages);
});

router.post("/messages", async (req: Request, res: Response) => {
  try {
    const msg = await MessageModel.create(req.body);
    res.json(msg);
  } catch {
    res.status(500).json({ error: "Failed to save message" });
  }
});

export default router;
