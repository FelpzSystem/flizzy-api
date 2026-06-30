import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PostModel, ReelModel, MessageModel } from "../lib/mongodb";
import { requireAuth } from "../middlewares/auth";

const router = express.Router();

const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).replace(/[^.\w-]/g, "");
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

router.use("/files", express.static(uploadDir, { dotfiles: "deny" }));

// --- helpers ----------------------------------------------------------------

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((i) => typeof i === "string");
}

// --- file upload ------------------------------------------------------------

router.post("/upload", requireAuth, upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const host = `${req.protocol}://${req.get("host")}`;
  const url = `${host}/api/media/files/${req.file.filename}`;
  res.json({ url, filename: req.file.originalname, mimetype: req.file.mimetype });
});

// --- posts ------------------------------------------------------------------

router.post("/posts", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, caption, hashtags, imageUrl } = req.body;
    if (!isNonEmptyString(userId)) {
      res.status(400).json({ error: "userId is required" });
      return;
    }
    const post = await PostModel.create({
      userId,
      caption: typeof caption === "string" ? caption : "",
      hashtags: isStringArray(hashtags) ? hashtags : [],
      imageUrl: typeof imageUrl === "string" ? imageUrl : "",
    });
    res.json(post);
  } catch {
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

router.post("/posts/:id/like", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!isNonEmptyString(userId)) {
      res.status(400).json({ error: "userId is required" });
      return;
    }
    const post = await PostModel.findById(req.params["id"]);
    if (!post) { res.status(404).json({ error: "Not found" }); return; }
    const idx = post.likedByIds.indexOf(userId);
    if (idx === -1) post.likedByIds.push(userId);
    else post.likedByIds.splice(idx, 1);
    await post.save();
    res.json(post);
  } catch {
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

router.post("/posts/:id/comment", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, text } = req.body;
    if (!isNonEmptyString(userId) || !isNonEmptyString(text)) {
      res.status(400).json({ error: "userId and text are required" });
      return;
    }
    const post = await PostModel.findById(req.params["id"]);
    if (!post) { res.status(404).json({ error: "Not found" }); return; }
    const comment = { id: `c${Date.now()}`, userId, text, timestamp: Date.now() };
    post.comments.push(comment);
    await post.save();
    res.json(post);
  } catch {
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// --- reels ------------------------------------------------------------------

router.post("/reels", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, caption, hashtags, videoUrl, thumbnailUrl, audio } = req.body;
    if (!isNonEmptyString(userId)) {
      res.status(400).json({ error: "userId is required" });
      return;
    }
    const reel = await ReelModel.create({
      userId,
      caption: typeof caption === "string" ? caption : "",
      hashtags: isStringArray(hashtags) ? hashtags : [],
      videoUrl: typeof videoUrl === "string" ? videoUrl : "",
      thumbnailUrl: typeof thumbnailUrl === "string" ? thumbnailUrl : "",
      audio: typeof audio === "string" ? audio : "Original",
    });
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

router.post("/reels/:id/like", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!isNonEmptyString(userId)) {
      res.status(400).json({ error: "userId is required" });
      return;
    }
    const reel = await ReelModel.findById(req.params["id"]);
    if (!reel) { res.status(404).json({ error: "Not found" }); return; }
    const idx = reel.likedByIds.indexOf(userId);
    if (idx === -1) reel.likedByIds.push(userId);
    else reel.likedByIds.splice(idx, 1);
    await reel.save();
    res.json(reel);
  } catch {
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

// --- messages ---------------------------------------------------------------

router.get("/messages/:conversationId", requireAuth, async (req: Request, res: Response) => {
  try {
    const conversationId = req.params["conversationId"];
    if (!isNonEmptyString(conversationId)) {
      res.status(400).json({ error: "conversationId is required" });
      return;
    }
    const messages = await MessageModel.find({ conversationId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/messages", requireAuth, async (req: Request, res: Response) => {
  try {
    const { conversationId, fromId, text, mediaUrl, mediaType, fileName } = req.body;
    if (!isNonEmptyString(conversationId) || !isNonEmptyString(fromId)) {
      res.status(400).json({ error: "conversationId and fromId are required" });
      return;
    }
    const allowedMediaTypes = ["image", "video", "file", ""];
    const msg = await MessageModel.create({
      conversationId,
      fromId,
      text: typeof text === "string" ? text : "",
      mediaUrl: typeof mediaUrl === "string" ? mediaUrl : "",
      mediaType: allowedMediaTypes.includes(mediaType) ? mediaType : "",
      fileName: typeof fileName === "string" ? fileName : "",
    });
    res.json(msg);
  } catch {
    res.status(500).json({ error: "Failed to save message" });
  }
});

export default router;
