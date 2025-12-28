// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import SearchPage from "./SearchPage";
import ExamDashboardPage from "./ExamDashboardPage";
import CrossExamInsightsPage from "./CrossExamInsightsPage";
import TopicWisePYQPage from "./TopicWisePYQPage";
import LoginPage from "./LoginPage";
import SignUpPage from "./SignUpPage";
import SubscriptionPage from "./SubscriptionPage";
import AccountPage from "./AccountPage";
import AdminPanel from "./AdminPanel";
import SubscriptionManagementPage from "./SubscriptionManagementPage";
import ProtectedRoute from "./components/ProtectedRoute";
import PremiumProtectedRoute from "./components/PremiumProtectedRoute";
import MyNotesPage from "./pages/MyNotesPage";
import AIRoadmapPage from "./AIRoadmapPage";
import ToastContainer, { useToast } from "./components/ToastContainer";
import "./index.css";

// Global toast context
let globalToast = null;

export const setGlobalToast = (toastFn) => {
    globalToast = toastFn;
};

export const showToast = (message, type = "success", duration = 3000) => {
    if (globalToast) {
        return globalToast(message, type, duration);
    }
    console.log(`[Toast] ${type}: ${message}`);
};

function AppContent() {
    const { showToast, removeToast, toasts } = useToast();
    
    // Set global toast function
    useEffect(() => {
        setGlobalToast(showToast);
        return () => setGlobalToast(null);
    }, [showToast]);

    return (
        <>
            <Routes>
                <Route path="/" element={<SearchPage />} />
                <Route path="/exam-dashboard" element={<ExamDashboardPage />} />
                <Route path="/cross-exam-insights" element={<CrossExamInsightsPage />} />
                <Route path="/topic-wise-pyq" element={<TopicWisePYQPage />} />
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
                <Route 
                    path="/my-notes" 
                    element={
                        <PremiumProtectedRoute>
                            <MyNotesPage />
                        </PremiumProtectedRoute>
                    } 
                />
                <Route 
                    path="/ai-roadmap" 
                    element={
                        <PremiumProtectedRoute>
                            <AIRoadmapPage />
                        </PremiumProtectedRoute>
                    } 
                />
            </Routes>
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}
