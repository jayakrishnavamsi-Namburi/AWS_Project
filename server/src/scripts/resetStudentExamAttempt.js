
import 'dotenv/config';
import mongoose from 'mongoose';
import { ExamSession } from '../models/ExamSession.js';

const STUDENT_ID = '6ac9e1aa3182884502ea3fa0';
const EXAM_ID = '6ac9daed16cc12b5fc68d6b5';
const SESSION_ID = '6ac9e1b63182884502ea3fbc';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const session = await ExamSession.findById(SESSION_ID).lean();

  console.log('Session exists:', !!session);

  if (session) {
    console.log({
      sessionId: String(session._id),
      studentId: String(session.studentId),
      examId: String(session.examId),
      status: session.status,
      attemptNumber: session.attemptNumber
    });

    console.log('Student matches:', String(session.studentId) === STUDENT_ID);
    console.log('Exam matches:', String(session.examId) === EXAM_ID);
    console.log('Status is completed:', session.status === 'completed');
  }
}

main()
  .catch((error) => console.error('Diagnostic failed:', error.message))
  .finally(async () => {
    await mongoose.disconnect();
  });
