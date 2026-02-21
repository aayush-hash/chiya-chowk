const User = require('../models/User');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

// Send token response
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = user.generateToken();
  const options = {
    expires: new Date(Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      message,
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        email: user.email,
        isActive: user.isActive,
      },
    });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username: username.toLowerCase() }).select('+password');
    if (!user) {
      return next(new AppError('Invalid credentials', 401));
    }

    // Check if account is locked
    if (user.isLocked) {
      const lockTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return next(new AppError(`Account locked. Try again in ${lockTime} minutes.`, 423));
    }

    if (!user.isActive) {
      return next(new AppError('Account deactivated. Contact administrator.', 401));
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      const attemptsLeft = 5 - (user.loginAttempts + 1);
      if (attemptsLeft > 0) {
        return next(new AppError(`Invalid credentials. ${attemptsLeft} attempts remaining.`, 401));
      }
      return next(new AppError('Account locked due to too many failed attempts.', 423));
    }

    // Reset login attempts on success
    if (user.loginAttempts > 0) {
      await user.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info(`User logged in: ${user.username} (${user.role})`);
    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
exports.logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  logger.info(`User logged out: ${req.user?.username}`);
  res.json({ success: true, message: 'Logged out successfully' });
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return next(new AppError('Current and new password required', 400));
    }
    if (newPassword.length < 6) {
      return next(new AppError('New password must be at least 6 characters', 400));
    }

    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(new AppError('Current password is incorrect', 401));
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};