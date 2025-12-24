// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SearchPage from "./SearchPage";
import ExamDashboardPage from "./ExamDashboardPage";
import CrossExamInsightsPage from "./CrossExamInsightsPage";
import LoginPage from "./LoginPage";
import SignUpPage from "./SignUpPage";
import SubscriptionPage from "./SubscriptionPage";
import AccountPage from "./AccountPage";
import AdminPanel from "./AdminPanel";
import SubscriptionManagementPage from "./SubscriptionManagementPage";
import ProtectedRoute from "./components/ProtectedRoute";
import "./index.css";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<SearchPage />} />
                <Route path="/exam-dashboard" element={<ExamDashboardPage />} />
                <Route path="/cross-exam-insights" element={<CrossExamInsightsPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route 
                    path="/subscription" 
                    element={
                        <ProtectedRoute>
                            <SubscriptionPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/account" 
                    element={
                        <ProtectedRoute>
                            <AccountPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/admin" 
                    element={
                        <ProtectedRoute>
                            <AdminPanel />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/admin/subscription-management" 
                    element={
                        <ProtectedRoute>
                            <SubscriptionManagementPage />
                        </ProtectedRoute>
                    } 
                />
            </Routes>
        </BrowserRouter>
    );
}
