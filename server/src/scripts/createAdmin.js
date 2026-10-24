
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { ROLES } from '../config/constants.js';

const run = async () => {
  try {
    await mongoose.connect(config.mongoUri);

    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || 'SecureProctor Admin';

    if (!email || !password) {
      throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD first.');
    }

    const existing = await User.findOne({ email });

    if (existing) {
      console.log(
        `Account already exists with role: ${existing.role}. No changes made.`
      );
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      passwordHash,
      role: ROLES.ADMIN,
      status: 'active'
    });

    console.log(`Admin created successfully: ${email}`);
  } catch (error) {
    console.error('Admin creation failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
