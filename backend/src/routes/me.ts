import { Router } from "express";
import { requireUserContext } from "../auth/middleware.js";

const router = Router();

router.get("/", requireUserContext, (req, res) => {
  res.json({
    authenticated: true,
    user: req.userContext,
  });
});

export default router;
