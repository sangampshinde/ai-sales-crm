import Lead from "../models/lead.model.js";
import Contact from "../models/contact.model.js";
import Task from "../models/task.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getCache, setCache } from "../config/redis.js";

const getLast6Months = () => {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short" });
    months.push({ key, label, count: 0, wonValue: 0 });
  }
  return months;
};

export const getOverview = asyncHandler(async (req, res) => {
  const ownerId = req.user.id;
  const cacheKey = `crm:analytics:overview:${ownerId}`;

  // Check Redis Cache first
  const cachedData = await getCache(cacheKey);
  if (cachedData) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json({
      success: true,
      data: cachedData,
      cached: true,
    });
  }

  const [leads, contactCount, openTaskCount] = await Promise.all([
    Lead.findMany({ where: { ownerId } }),
    Contact.count({ where: { ownerId } }),
    Task.count({ where: { ownerId, status: { not: "Completed" } } }),
  ]);

  const pipeline = {
    new: { count: 0, value: 0 },
    qualified: { count: 0, value: 0 },
    proposal: { count: 0, value: 0 },
    won: { count: 0, value: 0 },
    lost: { count: 0, value: 0 },
  };

  let totalPipelineValue = 0;
  let wonValue = 0;
  let wonCount = 0;
  let lostCount = 0;

  leads.forEach((l) => {
    // Convert Prisma enum status to lowercase to match the pipeline map keys
    const status = l.status ? l.status.toLowerCase() : "new";
    const s = pipeline[status] ? status : "new";
    const v = l.value || 0;
    
    pipeline[s].count += 1;
    pipeline[s].value += v;
    totalPipelineValue += v;
    
    if (status === "won") {
      wonValue += v;
      wonCount += 1;
    }
    if (status === "lost") {
      lostCount += 1;
    }
  });

  const closedDeals = wonCount + lostCount;
  const winRate = closedDeals > 0 ? Math.round((wonCount / closedDeals) * 100) : 0;
  const avgDealSize = leads.length > 0 ? Math.round(totalPipelineValue / leads.length) : 0;

  const monthsMap = getLast6Months();
  leads.forEach((l) => {
    const d = new Date(l.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const m = monthsMap.find((item) => item.key === key);
    
    if (m) {
      m.count += 1;
      const status = l.status ? l.status.toLowerCase() : "new";
      if (status === "won") {
        m.wonValue += l.value || 0;
      }
    }
  });

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 6)
    .map((l) => ({
      _id: l.id, // mapped Prisma 'id' back to '_id' so the frontend stays happy
      name: l.name,
      company: l.company,
      value: l.value,
      status: l.status,
      priority: l.priority,
      updatedAt: l.updatedAt,
    }));

  const overviewData = {
    stats: {
      totalLeads: leads.length,
      totalPipelineValue,
      wonValue,
      winRate,
      avgDealSize,
      totalContacts: contactCount,
      openTasks: openTaskCount,
    },
    pipeline,
    trend: monthsMap,
    recentLeads,
  };

  // Cache in Redis for 120 seconds
  await setCache(cacheKey, overviewData, 120);

  res.setHeader("X-Cache", "MISS");
  res.status(200).json({
    success: true,
    data: overviewData,
    cached: false,
  });
});
