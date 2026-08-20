import { prisma } from '../config/db.js';

// We export the Prisma Contact model directly. 
// No extensions are needed here because there are no pre-save hooks on the Contact model!
export const Contact = prisma.contact;
export default Contact;
