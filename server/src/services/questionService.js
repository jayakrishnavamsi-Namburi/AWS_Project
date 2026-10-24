import { Question } from '../models/Question.js';

export const createQuestion = async (data, userId) => {
  return Question.create({
    ...data,
    createdBy: userId
  });
};

export const getQuestions = async ({ category, difficulty, type, search, page = 1, limit = 20 }) => {
  const filter = { isActive: true };
  if (category) filter.category = category;
  if (difficulty) filter.difficulty = difficulty;
  if (type) filter.type = type;
  if (search) {
    filter.text = { $regex: search, $options: 'i' };
  }

  const skip = (page - 1) * limit;
  const [questions, total] = await Promise.all([
    Question.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Question.countDocuments(filter)
  ]);

  return {
    questions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

export const getQuestionById = async (id) => {
  const question = await Question.findById(id).populate('createdBy', 'name email');
  if (!question) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }
  return question;
};

export const updateQuestion = async (id, updateData) => {
  const question = await Question.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  if (!question) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }
  return question;
};

export const deleteQuestion = async (id) => {
  const question = await Question.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!question) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }
  return question;
};
