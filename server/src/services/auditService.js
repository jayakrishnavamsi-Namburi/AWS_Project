import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../config/logger.js';

export const logAudit = async ({ actor, action, targetResource, details = {} }) => {
  try {
    const log = await AuditLog.create({
      actor: {
        userId: actor?._id || actor?.id,
        name: actor?.name,
        email: actor?.email,
        role: actor?.role,
        ipAddress: actor?.ipAddress,
        userAgent: actor?.userAgent
      },
      action,
      targetResource,
      details,
      timestamp: new Date()
    });
    return log;
  } catch (error) {
    logger.error(`Failed to record audit log: ${error.message}`);
    return null;
  }
};
