import Lead from "../models/lead.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  isAiConfigured,
  generateLeadSummary,
  generateEmail,
  generateSalesInsights,
} from "../services/ai.service.js";

const resolveLead = async (body, userId) => {
  if (body.leadId) {
    const lead = await Lead.findFirst({
      where: { id: parseInt(body.leadId), ownerId: userId },
    });
    if (!lead) throw new ApiError(404, "Lead not found");
    return lead;
  }
  if (body.lead && typeof body.lead === "object") {
    return body.lead;
  }
  throw new ApiError(400, "Must provide leadId or lead payload");
};

const buildPipelineStats = (leads) => {
  const stages = {
    new: { count: 0, value: 0 },
    qualified: { count: 0, value: 0 },
    proposal: { count: 0, value: 0 },
    won: { count: 0, value: 0 },
    lost: { count: 0, value: 0 },
  };

  let totalValue = 0;
  let wonCount = 0;
  let lostCount = 0;

  leads.forEach((l) => {
    // Prisma LeadStatus enum values are New, Qualified, Proposal, Won, Lost.
    // Convert to lowercase to match the stages object keys.
    const status = l.status ? l.status.toLowerCase() : "new";
    const stage = stages[status] ? status : "new";
    
    stages[stage].count += 1;
    stages[stage].value += l.value || 0;
    totalValue += l.value || 0;
    
    if (status === "won") wonCount++;
    if (status === "lost") lostCount++;
  });

  const closed = wonCount + lostCount;
  const winRate = closed > 0 ? Math.round((wonCount / closed) * 100) : 0;

  return {
    totalLeads: leads.length,
    totalPipelineValue: totalValue,
    winRate,
    stages,
  };
};

export const getAiStatus = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    configured: isAiConfigured(),
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
  });
});

export const summarizeLead = asyncHandler(async (req, res) => {
  const lead = await resolveLead(req.body, req.user.id);
  const result = await generateLeadSummary(lead);

  if (req.body.leadId) {
    await Lead.update({
      where: { id: parseInt(req.body.leadId) },
      data: {
        aiSummary: result.summary,
        aiRiskScore: result.riskScore,
      },
    });
  }

  res.status(200).json({ success: true, ...result, data: result });
});

export const draftEmail = asyncHandler(async (req, res) => {
  const lead = await resolveLead(req.body, req.user.id);
  const { purpose = "follow-up", tone = "professional" } = req.body;

  const result = await generateEmail({
    lead,
    purpose,
    tone,
    senderName: req.user.name,
    senderCompany: req.user.company,
  });

  res.status(200).json({ success: true, ...result, data: result });
});

export const getSalesInsights = asyncHandler(async (req, res) => {
  let stats = req.body.stats;

  if (!stats) {
    const leads = await Lead.findMany({ where: { ownerId: req.user.id } });
    stats = buildPipelineStats(leads);
  }

  const result = await generateSalesInsights(stats);
  res.status(200).json({ success: true, ...result, data: result });
});
