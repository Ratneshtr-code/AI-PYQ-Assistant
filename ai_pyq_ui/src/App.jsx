// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { isAuthenticated } from "./utils/auth";
import { LanguageProvider } from "./contexts/LanguageContext";
import LandingPage from "./LandingPage";
import SearchPage from "./SearchPage";
import ExamDashboardPage from "./ExamDashboardPage";
import CrossExamInsightsPage from "./CrossExamInsightsPage";
import TopicWisePYQPage from "./TopicWisePYQPage";
import ConceptMapPage from "./ConceptMapPage";
import SubjectPage from "./components/conceptmap/SubjectPage";
import LoginPage from "./LoginPage";
import SignUpPage from "./SignUpPage";
import VerifyEmailPage from "./VerifyEmailPage";
import ForgotPasswordPage from "./ForgotPasswordPage";
import ResetPasswordPage from "./ResetPasswordPage";
import SubscriptionPage from "./SubscriptionPage";
import AccountPage from "./AccountPage";
import AdminPanel from "./AdminPanel";
import SubscriptionManagementPage from "./SubscriptionManagementPage";
import ProtectedRoute from "./components/ProtectedRoute";
import PremiumProtectedRoute from "./components/PremiumProtectedRoute";
import MyNotesPage from "./pages/MyNotesPage";
import MyProgressPage from "./pages/MyProgressPage";
import AIRoadmapPage from "./AIRoadmapPage";
import ExamModePage from "./ExamModePage";
import ExamInstructions from "./components/exam/ExamInstructions";
import ExamInterface from "./components/exam/ExamInterface";
import ExamResults from "./components/exam/ExamResults";
import SolutionViewer from "./components/exam/SolutionViewer";
import HomePage from "./HomePage";
import ExamPage from "./ExamPage";
import ExamInfoPage from "./ExamInfoPage";
import ExamRoadmapPage from "./ExamRoadmapPage";
import ExamMyProgressPage from "./ExamMyProgressPage";
import ExamSubjectDistributionPage from "./ExamSubjectDistributionPage";
import ExamTopicDistributionPage from "./ExamTopicDistributionPage";
import ExamHottestTopicsPage from "./ExamHottestTopicsPage";
import ExamPYQPage from "./ExamPYQPage";
import ExamMockPage from "./ExamMockPage";
import ExamSubjectTestPage from "./ExamSubjectTestPage";
import ExamMyTestsPage from "./ExamMyTestsPage";
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
                <Route 
                    path="/" 
                    element={<LandingPage />}
                />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/conceptmap" element={<Navigate to="/conceptmap/subjects" replace />} />
                <Route path="/conceptmap/subjects" element={<SubjectPage />} />
                <Route path="/conceptmap/subjects/:subjectId/learning-path" element={<ConceptMapPage />} />
                <Route path="/conceptmap/subjects/:subjectId/topics/:topicId" element={<ConceptMapPage />} />
                <Route path="/conceptmap/topics" element={<ConceptMapPage />} />
                <Route path="/exam-dashboard" element={<ExamDashboardPage />} />
                <Route path="/cross-exam-insights" element={<CrossExamInsightsPage />} />
                <Route path="/topic-wise-pyq" element={<TopicWisePYQPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
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
                <Route 
                    path="/my-progress" 
                    element={
                        <ProtectedRoute>
                            <MyProgressPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/exam-mode" 
                    element={
                        <ProtectedRoute>
                            <ExamModePage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/exam-mode/instructions/:examSetId" 
                    element={
                        <ProtectedRoute>
                            <ExamInstructions />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/exam/:attemptId" 
                    element={
                        <ProtectedRoute>
                            <ExamInterface />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/exam/:attemptId/results" 
                    element={
                        <ProtectedRoute>
                            <ExamResults />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/exam/:attemptId/solution/:questionIndex" 
                    element={
                        <ProtectedRoute>
                            <SolutionViewer />
                        </ProtectedRoute>
                    } 
                />
                {/* Home and Exam Pages */}
                <Route path="/home" element={<HomePage />} />
                <Route path="/home/:examName" element={<ExamPage />} />
                <Route path="/home/:examName/info" element={<ExamInfoPage />} />
                <Route 
                    path="/home/:examName/roadmap" 
                    element={
                        <PremiumProtectedRoute>
                            <ExamRoadmapPage />
                        </PremiumProtectedRoute>
                    } 
                />
                <Route 
                    path="/home/:examName/my-progress" 
                    element={
                        <ProtectedRoute>
                            <ExamMyProgressPage />
                        </ProtectedRoute>
                    } 
                />
                <Route path="/home/:examName/subject-distribution" element={<ExamSubjectDistributionPage />} />
                <Route path="/home/:examName/topic-distribution" element={<ExamTopicDistributionPage />} />
                <Route path="/home/:examName/hottest-topics" element={<ExamHottestTopicsPage />} />
                <Route 
                    path="/home/:examName/pyq" 
                    element={
                        <ProtectedRoute>
                            <ExamPYQPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/home/:examName/mock" 
                    element={
                        <ProtectedRoute>
                            <ExamMockPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/home/:examName/subject-test" 
                    element={
                        <ProtectedRoute>
                            <ExamSubjectTestPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/home/:examName/my-tests" 
                    element={
                        <ProtectedRoute>
                            <ExamMyTestsPage />
                        </ProtectedRoute>
                    } 
                />
            </Routes>
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </>
    );
}

export default function App() {
    return (
        <LanguageProvider>
            <BrowserRouter>
                <AppContent />
            </BrowserRouter>
        </LanguageProvider>
    );
}
