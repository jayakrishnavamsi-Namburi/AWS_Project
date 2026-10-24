import * as examService from '../services/examService.js';
import { logAudit } from '../services/auditService.js';
import { AUDIT_ACTIONS } from '../config/constants.js';

export const createExam = async (req, res, next) => {
  try {
    const exam = await examService.createExam(req.body, req.user._id);

    await logAudit({
      actor: { ...req.user.toJSON(), ipAddress: req.ip, userAgent: req.headers['user-agent'] },
      action: AUDIT_ACTIONS.EXAM_CREATED,
      targetResource: { resourceType: 'Examination', resourceId: exam._id.toString() },
      details: { title: exam.title }
    });

    res.status(201).json({
      success: true,
      message: 'Examination created successfully',
      exam
    });
  } catch (error) {
    next(error);
  }
};

export const getExams = async (req, res, next) => {
  try {
    const result = await examService.getExams(req.user, req.query);
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const getExamById = async (req, res, next) => {
  try {
    const exam = await examService.getExamById(req.params.id, req.user);
    res.status(200).json({
      success: true,
      exam
    });
  } catch (error) {
    next(error);
  }
};

export const updateExam = async (req, res, next) => {
  try {
    const exam = await examService.updateExam(req.params.id, req.body);

    await logAudit({
      actor: { ...req.user.toJSON(), ipAddress: req.ip, userAgent: req.headers['user-agent'] },
      action: AUDIT_ACTIONS.EXAM_UPDATED,
      targetResource: { resourceType: 'Examination', resourceId: exam._id.toString() }
    });

    res.status(200).json({
      success: true,
      message: 'Examination updated successfully',
      exam
    });
  } catch (error) {
    next(error);
  }
};

export const deleteExam = async (req, res, next) => {
  try {
    await examService.deleteExam(req.params.id);

    await logAudit({
      actor: { ...req.user.toJSON(), ipAddress: req.ip, userAgent: req.headers['user-agent'] },
      action: AUDIT_ACTIONS.EXAM_DELETED,
      targetResource: { resourceType: 'Examination', resourceId: req.params.id }
    });

    res.status(200).json({
      success: true,
      message: 'Examination cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const publishExam = async (req, res, next) => {
  try {
    const exam = await examService.publishExam(req.params.id);

    await logAudit({
      actor: { ...req.user.toJSON(), ipAddress: req.ip, userAgent: req.headers['user-agent'] },
      action: AUDIT_ACTIONS.EXAM_PUBLISHED,
      targetResource: { resourceType: 'Examination', resourceId: exam._id.toString() }
    });

    res.status(200).json({
      success: true,
      message: 'Examination published successfully',
      exam
    });
  } catch (error) {
    next(error);
  }
};

export const assignStudents = async (req, res, next) => {
  try {
    const { studentIds } = req.body;
    const exam = await examService.assignStudents(req.params.id, studentIds);
    res.status(200).json({
      success: true,
      message: 'Students assigned to examination successfully',
      exam
    });
  } catch (error) {
    next(error);
  }
};
