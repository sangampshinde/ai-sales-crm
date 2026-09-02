import { prisma } from '../config/db.js';

export const LEAD_STATUSES = ["New", "Qualified", "Proposal", "Won", "Lost"];
export const LEAD_PRIORITIES = ["Low", "Medium", "High"];

const Lead = prisma.lead;
export default Lead;
