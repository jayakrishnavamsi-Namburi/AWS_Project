import * as analyticsService from '../services/analyticsService.js';

export const getAdminStats = async (req, res, next) => {
  try {
    const stats = await analyticsService.getAdminDashboardStats();
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
};

export const getExamAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getExamAnalytics(req.params.id);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const exportExamCSV = async (req, res, next) => {
  try {
    const csvContent = await analyticsService.exportExamResultsCSV(req.params.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="exam_${req.params.id}_results.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
