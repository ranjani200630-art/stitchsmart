const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables from server/.env if available
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');

/**
 * Safe Admin Seeding Script for StitchSmart
 *
 * Requirements:
 * - Reads ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE from environment variables
 * - Validates required fields and password length (minimum 6 characters)
 * - Uses existing User model and bcryptjs pre-save password hashing hook
 * - Safe & idempotent: creates admin if not exists, or ensures role is admin if exists
 * - Never prints or leaks passwords in logs
 */
const seedAdmin = async () => {
  console.log('----------------------------------------------------');
  console.log('[StitchSmart Seed] Initializing Admin Account Seed...');
  console.log('----------------------------------------------------');

  const adminName = process.env.ADMIN_NAME ? process.env.ADMIN_NAME.trim() : 'StitchSmart Admin';
  const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim() : '';
  const adminPassword = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD : '';
  const adminPhone = process.env.ADMIN_PHONE ? process.env.ADMIN_PHONE.trim() : '';

  // Validate presence of credentials
  if (!adminEmail || !adminPassword) {
    console.error('[StitchSmart Seed Error] Missing required admin credentials.');
    console.error('Please configure the following environment variables in server/.env:');
    console.error('  ADMIN_EMAIL=your_admin_email@example.com');
    console.error('  ADMIN_PASSWORD=your_secure_password (minimum 6 characters)');
    console.error('  ADMIN_NAME="Master Tailor" (optional)');
    console.error('  ADMIN_PHONE="+91 9876543210" (optional)');
    console.error('----------------------------------------------------');
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const normalizedEmail = adminEmail.toLowerCase();
  if (!emailRegex.test(normalizedEmail)) {
    console.error(`[StitchSmart Seed Error] '${adminEmail}' is not a valid email address.`);
    process.exit(1);
  }

  // Validate password length
  if (adminPassword.length < 6) {
    console.error('[StitchSmart Seed Error] ADMIN_PASSWORD must be at least 6 characters long.');
    process.exit(1);
  }

  try {
    // Connect to database using existing connection configuration
    const conn = await connectDB();
    if (!conn) {
      console.error('[StitchSmart Seed Error] Database connection failed. Aborting admin seeding.');
      process.exit(1);
    }

    // Check if account already exists
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log(`[StitchSmart Seed] Admin account already exists for '${normalizedEmail}'.`);
        console.log(`[StitchSmart Seed] User ID: ${existingUser._id}`);
        console.log(`[StitchSmart Seed] Role: ${existingUser.role}`);
        console.log('[StitchSmart Seed] No changes were needed.');
      } else {
        // Upgrade existing user to admin role
        existingUser.role = 'admin';
        if (adminName && adminName !== 'StitchSmart Admin') {
          existingUser.name = adminName;
        }
        await existingUser.save();
        console.log(`[StitchSmart Seed] Existing account '${normalizedEmail}' was successfully upgraded to 'admin' role.`);
        console.log(`[StitchSmart Seed] User ID: ${existingUser._id}`);
      }
    } else {
      // Create new admin user
      // Note: password is automatically hashed by User model's pre('save') hook using bcryptjs
      const newAdmin = new User({
        name: adminName,
        email: normalizedEmail,
        phone: adminPhone,
        password: adminPassword,
        role: 'admin'
      });

      const savedAdmin = await newAdmin.save();

      console.log(`[StitchSmart Seed] Successfully created new Admin/Tailor account!`);
      console.log(`[StitchSmart Seed] Name:    ${savedAdmin.name}`);
      console.log(`[StitchSmart Seed] Email:   ${savedAdmin.email}`);
      console.log(`[StitchSmart Seed] Role:    ${savedAdmin.role}`);
      console.log(`[StitchSmart Seed] User ID: ${savedAdmin._id}`);
    }

    console.log('----------------------------------------------------');
    console.log('[StitchSmart Seed] Admin seeding completed successfully.');
    console.log('----------------------------------------------------');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`[StitchSmart Seed Error] Failed to seed admin user: ${error.message}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

// Execute script
seedAdmin();
