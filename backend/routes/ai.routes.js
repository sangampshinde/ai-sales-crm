import { Router } from "express";
import {
  getAiStatus,
  summarizeLead,
  draftEmail,
  getSalesInsights,
} from "../controllers/ai.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(protect);

router.get("/status", getAiStatus);
router.post("/lead-summary", summarizeLead);
router.post("/generate-email", draftEmail);
router.post("/sales-insights", getSalesInsights);

export default router;
