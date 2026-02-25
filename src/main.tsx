import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.tsx";
import { LoginPage } from "./components/LoginPage.tsx";
import { RegistrationPage } from "./components/RegistrationPage.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import { EmployeePortalPage } from "./pages/EmployeePortalPage.tsx";
import { TermsOfServicePage } from "./pages/TermsOfServicePage.tsx";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { UserRole } from "./types/auth.ts";
import { initSentry } from "./config/sentry.ts";
import "./index.css";

// Initialize Sentry error monitoring
initSentry();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />

          {/* Protected routes */}
          <Route
            path="/employee-portal"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.EMPLOYEE]}>
                <EmployeePortalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
                <App />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
);