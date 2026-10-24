import { Examination } from '../models/Examination.js';
import { Question } from '../models/Question.js';
import { EXAM_STATUS, ROLES } from '../config/constants.js';

export const createExam = async (data, userId) => {
  let calculatedMarks = 0;
  if (data.questions && data.questions.length > 0) {
    const questions = await Question.find({ _id: { $in: data.questions } });
    calculatedMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
  }

  return Examination.create({
    ...data,
    totalMarks: data.totalMarks || calculatedMarks,
    createdBy: userId
  });
};

export const getExams = async (user, { status, search, page = 1, limit = 20 }) => {
  const filter = {};

  if (user.role === ROLES.STUDENT) {
    filter.status = EXAM_STATUS.PUBLISHED;
    filter.$or = [
      { assignedStudents: { $exists: false } },
      { assignedStudents: { $size: 0 } },
      { assignedStudents: user._id }
    ];
  } else if (status) {
    filter.status = status;
  }

  if (search) {
    filter.title = { $regex: search, $options: 'i' };
  }

  const skip = (page - 1) * limit;
  const [exams, total] = await Promise.all([
    Examination.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Examination.countDocuments(filter)
  ]);

  return {
    exams,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

export const getExamById = async (id, user) => {
  const exam = await Examination.findById(id)
    .populate('createdBy', 'name email')
    .populate('assignedStudents', 'name email studentId department');

  if (!exam) {
    const error = new Error('Examination not found');
    error.statusCode = 404;
    throw error;
  }

  if (user.role === ROLES.STUDENT) {
    if (exam.status !== EXAM_STATUS.PUBLISHED) {
      const error = new Error('This examination is not currently available.');
      error.statusCode = 403;
      throw error;
    }
    if (
      exam.assignedStudents &&
      exam.assignedStudents.length > 0 &&
      !exam.assignedStudents.some((s) => s._id.toString() === user._id.toString())
    ) {
      const error = new Error('You are not assigned to take this examination.');
      error.statusCode = 403;
      throw error;
    }
  }

  return exam;
};

export const updateExam = async (id, updateData) => {
  if (updateData.questions && updateData.questions.length > 0) {
    const questions = await Question.find({ _id: { $in: updateData.questions } });
    updateData.totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
  }

  const exam = await Examination.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  if (!exam) {
    const error = new Error('Examination not found');
    error.statusCode = 404;
    throw error;
  }
  return exam;
};

export const deleteExam = async (id) => {
  const exam = await Examination.findByIdAndUpdate(id, { status: EXAM_STATUS.CANCELLED }, { new: true });
  if (!exam) {
    const error = new Error('Examination not found');
    error.statusCode = 404;
    throw error;
  }
  return exam;
};

export const publishExam = async (id) => {
  const exam = await Examination.findById(id);
  if (!exam) {
    const error = new Error('Examination not found');
    error.statusCode = 404;
    throw error;
  }

  if (!exam.questions || exam.questions.length === 0) {
    const error = new Error('Cannot publish an examination without any questions.');
    error.statusCode = 400;
    throw error;
  }

  exam.status = EXAM_STATUS.PUBLISHED;
  exam.publicationSettings.isPublished = true;
  await exam.save();
  return exam;
};

export const assignStudents = async (id, studentIds) => {
  const exam = await Examination.findByIdAndUpdate(
    id,
    { $addToSet: { assignedStudents: { $each: studentIds } } },
    { new: true }
  ).populate('assignedStudents', 'name email studentId');

  if (!exam) {
    const error = new Error('Examination not found');
    error.statusCode = 404;
    throw error;
  }
  return exam;
};
