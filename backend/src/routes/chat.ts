import { Router } from "express";
import { sendChat } from "../services/workstation.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const userContext = req.userContext;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    if (!userContext) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await sendChat(
      req.body.message,
      userContext,
      req.body.conversation_id,
      req.sessionID,
    );
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Chat request failed" });
  }
});

export default router;
