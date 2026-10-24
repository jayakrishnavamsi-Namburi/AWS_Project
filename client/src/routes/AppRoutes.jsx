import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';

// Public Pages
import {
  Landing,
  Features,
  Login,
  Register,
  ForgotPassword,
  ResetPassword,
  Unauthorized,
  NotFound
} from '../pages/public';

// Student Pages
import {
  StudentDashboard,
  AvailableExams,
  ExamInstructions,
  DeviceCheck,
  LiveExamInterface,
  ExamResult
} from '../pages/student';

// Admin Pages
import {
  AdminDashboard,
  ExamManagement,
  ExamEditor,
  QuestionBank,
  StudentManagement,
  LiveSessionMonitor,
  AnalyticsReport
} from '../pages/admin';

// Proctor Pages
import { ProctorDashboard } from '../pages/proctor/ProctorDashboard';

// Mobile Page
import { MobileCameraBroadcaster } from '../pages/mobile/MobileCameraBroadcaster';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Standalone Pages (No default layout) */}
      <Route path="/mobile-camera/:token" element={<MobileCameraBroadcaster />} />
      <Route path="/student/exams/:id/live/:sessionId" element={
        <ProtectedRoute allowedRoles={['student', 'admin']}>
          <LiveExamInterface />
        </ProtectedRoute>
      } />

      {/* Pages with Standard Layout */}
      <Route element={<Layout />}>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/features" element={<Features />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Student Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['student', 'admin']} />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/exams" element={<AvailableExams />} />
          <Route path="/student/exams/:id/instructions" element={<ExamInstructions />} />
          <Route path="/student/exams/:id/device-check" element={<DeviceCheck />} />
          <Route path="/student/results/:id" element={<ExamResult />} />
          <Route path="/student/results" element={<StudentDashboard />} />
        </Route>

        {/* Admin Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/exams" element={<ExamManagement />} />
          <Route path="/admin/exams/new" element={<ExamEditor />} />
          <Route path="/admin/exams/:id/edit" element={<ExamEditor />} />
          <Route path="/admin/questions" element={<QuestionBank />} />
          <Route path="/admin/students" element={<StudentManagement />} />
          <Route path="/admin/live-monitor" element={<LiveSessionMonitor />} />
          <Route path="/admin/analytics" element={<AnalyticsReport />} />
        </Route>

        {/* Proctor Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['proctor', 'admin']} />}>
          <Route path="/proctor/dashboard" element={<ProctorDashboard />} />
        </Route>

        {/* 404 Catch-All */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};
