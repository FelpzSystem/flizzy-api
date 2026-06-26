import mongoose from "mongoose";
import { logger } from "./logger";

let connected = false;

export async function connectMongo() {
  if (connected) return;
  const uri = process.env["MONGODB_URI"];
  if (!uri) {
    logger.warn("MONGODB_URI not set — MongoDB disabled");
    return;
  }
  try {
    await mongoose.connect(uri);
    connected = true;
    logger.info("MongoDB connected");
  } catch (err) {
    logger.error({ err }, "MongoDB connection failed");
  }
}

const PostSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  caption: { type: String, default: "" },
  hashtags: [String],
  imageUrl: { type: String, default: "" },
  likedByIds: [String],
  comments: [
    {
      id: String,
      userId: String,
      text: String,
      timestamp: Number,
    },
  ],
  timestamp: { type: Number, default: () => Date.now() },
});

const ReelSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  caption: { type: String, default: "" },
  hashtags: [String],
  videoUrl: { type: String, default: "" },
  thumbnailUrl: { type: String, default: "" },
  audio: { type: String, default: "Original" },
  likedByIds: [String],
  viewCount: { type: Number, default: 0 },
  viralScore: { type: Number, default: 0 },
  isFirstReel: { type: Boolean, default: false },
  timestamp: { type: Number, default: () => Date.now() },
});

const MessageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true },
  fromId: { type: String, required: true },
  text: { type: String, default: "" },
  mediaUrl: { type: String, default: "" },
  mediaType: { type: String, enum: ["image", "video", "file", ""], default: "" },
  fileName: { type: String, default: "" },
  timestamp: { type: Number, default: () => Date.now() },
});

export const PostModel = mongoose.models["Post"] ?? mongoose.model("Post", PostSchema);
export const ReelModel = mongoose.models["Reel"] ?? mongoose.model("Reel", ReelSchema);
export const MessageModel = mongoose.models["Message"] ?? mongoose.model("Message", MessageSchema);
