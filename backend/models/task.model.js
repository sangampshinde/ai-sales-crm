import { prisma } from '../config/db.js';

export const TASK_STATUSES = ["Pending", "In Progress", "Completed"];
export const TASK_PRIORITIES = ["Low", "Medium", "High"];

// We export the Prisma Task model directly.
export const Task = prisma.task;
export default Task;
