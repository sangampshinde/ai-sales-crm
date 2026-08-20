import { prisma } from '../config/db.js';
import bcrypt from 'bcryptjs';

// In Prisma, we use "Client Extensions" to add features like password hashing 
// (which Mongoose handles with pre-save hooks) and custom instance methods.
const extendedPrisma = prisma.$extends({
  query: {
    user: {
      // Hash password before creating a user
      async create({ args, query }) {
        if (args.data.password) {
          const salt = await bcrypt.genSalt(10);
          args.data.password = await bcrypt.hash(args.data.password, salt);
        }
        return query(args);
      },
      // Hash password before updating a user's password
      async update({ args, query }) {
        if (args.data.password) {
          const salt = await bcrypt.genSalt(10);
          args.data.password = await bcrypt.hash(args.data.password, salt);
        }
        return query(args);
      },
    },
  },
  result: {
    user: {
      // Add the matchPassword method to all returned User objects
      matchPassword: {
        needs: { password: true },
        compute(user) {
          return async (enteredPassword) => {
            return await bcrypt.compare(enteredPassword, user.password);
          };
        },
      },
    },
  },
});

// Export the extended User model so controllers can use it.
const User = extendedPrisma.user;

export default User;
