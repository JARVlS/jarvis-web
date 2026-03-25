import type { NextFunction, Request, Response } from "express";
import { getUserContextById } from "./store.js";

function clearBrokenSession(req: Request) {
  delete req.session.auth;
  void req.session.save(() => undefined);
}

function resolveUserContext(req: Request) {
  if (req.userContext) {
    return req.userContext;
  }

  const userId = req.session.auth?.user_id;
  if (!userId) {
    return null;
  }

  const userContext = getUserContextById(userId);
  if (!userContext) {
    clearBrokenSession(req);
    return null;
  }

  req.userContext = userContext;
  return userContext;
}

export function requireUserContext(req: Request, res: Response, next: NextFunction) {
  const userContext = resolveUserContext(req);
  if (!userContext) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  next();
}

export function requireScope(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userContext = resolveUserContext(req);
    if (!userContext) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!userContext.scopes.includes(requiredScope)) {
      res.status(403).json({ error: `Missing required scope: ${requiredScope}` });
      return;
    }

    next();
  };
}

export function requireShortcutSecret(req: Request, res: Response, next: NextFunction) {
  console.log("Checking shortcut secret for incoming request");
  const auth = req.header("Authorization");
  if (auth !== `Bearer ${process.env.SIRI_SHORTCUT_TOKEN}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}