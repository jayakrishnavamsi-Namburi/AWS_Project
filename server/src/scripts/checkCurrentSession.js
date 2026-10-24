import 'dotenv/config';
import mongoose from 'mongoose';
import { ExamSession } from '../models/ExamSession.js';

const SESSION_ID = '6ac9e738a4ab249b82b17ac9';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const session = await ExamSession.findById(SESSION_ID).lean();

  if (!session) {
    console.log('Session not found.');
    return;
  }

  const now = new Date();

  console.log({
    sessionId: String(session._id),
    status: session.status,
    attemptNumber: session.attemptNumber,
    startTime: session.startTime,
    serverDeadline: session.serverDeadline,
    currentTime: now,
    expired: new Date(session.serverDeadline) <= now
  });
}

main()
  .catch(error => console.error(error))
  .finally(() => mongoose.disconnect());
