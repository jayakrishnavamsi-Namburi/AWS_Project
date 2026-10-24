import mongoose from 'mongoose';

const videoChunkSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamSession',
      required: true
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
    storageKey: {
      type: String,
      required: true
    },
    relativePath: {
      type: String,
      required: true
    },
    chunkSequence: {
      type: Number,
      required: true
    },
    contentType: {
      type: String,
      default: 'video/webm'
    },
    sizeBytes: {
      type: Number,
      required: true
    },
    checksum: {
      type: String
    },
    uploadTimestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

videoChunkSchema.index({ sessionId: 1, chunkSequence: 1 });

export const VideoChunk = mongoose.model('VideoChunk', videoChunkSchema);
