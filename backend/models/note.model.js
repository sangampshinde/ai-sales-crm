import { prisma } from '../config/db.js';

// We export the Prisma Note model directly. 
// No extensions are needed here because there are no pre-save hooks on the Note model!
export const Note = prisma.note;
export default Note;
