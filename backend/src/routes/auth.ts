import { Router } from "express";
import type { Request } from "express";
import {
  IS_PRODUCTION,
  SESSION_COOKIE_NAME,
  getFrontendRootUrl,
} from "../env.js";
import { buildLoginRedirect, handleOidcCallback } from "../auth/oidc.js";
import { upsertOidcUser } from "../auth/store.js";

const router = Router();

function saveSession(req: Request) {
  return new Promise<void>((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function regenerateSession(req: Request) {
  return new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function destroySession(req: Request) {
  return new Promise<void>((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function getRequestUrl(req: Request) {
  const origin = `${req.protocol}://${req.get("host")}`;
  return new URL(req.originalUrl, origin);
}

router.get("/login", async (req, res) => {
  console.log("Login requested");
  try {
    const redirectTo = await buildLoginRedirect(req.session);
    await saveSession(req);
    res.redirect(302, redirectTo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to start login" });
  }
});

router.get("/callback", async (req, res) => {
  try {
    const profile = await handleOidcCallback(getRequestUrl(req), req.session);
    delete req.session.oidc;

    const user = upsertOidcUser(profile);

    await regenerateSession(req);
    req.session.auth = { user_id: user.id };
    await saveSession(req);

    res.redirect(302, getFrontendRootUrl());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "OIDC callback failed" });
  }
});

router.post("/logout", async (req, res) => {
  try {
    await destroySession(req);
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: "lax",
      path: "/",
    });
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Logout failed" });
  }
});

export default router;
