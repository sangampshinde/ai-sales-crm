import Task from "../models/task.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { invalidateUserCache } from "../config/redis.js";

export const getTasks = asyncHandler(async (req, res) => {
  const { status, priority, relatedLead } = req.query;
  const filter = { ownerId: req.user.id };

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (relatedLead) filter.relatedLeadId = parseInt(relatedLead);

  const tasks = await Task.findMany({
    where: filter,
    include: {
      relatedLead: { select: { name: true, company: true } },
      relatedContact: { select: { name: true, company: true } },
    },
    orderBy: [
      { dueDate: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  res.status(200).json({ success: true, count: tasks.length, data: tasks });
});

export const createTask = asyncHandler(async (req, res) => {
  const { relatedLead, relatedContact, ...taskData } = req.body;
  
  if (relatedLead) taskData.relatedLeadId = parseInt(relatedLead);
  if (relatedContact) taskData.relatedContactId = parseInt(relatedContact);

  const task = await Task.create({
    data: {
      ...taskData,
      ownerId: req.user.id,
    },
    include: {
      relatedLead: { select: { name: true, company: true } },
      relatedContact: { select: { name: true, company: true } },
    }
  });

  await invalidateUserCache(req.user.id);
  res.status(201).json({ success: true, data: task });
});

export const updateTask = asyncHandler(async (req, res) => {
  const { owner, ownerId, id, relatedLead, relatedContact, ...updates } = req.body;

  if (relatedLead !== undefined) {
    updates.relatedLeadId = relatedLead ? parseInt(relatedLead) : null;
  }
  
  if (relatedContact !== undefined) {
    updates.relatedContactId = relatedContact ? parseInt(relatedContact) : null;
  }

  // Handle completion date logic (Prisma enums are case-sensitive: Completed, Pending, InProgress)
  // Converting to lowercase to robustly match "completed" or "Completed"
  if (updates.status) {
    const isCompleted = updates.status.toLowerCase() === "completed";
    if (isCompleted && !updates.completedAt) {
      updates.completedAt = new Date();
    } else if (!isCompleted) {
      updates.completedAt = null;
    }
  }

  const existingTask = await Task.findFirst({
    where: { id: parseInt(req.params.id), ownerId: req.user.id },
  });

  if (!existingTask) throw new ApiError(404, "Task not found");

  const task = await Task.update({
    where: { id: parseInt(req.params.id) },
    data: updates,
    include: {
      relatedLead: { select: { name: true, company: true } },
      relatedContact: { select: { name: true, company: true } },
    }
  });

  await invalidateUserCache(req.user.id);
  res.status(200).json({ success: true, data: task });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const existingTask = await Task.findFirst({
    where: { id: parseInt(req.params.id), ownerId: req.user.id },
  });

  if (!existingTask) throw new ApiError(404, "Task not found");

  await Task.delete({
    where: { id: parseInt(req.params.id) },
  });

  await invalidateUserCache(req.user.id);
  res.status(200).json({ success: true, message: "Task removed" });
});
