import { Router } from "express";
import {
  wakeWorkstation,
  sleepWorkstation,
  shutdownWorkstation,
  wakePC,
} from "../services/pi.js";

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

router.post("/wake-pc", async (_req, res) => {
  try {
    const result = await wakePC();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Wake PC failed" });
  }
});

export default router;
