// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SearchPage from "./SearchPage";
import ExamDashboardPage from "./ExamDashboardPage";
import CrossExamInsightsPage from "./CrossExamInsightsPage";
import LoginPage from "./LoginPage";
import SignUpPage from "./SignUpPage";
import SubscriptionPage from "./SubscriptionPage";
import SettingsPage from "./SettingsPage";
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
                <Route path="/subscription" element={<SubscriptionPage />} />
                <Route path="/settings" element={<SettingsPage />} />
            </Routes>
        </BrowserRouter>
    );
}
