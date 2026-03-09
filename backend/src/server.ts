import "./env";

import express from "express";
import chatRouter from "./routes/chat";
import powerRouter from "./routes/power";
import statusRouter from "./routes/status";
import { HOST, PORT } from "./env";

const app = express();

app.use(express.json());

const apiRouter = express.Router();
apiRouter.use("/chat", chatRouter);
apiRouter.use("/power", powerRouter);
apiRouter.use("/status", statusRouter);

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "jarvis-backend" });
});

// Mount in multiple base paths to support common Nginx proxy_pass styles.
app.use("/", apiRouter);
app.use("/api", apiRouter);
app.use("/jarvis/api", apiRouter);

app.listen(PORT, HOST, () => {
  console.log(`Jarvis backend running on ${HOST}:${PORT}`);
});
