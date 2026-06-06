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
import CancelPremiumPage from './pages/CancelPremiumPage.js';
import ForgotPasswordPage from './pages/ForgotPasswordPage.js';
import ContactPage from './pages/ContactPage.js';
import TermsPage from './pages/TermsPage.js';
import PrivacyPage from './pages/PrivacyPage.js';
import CommercialTransactionPage from './pages/CommercialTransactionPage.js';
import { LanguageProvider } from './i18n.js';

const App = () => {
  return (
    <LanguageProvider>
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
          <Route path="/cancel-premium" element={<CancelPremiumPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/commercial-transaction" element={<CommercialTransactionPage />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;
