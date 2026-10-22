const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate signed JWT token
 */
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'stitchsmart_secret_jwt_key_2026_dev_auth_secure',
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

/**
 * Helper to send HttpOnly cookie with JWT token and safe user payload
 */
const sendTokenResponse = (user, statusCode, res, message) => {
  const token = generateToken(user._id, user.role);

  const cookieExpireDays = parseInt(process.env.COOKIE_EXPIRES_DAYS, 10) || 30;
  const cookieOptions = {
    expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      message,
      token, // Available for Bearer token fallback & API testing
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        createdAt: user.createdAt
      }
    });
};

/**
 * @desc    Register a new customer account
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    // SECURITY: Public registration ALWAYS creates a customer account.
    // Never allow a user to become an admin via public registration body.
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      password,
      role: 'customer' // Enforced server-side
    });

    sendTokenResponse(user, 201, res, 'Customer account registered successfully');
  } catch (error) {
    console.error(`[Register Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email and password presence
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email and explicitly include password for comparison
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    console.error(`[Login Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

/**
 * @desc    Get currently logged in user profile
 * @route   GET /api/auth/me
 * @access  Private (Requires authentication)
 */
const getMe = async (req, res) => {
  try {
    // req.user is set by the protect middleware
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error(`[GetMe Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving user profile'
    });
  }
};

/**
 * @desc    Log out user & clear authentication cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = async (req, res) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 5 * 1000),
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    res.clearCookie('token', {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error(`[Logout Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

/**
 * @desc    Admin-only verification route (for role authorization testing)
 * @route   GET /api/auth/admin-check
 * @access  Private (Admin only)
 */
const adminCheck = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted. Welcome to the Admin Management Area.',
    user: req.user
  });
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  adminCheck
};
