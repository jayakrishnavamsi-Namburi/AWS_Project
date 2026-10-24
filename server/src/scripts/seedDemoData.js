import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { Question } from '../models/Question.js';
import { Examination } from '../models/Examination.js';
import { ROLES, EXAM_STATUS, QUESTION_TYPES } from '../config/constants.js';
import { logger } from '../config/logger.js';

const seedDemoData = async () => {
  try {
    await connectDatabase();

    logger.info('Seeding demo data for SecureProctor platform...');

    // 1. Create Default Users (Admin, Proctor, Student)
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('Password@123', salt);

    const admin = await User.findOneAndUpdate(
      { email: 'admin@secureproctor.com' },
      {
        name: 'Chief Proctor Admin',
        email: 'admin@secureproctor.com',
        passwordHash: defaultPasswordHash,
        role: ROLES.ADMIN,
        status: 'active',
        department: 'Assessment Directorate'
      },
      { upsert: true, new: true }
    );

    const proctor = await User.findOneAndUpdate(
      { email: 'proctor@secureproctor.com' },
      {
        name: 'Invigilator Sarah Connor',
        email: 'proctor@secureproctor.com',
        passwordHash: defaultPasswordHash,
        role: ROLES.PROCTOR,
        status: 'active',
        department: 'Online Examination Oversight'
      },
      { upsert: true, new: true }
    );

    const student1 = await User.findOneAndUpdate(
      { email: 'student1@university.edu' },
      {
        name: 'Alex Mercer',
        email: 'student1@university.edu',
        passwordHash: defaultPasswordHash,
        role: ROLES.STUDENT,
        status: 'active',
        studentId: 'STU-2026-001',
        department: 'Computer Science & Engineering'
      },
      { upsert: true, new: true }
    );

    const student2 = await User.findOneAndUpdate(
      { email: 'student2@university.edu' },
      {
        name: 'Elena Rostova',
        email: 'student2@university.edu',
        passwordHash: defaultPasswordHash,
        role: ROLES.STUDENT,
        status: 'active',
        studentId: 'STU-2026-002',
        department: 'Artificial Intelligence & Robotics'
      },
      { upsert: true, new: true }
    );

    // 2. Create Diverse Question Bank
    const sampleQuestions = [
      {
        text: 'What is the time complexity of searching an element in a balanced Binary Search Tree (AVL / Red-Black)?',
        type: QUESTION_TYPES.MCQ,
        options: [
          { id: 'opt_1', text: 'O(1)', isCorrect: false },
          { id: 'opt_2', text: 'O(log N)', isCorrect: true },
          { id: 'opt_3', text: 'O(N)', isCorrect: false },
          { id: 'opt_4', text: 'O(N log N)', isCorrect: false }
        ],
        marks: 2,
        negativeMarks: 0.5,
        difficulty: 'medium',
        category: 'Data Structures',
        explanation: 'In a balanced binary search tree with N nodes, the maximum height is logarithmic O(log N).',
        createdBy: admin._id
      },
      {
        text: 'Which of the following HTTP status codes indicate client-side errors? (Select all that apply)',
        type: QUESTION_TYPES.MULTIPLE_SELECT,
        options: [
          { id: 'opt_1', text: '400 Bad Request', isCorrect: true },
          { id: 'opt_2', text: '401 Unauthorized', isCorrect: true },
          { id: 'opt_3', text: '500 Internal Server Error', isCorrect: false },
          { id: 'opt_4', text: '403 Forbidden', isCorrect: true },
          { id: 'opt_5', text: '502 Bad Gateway', isCorrect: false }
        ],
        marks: 3,
        negativeMarks: 1,
        difficulty: 'medium',
        category: 'Computer Networks',
        explanation: '4xx status codes are client errors, while 5xx codes indicate server-side failures.',
        createdBy: admin._id
      },
      {
        text: 'In Node.js event loop, process.nextTick() callbacks run before setTimeout() callbacks of the next event loop phase.',
        type: QUESTION_TYPES.TRUE_FALSE,
        options: [
          { id: 'true', text: 'True', isCorrect: true },
          { id: 'false', text: 'False', isCorrect: false }
        ],
        marks: 1,
        negativeMarks: 0.25,
        difficulty: 'easy',
        category: 'Node.js Architecture',
        explanation: 'process.nextTick queue is processed immediately after the current operation finishes, before timers.',
        createdBy: admin._id
      },
      {
        text: 'What is the standard protocol name used in WebRTC for establishing direct peer-to-peer media connectivity through NATs?',
        type: QUESTION_TYPES.SHORT_ANSWER,
        shortAnswerAcceptedAnswers: ['ICE', 'Interactive Connectivity Establishment', 'STUN/TURN'],
        marks: 2,
        negativeMarks: 0,
        difficulty: 'hard',
        category: 'Distributed Systems',
        explanation: 'ICE (Interactive Connectivity Establishment) coordinates candidate discovery via STUN and TURN.',
        createdBy: admin._id
      },
      {
        text: 'Which cryptographic algorithm is primarily used for hashing passwords securely with adaptive work factors?',
        type: QUESTION_TYPES.MCQ,
        options: [
          { id: 'opt_1', text: 'MD5', isCorrect: false },
          { id: 'opt_2', text: 'SHA-1', isCorrect: false },
          { id: 'opt_3', text: 'bcrypt / Argon2', isCorrect: true },
          { id: 'opt_4', text: 'RC4', isCorrect: false }
        ],
        marks: 2,
        negativeMarks: 0.5,
        difficulty: 'medium',
        category: 'Cybersecurity',
        explanation: 'bcrypt and Argon2 incorporate adaptive salt and key derivation work factors to thwart brute force.',
        createdBy: admin._id
      }
    ];

    const createdQuestions = [];
    for (const q of sampleQuestions) {
      const existing = await Question.findOne({ text: q.text });
      if (!existing) {
        const created = await Question.create(q);
        createdQuestions.push(created);
      } else {
        createdQuestions.push(existing);
      }
    }

    // 3. Create Sample Exams
    const now = new Date();
    const startTime = new Date(now.getTime() - 10 * 60 * 1000); // started 10m ago
    const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days window

    await Examination.findOneAndUpdate(
      { title: 'National Technical Assessment 2026 — General CS & Security' },
      {
        title: 'National Technical Assessment 2026 — General CS & Security',
        description: 'Comprehensive computer science benchmark examination proctored with AI computer vision and browser telemetry.',
        instructions: '1. Maintain a single face in full webcam view.\n2. Do not leave fullscreen mode or switch browser tabs.\n3. Mobile camera pairing is optional but recommended.\n4. Autosave saves each answer automatically.',
        schedule: { startTime, endTime },
        durationMinutes: 45,
        totalMarks: createdQuestions.reduce((sum, q) => sum + q.marks, 0),
        passingScore: 5,
        questions: createdQuestions.map((q) => q._id),
        questionRandomization: true,
        optionRandomization: true,
        negativeMarkingEnabled: true,
        maxAttempts: 2,
        proctoringPolicy: {
          webcamRequired: true,
          audioRequired: true,
          mobileCameraRequired: false,
          fullscreenRequired: true,
          tabBlurTolerance: 3,
          warningThreshold: 3,
          autoSubmitThreshold: 5
        },
        publicationSettings: {
          isPublished: true,
          resultReleasePolicy: 'immediate'
        },
        assignedStudents: [student1._id, student2._id],
        createdBy: admin._id,
        status: EXAM_STATUS.PUBLISHED
      },
      { upsert: true, new: true }
    );

    logger.info('================================================');
    logger.info(' Demo Database Seed Completed Successfully!');
    logger.info(' Credentials for testing:');
    logger.info(' Admin:   admin@secureproctor.com   | Password: Password@123');
    logger.info(' Proctor: proctor@secureproctor.com | Password: Password@123');
    logger.info(' Student: student1@university.edu   | Password: Password@123');
    logger.info(' Student: student2@university.edu   | Password: Password@123');
    logger.info('================================================');

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error(`Seed failed: ${error.message}`);
    await disconnectDatabase();
    process.exit(1);
  }
};

seedDemoData();
