import express from "express";
import session from "express-session";
import { requireScope } from "./auth/middleware.js";
import { SQLiteSessionStore } from "./auth/sessionStore.js";
import { bootstrapAuthorizationData } from "./auth/store.js";
import { initializeDatabase } from "./db.js";
import {
  HOST,
  IS_PRODUCTION,
  PORT,
  SESSION_COOKIE_NAME,
  SESSION_SECRET,
} from "./env.js";
import authRouter from "./routes/auth.js";
import chatRouter from "./routes/chat.js";
import meRouter from "./routes/me.js";
import powerRouter from "./routes/power.js";
import statusRouter from "./routes/status.js";
import shortCutRouter from "./routes/shortcut.js";
import { syncToolDefinitions } from "./tools/registry.js";

initializeDatabase();
bootstrapAuthorizationData();
syncToolDefinitions();


const app = express();

if (IS_PRODUCTION) {
  app.set("trust proxy", 1);
}

app.use(express.json());
app.use(
  session({
    name: SESSION_COOKIE_NAME,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new SQLiteSessionStore(),
    proxy: IS_PRODUCTION,
    cookie: {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1_000,
    },
  }),
);


const apiRouter = express.Router();
apiRouter.use("/status", statusRouter);
apiRouter.use("/me", meRouter);
apiRouter.use("/chat", requireScope("chat:use"), chatRouter);
apiRouter.use("/power", requireScope("power:control"), powerRouter);

apiRouter.use("/shortcut", shortCutRouter);

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "jarvis-backend" });
});

app.use("/auth", authRouter);

// Mount in multiple base paths to support common Nginx proxy_pass styles.
app.use("/", apiRouter);
app.use("/api", apiRouter);
// app.use("/jarvis/api", apiRouter);

app.listen(PORT, HOST, () => {
  console.log(`Jarvis backend running on ${HOST}:${PORT}`);
});
