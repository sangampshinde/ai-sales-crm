import Lead from "../models/lead.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { invalidateUserCache } from "../config/redis.js";

export const getLeads = asyncHandler(async (req, res) => {
  const { status, priority, source, search } = req.query;
  const where = { ownerId: req.user.id };

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (source) where.source = source;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];
  }

  const leads = await Lead.findMany({
    where,
    orderBy: [
      { order: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  res.json({ success: true, count: leads.length, leads });
});

export const getLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findFirst({
    where: { 
      id: parseInt(req.params.id), 
      ownerId: req.user.id 
    }
  });
  
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }
  
  res.json({ success: true, lead });
});

export const createLead = asyncHandler(async (req, res) => {
  const lead = await Lead.create({
    data: {
      ...req.body,
      ownerId: req.user.id
    }
  });

  await invalidateUserCache(req.user.id);
  res.status(201).json({ success: true, lead });
});

export const updateLead = asyncHandler(async (req, res) => {
  const { owner, ownerId, id, ...updates } = req.body; 
  
  const existingLead = await Lead.findFirst({
    where: { 
      id: parseInt(req.params.id), 
      ownerId: req.user.id 
    }
  });

  if (!existingLead) {
    throw new ApiError(404, "Lead not found");
  }
  
  const lead = await Lead.update({
    where: { id: parseInt(req.params.id) },
    data: updates
  });
  
  await invalidateUserCache(req.user.id);
  res.json({ success: true, lead });
});

export const deleteLead = asyncHandler(async (req, res) => {
  const existingLead = await Lead.findFirst({
    where: { 
      id: parseInt(req.params.id), 
      ownerId: req.user.id 
    }
  });

  if (!existingLead) {
    throw new ApiError(404, "Lead not found");
  }
  
  await Lead.delete({
    where: { id: parseInt(req.params.id) }
  });
  
  await invalidateUserCache(req.user.id);
  res.json({ success: true, message: "Lead deleted" });
});

export const reorderLeads = asyncHandler(async (req, res) => {
  const { updates } = req.body;
  
  if (!Array.isArray(updates)) {
    throw new ApiError(400, "updates must be an array");
  }
  
  await Promise.all(
    updates.map(async (u) => {
      const existing = await Lead.findFirst({
        where: { id: parseInt(u.id), ownerId: req.user.id }
      });
      if (existing) {
        await Lead.update({
          where: { id: parseInt(u.id) },
          data: { status: u.status, order: u.order }
        });
      }
    })
  );
  
  await invalidateUserCache(req.user.id);
  res.json({ success: true, message: "Pipeline updated" });
});
