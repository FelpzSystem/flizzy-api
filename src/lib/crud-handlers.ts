import type { Request, Response } from "express";
import type { Model, Document } from "mongoose";
import { asyncHandler } from "./async-handler";

interface LikeableDocument extends Document {
  likedByIds: string[];
}

export function createOne(model: Model<Document>) {
  return asyncHandler(async (req: Request, res: Response) => {
    const doc = await model.create(req.body);
    res.json(doc);
  });
}

export function findMany(
  model: Model<Document>,
  sortBy: Record<string, 1 | -1>,
  limit = 50,
) {
  return asyncHandler(async (_req: Request, res: Response) => {
    const docs = await model.find().sort(sortBy).limit(limit);
    res.json(docs);
  });
}

export function toggleLike(model: Model<LikeableDocument>) {
  return asyncHandler(async (req: Request, res: Response) => {
    const doc = await model.findById(req.params["id"]);
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { userId } = req.body;
    const idx = doc.likedByIds.indexOf(userId);
    if (idx === -1) doc.likedByIds.push(userId);
    else doc.likedByIds.splice(idx, 1);
    await doc.save();
    res.json(doc);
  });
}
