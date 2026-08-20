import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const connectDB = async () => {
  try {
    // Connect to the PostgreSQL database
    await prisma.$connect();
    console.log('✅ PostgreSQL Connected Successfully (via Prisma)');
  } catch (error) {
    console.error(`❌ Error connecting to PostgreSQL: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

export { prisma, connectDB };
