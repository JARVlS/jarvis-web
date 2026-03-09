import { Router } from "express";
import {
  wakeWorkstation,
  sleepWorkstation,
  shutdownWorkstation,
} from "../services/pi";

const router = Router();

router.post("/wake", async (_req, res) => {
  try {
    const result = await wakeWorkstation();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Wake failed" });
  }
});

router.post("/sleep", async (_req, res) => {
  try {
    const result = await sleepWorkstation();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sleep failed" });
  }
});

router.post("/shutdown", async (_req, res) => {
  try {
    const result = await shutdownWorkstation();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Shutdown failed" });
  }
});

export default router;