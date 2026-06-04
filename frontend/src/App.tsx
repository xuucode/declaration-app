import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.js';
import RegisterPage from './pages/RegisterPage.js';
import MyPage from './pages/MyPage.js';
import DeclarationPage from './pages/DeclarationPage.js';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/declarations/:id" element={<DeclarationPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;