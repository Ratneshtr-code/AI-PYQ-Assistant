// src/components/MyProgress.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useProgressTracking } from "../hooks/useProgressTracking";
import { useLanguage } from "../contexts/LanguageContext";

const API_BASE_URL = "";

export default function MyProgress({ exam }) {
    const { language } = useLanguage(); // Get language from context
    const { fetchProgress, progressData, loading } = useProgressTracking();
    const [selectedSubject, setSelectedSubject] = useState(null);

    useEffect(() => {
        if (exam) {
            fetchProgress(exam, language);
        }
    }, [exam, language, fetchProgress]);

    if (!exam) {
        return (
            <div className="bg-white rounded-lg shadow-md p-4 md:p-8 text-center border border-gray-200">
                <div className="text-5xl mb-3">📊</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    Select an Exam to View Progress
                </h3>
                <p className="text-sm text-gray-600">
                    Choose an exam to see your detailed progress tracking
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                    <p className="text-gray-600 text-sm">Loading progress...</p>
                </div>
            </div>
        );
    }

    if (!progressData) {
        return (
            <div className="bg-white rounded-lg shadow-md p-4 md:p-8 text-center border border-gray-200">
                <div className="text-5xl mb-3">📊</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    No Progress Data Available
                </h3>
                <p className="text-sm text-gray-600">
                    Start solving questions to track your progress
                </p>
            </div>
        );
    }

    const { total_questions, solved_count, progress_percentage, weightage_progress, subjects } = progressData;

    // Calculate progress for circular chart - Increased size
    const radius = 80; // Increased from 70 to 80
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress_percentage / 100) * circumference;

    return (
        <div className="space-y-4">
            {/* Progress Overview Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-lg p-3 md:p-4 lg:p-6 border border-gray-200"
            >
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Progress Overview of {exam}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {/* Circular Progress Chart - Increased size */}
                    <div className="flex flex-col items-center justify-center lg:col-span-1">
                        <div className="relative w-48 h-48 md:w-64 md:h-64 mx-auto">
                            <svg className="transform -rotate-90 w-48 h-48 md:w-64 md:h-64">
                                {/* Background circle */}
                                <circle
                                    cx="50%"
                                    cy="50%"
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth="10"
                                    fill="none"
                                    className="text-gray-200"
                                />
                                {/* Progress circle */}
                                <motion.circle
                                    cx="50%"
                                    cy="50%"
                                    r={radius}
                                    stroke="url(#gradient)"
                                    strokeWidth="10"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    initial={{ strokeDashoffset: circumference }}
                                    animate={{ strokeDashoffset: offset }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                />
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#3B82F6" />
                                        <stop offset="50%" stopColor="#8B5CF6" />
                                        <stop offset="100%" stopColor="#EC4899" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-gray-900">
                                        {progress_percentage.toFixed(0)}%
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">Complete</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Statistics Grid - 2 columns */}
                    <div className="lg:col-span-2 grid grid-cols-2 gap-3">
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
                            <div className="text-xs text-gray-600 mb-1">Questions Solved</div>
                            <div className="text-2xl font-bold text-gray-900">
                                {solved_count} / {total_questions}
                            </div>
                        </div>
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3">
                            <div className="text-xs text-gray-600 mb-1">Weightage Progress</div>
                            <div className="text-2xl font-bold text-gray-900">
                                {weightage_progress.toFixed(1)}%
                            </div>
                        </div>
                        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3">
                            <div className="text-xs text-gray-600 mb-1">Remaining Questions</div>
                            <div className="text-2xl font-bold text-gray-900">
                                {total_questions - solved_count}
                            </div>
                        </div>
                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-3">
                            <div className="text-xs text-gray-600 mb-1">Subjects Covered</div>
                            <div className="text-2xl font-bold text-gray-900">
                                {subjects?.filter(s => s.solved_count > 0).length || 0} / {subjects?.length || 0}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Subject-wise Progress */}
            <div className="space-y-3">
                <h2 className="text-xl font-bold text-gray-900">Subject-wise Progress</h2>
                
                {subjects && subjects.length > 0 ? (
                    subjects.map((subject, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
                        >
                            {/* Subject Header */}
                            <div
                                className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setSelectedSubject(selectedSubject === idx ? null : idx)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-base font-semibold text-gray-900 mb-1">
                                            {subject.name}
                                        </h3>
                                        <div className="flex items-center gap-3 text-xs text-gray-600">
                                            <span>
                                                {subject.solved_count} / {subject.total_questions} solved
                                            </span>
                                            <span className="font-semibold text-blue-600">
                                                {subject.progress_percentage.toFixed(1)}%
                                            </span>
                                            <span className="text-gray-500">
                                                {subject.weightage.toFixed(1)}% weightage
                                            </span>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <svg
                                            className={`w-5 h-5 text-gray-400 transition-transform ${
                                                selectedSubject === idx ? "rotate-180" : ""
                                            }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 9l-7 7-7-7"
                                            />
                                        </svg>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-2">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                        <motion.div
                                            className={`h-full rounded-full ${
                                                subject.progress_percentage === 100
                                                    ? "bg-gradient-to-r from-green-500 to-emerald-500"
                                                    : subject.progress_percentage >= 50
                                                    ? "bg-gradient-to-r from-blue-500 to-indigo-500"
                                                    : "bg-gradient-to-r from-yellow-400 to-orange-400"
                                            }`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${subject.progress_percentage}%` }}
                                            transition={{ duration: 0.8, delay: idx * 0.1 }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Topic Details (Collapsible) */}
                            {selectedSubject === idx && subject.topics && subject.topics.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="border-t border-gray-200 bg-gray-50"
                                >
                                    <div className="p-3 space-y-2">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Topics</h4>
                                        {subject.topics.map((topic, topicIdx) => (
                                            <div key={topicIdx} className="bg-white rounded-lg p-2.5 border border-gray-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-800">
                                                        {topic.name.length > 50
                                                            ? topic.name.substring(0, 50) + "..."
                                                            : topic.name}
                                                    </span>
                                                    <span className="text-xs font-semibold text-blue-600">
                                                        {topic.progress_percentage.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                                                    <span>{topic.solved_count} / {topic.total_questions} solved</span>
                                                    <span>•</span>
                                                    <span>{topic.weightage.toFixed(1)}% weightage</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <motion.div
                                                        className={`h-full rounded-full ${
                                                            topic.progress_percentage === 100
                                                                ? "bg-green-500"
                                                                : topic.progress_percentage >= 50
                                                                ? "bg-blue-500"
                                                                : "bg-yellow-400"
                                                        }`}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${topic.progress_percentage}%` }}
                                                        transition={{ duration: 0.5, delay: topicIdx * 0.05 }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    ))
                ) : (
                    <div className="bg-white rounded-lg shadow-md p-4 md:p-8 text-center border border-gray-200">
                        <p className="text-gray-600">No subjects found for this exam</p>
                    </div>
                )}
            </div>
        </div>
    );
}

