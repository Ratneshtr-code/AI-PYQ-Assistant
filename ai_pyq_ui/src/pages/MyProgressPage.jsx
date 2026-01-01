// src/pages/MyProgressPage.jsx
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import MyProgress from "../components/MyProgress";

export default function MyProgressPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [exam, setExam] = useState("");
    const [examsList, setExamsList] = useState([]);
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);

    // Fetch exam filters
    useEffect(() => {
        const fetchExams = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/filters");
                const data = await res.json();
                setExamsList(data.exams || []);
            } catch (err) {
                console.error("Failed to fetch exams:", err);
            }
        };

        fetchExams();
    }, []);

    // Read exam from URL params on mount and when URL changes
    useEffect(() => {
        const examParam = searchParams.get('exam');
        if (examParam) {
            setExam(examParam);
        }
    }, [searchParams]);

    // Auto-select first exam if none is selected and exams are loaded
    useEffect(() => {
        if (!exam && examsList.length > 0) {
            const firstExam = examsList[0];
            setExam(firstExam);
            setSearchParams({ exam: firstExam }, { replace: true });
        }
    }, [examsList, exam, setSearchParams]);

    // Handle exam change
    const handleExamChange = (newExam) => {
        setExam(newExam);
        setSearchParams({ exam: newExam });
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Primary Sidebar */}
            <Sidebar
                exam={exam}
                setExam={handleExamChange}
                examsList={examsList}
                onCollapseChange={setPrimarySidebarCollapsed}
            />

            {/* Main Content */}
            <div
                className={`flex-1 transition-all duration-300 ${
                    primarySidebarCollapsed ? "ml-16" : "ml-64"
                }`}
            >
                <div className="p-6 md:p-8">
                    {/* Page Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                            My Progress
                        </h1>
                        <p className="text-sm md:text-base text-gray-600">
                            Track your progress across different exams and subjects
                        </p>
                    </div>

                    {/* Exam Selector */}
                    {examsList.length > 0 && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Exam
                            </label>
                            <select
                                value={exam}
                                onChange={(e) => handleExamChange(e.target.value)}
                                className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">-- Select an Exam --</option>
                                {examsList.map((examName) => (
                                    <option key={examName} value={examName}>
                                        {examName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* My Progress Component */}
                    <MyProgress exam={exam} />
                </div>
            </div>
        </div>
    );
}

