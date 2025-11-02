// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SearchPage from "./SearchPage";
import ExamDashboardPage from "./ExamDashboardPage";
import "./index.css";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<SearchPage />} />
                <Route path="/exam-dashboard" element={<ExamDashboardPage />} />
            </Routes>
        </BrowserRouter>
    );
}
