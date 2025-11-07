import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.tsx";
import { LoginPage } from "./components/LoginPage.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import { EmployeePortalPage } from "./pages/EmployeePortalPage.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { UserRole } from "./types/auth.ts";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
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
);