import { Router } from "express";
import { sendChat, buildJarvisChatPayload, streamChatFromWorkstation } from "../services/workstation.js";
import type { UserContext } from "../auth/types.js";


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

router.post("/stream", async (req, res) => {
  try {
    const { message, conversation_id } = req.body;
    const userContext = req.userContext;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    if (!userContext) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const payload = buildJarvisChatPayload(
      message,
      userContext,
      req.sessionID,
      conversation_id,
    );

    const pythonResponse = await streamChatFromWorkstation(payload);

    if (!pythonResponse.ok || !pythonResponse.body) {
      const errorText = await pythonResponse.text();

      res.status(pythonResponse.status).json({ error: `Chat stream request failed: ${errorText}` });
      return;
    }

    res.status(200);
    res.setHeader(
      "Content-Type",
      pythonResponse.headers.get("content-type") ?? "application/x-ndjson; charset=utf-8",
    );
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const reader = pythonResponse.body.getReader();

    req.on("close", () => {
      reader.cancel().catch(() => {});
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      console.log("[jarvis stream][backend chunk]", Buffer.from(value).toString("utf8"));
      res.write(Buffer.from(value));
    }

    res.end();


  } catch (error) {
    console.error("Chat stream failed:", error);

    if (!res.headersSent) {
      res.status(500).json({ error: "Chat stream failed" });
    } else {
      res.end();
    }
  }
});
export default router;
