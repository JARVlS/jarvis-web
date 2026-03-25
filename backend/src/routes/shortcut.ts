import { Router } from "express";
import {
  wakeWorkstation,
  sleepWorkstation,
  shutdownWorkstation,
} from "../services/pi.js";
import { requireShortcutSecret } from "../auth/middleware.js";

const router = Router();

router.post("/wake", requireShortcutSecret, async (_req, res) => {
    console.log("Received wake request from shortcut to wake");
  try {
    const result = await wakeWorkstation();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Wake failed" });
  }
});

router.post("/sleep", requireShortcutSecret, async (_req, res) => {
    console.log("Received sleep request from shortcut to sleep");
  try {
    const result = await sleepWorkstation();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sleep failed" });
  }
});

router.post("/shutdown", requireShortcutSecret, async (_req, res) => {
    console.log("Received shutdown request from shortcut to shutdown");
  try {
    const result = await shutdownWorkstation();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Shutdown failed" });
  }
});

export default router;