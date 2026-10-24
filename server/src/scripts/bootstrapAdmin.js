import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { ROLES } from '../config/constants.js';
import bcrypt from 'bcryptjs';
import { logger } from '../config/logger.js';

const bootstrapAdmin = async () => {
  try {
    await connectDatabase();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@secureproctor.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const adminName = process.env.ADMIN_NAME || 'System Administrator';

    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingAdmin) {
      logger.info(`Administrator already exists with email: ${adminEmail}`);
      await disconnectDatabase();
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    const admin = await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      passwordHash,
      role: ROLES.ADMIN,
      status: 'active',
      department: 'Security & Assessment Governance'
    });

    logger.info(`================================================`);
    logger.info(` Administrator Account Successfully Initialized:`);
    logger.info(` ID:       ${admin._id}`);
    logger.info(` Email:    ${admin.email}`);
    logger.info(` Password: ${adminPassword}`);
    logger.info(` Role:     ${admin.role}`);
    logger.info(` IMPORTANT: Change this password upon initial production login.`);
    logger.info(`================================================`);

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error(`Failed to bootstrap admin: ${error.message}`);
    await disconnectDatabase();
    process.exit(1);
  }
};

bootstrapAdmin();
