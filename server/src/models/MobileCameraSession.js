import mongoose from 'mongoose';

const mobileCameraSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamSession',
      required: true,
      unique: true
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Examination',
      required: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    pairingToken: {
      type: String,
      required: true,
      unique: true
    },
    tokenExpiresAt: {
      type: Date,
      required: true
    },
    connectionState: {
      type: String,
      enum: ['pending', 'connected', 'disconnected', 'expired'],
      default: 'pending'
    },
    mobileSocketId: {
      type: String
    },
    deviceInfo: {
      userAgent: String,
      ipAddress: String,
      screenResolution: String
    },
    pairedAt: {
      type: Date
    },
    disconnectedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

mobileCameraSessionSchema.index({ tokenExpiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup

export const MobileCameraSession = mongoose.model('MobileCameraSession', mobileCameraSessionSchema);
