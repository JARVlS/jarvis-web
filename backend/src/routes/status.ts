import { Router } from "express";
import { getPiStatus } from "../services/pi.js";
import { getWorkstationHealth } from "../services/workstation.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const [pi, workstation] = await Promise.allSettled([
      getPiStatus(),
      getWorkstationHealth(),
    ]);

    res.json({
      pi: pi.status === "fulfilled" ? pi.value : { ok: false },
      workstation:
        workstation.status === "fulfilled"
          ? workstation.value
          : { ok: false },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Status failed" });
  }
});

export default router;