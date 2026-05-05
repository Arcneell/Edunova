import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import AppShell from './components/AppShell.jsx'
import { RequireAuth } from './components/RequireAuth.jsx'
import { RequireAdminOrTrainer, RequireStaff } from './components/RequireStaff.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Compte from './pages/Compte.jsx'
import CourseMap from './pages/CourseMap.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminUsers from './pages/AdminUsers.jsx'
import AdminCourses from './pages/AdminCourses.jsx'
import AdminLogs from './pages/AdminLogs.jsx'
import AdminQuizzes from './pages/AdminQuizzes.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/compte"
          element={
            <RequireAuth>
              <Compte />
            </RequireAuth>
          }
        />
        <Route
          path="/courses/ma-thematiques"
          element={
            <RequireAuth>
              <CourseMap />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdminOrTrainer>
              <AdminDashboard />
            </RequireAdminOrTrainer>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireStaff>
              <AdminUsers />
            </RequireStaff>
          }
        />
        <Route
          path="/admin/cours"
          element={
            <RequireAdminOrTrainer>
              <AdminCourses />
            </RequireAdminOrTrainer>
          }
        />
        <Route
          path="/admin/quizz"
          element={
            <RequireAdminOrTrainer>
              <AdminQuizzes />
            </RequireAdminOrTrainer>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <RequireStaff>
              <AdminLogs />
            </RequireStaff>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
