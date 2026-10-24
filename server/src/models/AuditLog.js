import mongoose from 'mongoose';
import { AUDIT_ACTIONS } from '../config/constants.js';

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String,
      email: String,
      role: String,
      ipAddress: String,
      userAgent: String
    },
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTIONS),
      required: true
    },
    targetResource: {
      resourceType: String,
      resourceId: String
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ 'actor.userId': 1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
