import { Request, Response, NextFunction } from "express";

/**
 * Placeholder authentication middleware.
 *
 * Replace the body of this function with real token verification
 * (e.g. JWT validation, session lookup) before going to production.
 * For now it requires a non-empty Bearer token in the Authorization header
 * so that unauthenticated callers are rejected outright.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = header.slice(7);
  if (token.length === 0) {
    res.status(401).json({ error: "Empty bearer token" });
    return;
  }

  // TODO: verify token signature / look up session here
  next();
}
