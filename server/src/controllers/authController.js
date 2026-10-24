import * as authService from '../services/authService.js';
import { logAudit } from '../services/auditService.js';
import { AUDIT_ACTIONS } from '../config/constants.js';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export const register = async (req, res, next) => {
  try {
    const { user, token } = await authService.registerUser(req.body);
    res.cookie('token', token, cookieOptions);

    await logAudit({
      actor: { ...user.toJSON(), ipAddress: req.ip, userAgent: req.headers['user-agent'] },
      action: AUDIT_ACTIONS.USER_REGISTER,
      targetResource: { resourceType: 'User', resourceId: user._id.toString() }
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user,
      token
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { user, token } = await authService.loginUser(req.body);
    res.cookie('token', token, cookieOptions);

    await logAudit({
      actor: { ...user.toJSON(), ipAddress: req.ip, userAgent: req.headers['user-agent'] },
      action: AUDIT_ACTIONS.USER_LOGIN,
      targetResource: { resourceType: 'User', resourceId: user._id.toString() }
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user,
      token
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie('token');
    if (req.user) {
      await logAudit({
        actor: { ...req.user.toJSON(), ipAddress: req.ip, userAgent: req.headers['user-agent'] },
        action: AUDIT_ACTIONS.USER_LOGOUT,
        targetResource: { resourceType: 'User', resourceId: req.user._id.toString() }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.requestPasswordReset(req.body.email);
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};
