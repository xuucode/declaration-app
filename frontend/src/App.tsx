import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.js';
import RegisterPage from './pages/RegisterPage.js';
import MyPage from './pages/MyPage.js';
import DeclarationPage from './pages/DeclarationPage.js';
import HabitsPage from './pages/HabitsPage.js';
import ExpensesPage from './pages/ExpensesPage.js';
import TasksPage from './pages/TasksPage.js';
import TaskHistoryPage from './pages/TaskHistoryPage.js';
import ProfilePage from './pages/ProfilePage.js';
import ForgotPasswordPage from './pages/ForgotPasswordPage.js';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/habits" element={<HabitsPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/declarations/:id" element={<DeclarationPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/history" element={<TaskHistoryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;