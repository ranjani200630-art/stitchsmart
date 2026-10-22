const mongoose = require('mongoose');
const Profile = require('../models/Profile');
const User = require('../models/User');

/**
 * @desc    Get authenticated customer's profile
 * @route   GET /api/profile/me
 * @access  Private (Authenticated User)
 */
const getMyProfile = async (req, res) => {
  try {
    let profile = await Profile.findOne({ user: req.user._id });

    // If profile does not exist yet, seed initial profile from registered User record
    if (!profile) {
      profile = await Profile.create({
        user: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone || '',
        address: ''
      });
    }

    return res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    console.error(`[Get Profile Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving profile',
      error: error.message
    });
  }
};

/**
 * @desc    Create or update authenticated customer's profile
 * @route   PUT /api/profile/me
 * @access  Private (Authenticated User)
 */
const updateMyProfile = async (req, res) => {
  try {
    // Explicitly whitelist only allowed fields to prevent mass assignment of role, user, _id
    const { name, email, phone, address } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot be empty'
      });
    }

    let normalizedEmail = req.user.email;
    if (email !== undefined) {
      if (!email.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Email cannot be empty'
        });
      }
      normalizedEmail = email.toLowerCase().trim();
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }

      // If email is changing, verify it is not already taken by another user
      if (normalizedEmail !== req.user.email) {
        const existingEmail = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: req.user._id }
        });
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: 'Email is already in use by another account'
          });
        }
      }
    }

    // Build update object
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = normalizedEmail;
    if (phone !== undefined) updateData.phone = phone.trim();
    if (address !== undefined) updateData.address = address.trim();

    // Upsert profile
    const profile = await Profile.findOneAndUpdate(
      { user: req.user._id },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    // Keep User model in sync for common fields (name, email, phone)
    const userUpdates = {};
    if (name !== undefined) userUpdates.name = name.trim();
    if (email !== undefined) userUpdates.email = normalizedEmail;
    if (phone !== undefined) userUpdates.phone = phone.trim();
    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(req.user._id, { $set: userUpdates });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile
    });
  } catch (error) {
    console.error(`[Update Profile Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error updating profile',
      error: error.message
    });
  }
};

/**
 * @desc    Get customer profile by ID (Admin / Tailor access)
 * @route   GET /api/profile/customer/:customerId
 * @access  Private (Admin only)
 */
const getCustomerProfileById = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID format'
      });
    }

    let profile = await Profile.findOne({ user: customerId });

    if (!profile) {
      // Check if user exists but has no profile document yet
      const user = await User.findById(customerId).select('-password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      profile = {
        user: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: ''
      };
    }

    return res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    console.error(`[Admin Get Profile Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving customer profile',
      error: error.message
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getCustomerProfileById
};
