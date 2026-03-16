import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'
import ShopDetailLayout from './layouts/ShopDetailLayout'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyPage from './pages/VerifyPage'
import ShopListPage from './pages/ShopListPage'
import CreateShopPage from './pages/CreateShopPage'
import ShopDashboardPage from './pages/shop/ShopDashboardPage'
import ShopImageBotPage from './pages/shop/ShopImageBotPage'
import ShopStoragePage from './pages/shop/ShopStoragePage'
import ShopMarketingPage from './pages/shop/ShopMarketingPage'
import ShopPipelinePage from './pages/shop/ShopPipelinePage'
import ShopEditPage from './pages/shop/ShopEditPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
        </Route>
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ProfilePage />} />
        </Route>
        <Route
          path="/shops"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ShopListPage />} />
          <Route path="create" element={<CreateShopPage />} />
        </Route>
        <Route
          path="/shops/:id"
          element={
            <ProtectedRoute>
              <ShopDetailLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ShopDashboardPage />} />
          <Route path="image-bot" element={<ShopImageBotPage />} />
          <Route path="storage" element={<ShopStoragePage />} />
          <Route path="marketing" element={<ShopMarketingPage />} />
          <Route path="pipeline" element={<ShopPipelinePage />} />
          <Route path="edit" element={<ShopEditPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
