import express from "express";
import chatRouter from "./routes/chat.js";
import powerRouter from "./routes/power.js";
import statusRouter from "./routes/status.js";
import { HOST, PORT } from "./env.js";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import { Issuer } from "openid-client";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(session({
  name: "jarvis_session",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));

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
// app.use("/jarvis/api", apiRouter);

app.listen(PORT, HOST, () => {
  console.log(`Jarvis backend running on ${HOST}:${PORT}`);
});
