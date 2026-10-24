
import 'dotenv/config';
import mongoose from 'mongoose';
import { ExamSession } from '../models/ExamSession.js';
import { Examination } from '../models/Examination.js';

const STUDENT_ID = '6ac9e1aa3182884502ea3fa0';
const EXAM_ID = '6ac9daed16cc12b5fc68d6b5';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('Database:', mongoose.connection.name);

  const exam = await Examination.findById(EXAM_ID).lean();
  console.log('Exam exists:', !!exam);

  const sessions = await ExamSession.find({
    studentId: STUDENT_ID,
    examId: EXAM_ID
  })
    .select('_id status attemptNumber serverDeadline')
    .lean();

  console.log('Matching sessions:', sessions.length);
  console.dir(sessions, { depth: null });

  const studentSessions = await ExamSession.find({
    studentId: STUDENT_ID
  })
    .select('_id examId status attemptNumber')
    .lean();

  console.log('All sessions for student:', studentSessions.length);
  console.dir(studentSessions, { depth: null });
}

main()
  .catch((error) => console.error('Diagnostic failed:', error.message))
  .finally(async () => {
    await mongoose.disconnect();
  });
