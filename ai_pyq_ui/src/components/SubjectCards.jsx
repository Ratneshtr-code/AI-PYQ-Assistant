// src/components/SubjectCards.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { buildApiUrl } from "../config/apiConfig";
import { useLanguage } from "../contexts/LanguageContext";

export default function SubjectCards({ exams, yearFrom, yearTo, onSubjectClick }) {
    const { language } = useLanguage(); // Get language from context
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allSubjects, setAllSubjects] = useState([]);

    useEffect(() => {
        if (!exams || exams.length === 0) {
            setData({});
            setAllSubjects([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const examsStr = exams.join(",");
        const langParam = language === "hi" ? "hi" : "en";
        let url = `${buildApiUrl("dashboard/cross-exam/subject-distribution")}?exams=${encodeURIComponent(examsStr)}&language=${langParam}`;
        if (yearFrom) {
            url += `&year_from=${yearFrom}`;
        }
        if (yearTo) {
            url += `&year_to=${yearTo}`;
        }

        fetch(url)
            .then((res) => res.json())
            .then((result) => {
                if (result.exams) {
                    setData(result.exams);
                    // Collect all unique subjects
                    const subjectsSet = new Set();
                    Object.values(result.exams).forEach((examData) => {
                        examData.subjects?.forEach((subj) => {
                            subjectsSet.add(subj.name);
                        });
                    });
                    setAllSubjects(Array.from(subjectsSet).sort());
                } else {
                    setData({});
                    setAllSubjects([]);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching subject distribution:", err);
                setError("Failed to load subject distribution");
                setLoading(false);
            });
    }, [exams, yearFrom, yearTo, language]);

    const getExamColor = (index) => {
        const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
        return colors[index % colors.length];
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white rounded-xl shadow p-4 border border-gray-200">
                        <div className="h-32 bg-gray-200 rounded animate-pulse" />
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    if (allSubjects.length === 0) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-gray-500">No subject data available for selected exams</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allSubjects.map((subject, idx) => {
                const subjectData = exams.map((exam) => {
                    const examData = data[exam];
                    if (!examData || !examData.subjects) return { exam, count: 0, percentage: 0 };
                    const subj = examData.subjects.find((s) => s.name === subject);
                    return {
                        exam,
                        count: subj?.count || 0,
                        percentage: subj?.percentage || 0,
                    };
                });

                const totalCount = subjectData.reduce((sum, d) => sum + d.count, 0);
                const maxCount = Math.max(...subjectData.map((d) => d.count), 1);

                return (
                    <motion.div
                        key={subject}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => onSubjectClick && onSubjectClick(subject)}
                        className="bg-white rounded-xl shadow-lg p-4 border border-gray-200 hover:shadow-xl hover:border-indigo-300 cursor-pointer transition-all"
                    >
                        <h3 className="font-semibold text-gray-800 mb-3">{subject}</h3>
                        <div className="space-y-2">
                            {subjectData.map((item, examIdx) => (
                                <div key={item.exam} className="flex items-center gap-2">
                                    <div className="w-20 text-xs text-gray-600 truncate">{item.exam}</div>
                                    <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(item.count / maxCount) * 100}%` }}
                                            transition={{ delay: idx * 0.05 + examIdx * 0.02 }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: getExamColor(examIdx) }}
                                        />
                                    </div>
                                    <div className="w-12 text-xs text-gray-700 text-right">{item.count}</div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Total:</span>
                                <span className="font-semibold text-gray-700">{totalCount} questions</span>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}

