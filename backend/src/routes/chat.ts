import { Router } from "express";
import { sendChat } from "../services/workstation";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const result = await sendChat(message, sessionId);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Chat request failed" });
  }
});

export default router;