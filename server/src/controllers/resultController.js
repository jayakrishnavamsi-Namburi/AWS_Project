import { Result } from '../models/Result.js';
import { ROLES } from '../config/constants.js';

export const getResults = async (req, res, next) => {
  try {
    const { examId, studentId, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.role === ROLES.STUDENT) {
      filter.studentId = req.user._id;
    } else {
      if (studentId) filter.studentId = studentId;
    }

    if (examId) filter.examId = examId;

    const skip = (page - 1) * limit;
    const [results, total] = await Promise.all([
      Result.find(filter)
        .populate('examId', 'title schedule durationMinutes totalMarks passingScore')
        .populate('studentId', 'name email studentId department')
        .sort({ evaluatedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Result.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      results,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getResultById = async (req, res, next) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate('examId', 'title schedule durationMinutes totalMarks passingScore publicationSettings')
      .populate('studentId', 'name email studentId department');

    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    if (req.user.role === ROLES.STUDENT) {
      if (result.studentId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized access to result' });
      }

      // If exam publication setting is not yet published, hide detailed breakdown
      if (!result.isPublished) {
        return res.status(200).json({
          success: true,
          result: {
            _id: result._id,
            examId: result.examId,
            status: 'pending_release',
            message: 'Results will be published after review by the administrator.'
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    next(error);
  }
};

export const getExamResults = async (req, res, next) => {
  try {
    const { id: examId } = req.params;
    const results = await Result.find({ examId })
      .populate('studentId', 'name email studentId department')
      .sort({ totalScore: -1 });

    res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    next(error);
  }
};
