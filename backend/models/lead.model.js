import { prisma } from '../config/db.js';

// We export these constants so your tutorial code (controllers/routes) 
// can import them just like the original Mongoose file did.
export const LEAD_STATUSES = ["New", "Qualified", "Proposal", "Won", "Lost"];
export const LEAD_PRIORITIES = ["Low", "Medium", "High"];

// We export the Prisma Lead model directly. 
// No extensions are needed here because there are no pre-save hooks on the Lead model in the tutorial!
const Lead = prisma.lead;
export default Lead;
