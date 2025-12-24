// src/components/SecondarySidebar.jsx
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export default function SecondarySidebar({ isOpen, onClose, type, activeSubPage, onSubPageChange }) {
    // Remove internal collapsed state - use parent's isOpen prop

    // Sub-pages for Exam Dashboard
    const examDashboardSubPages = [
        {
            id: "exam-analysis",
            title: "Exam Analysis",
            icon: "📊",
        },
        {
            id: "subject-analysis",
            title: "Subject Analysis",
            icon: "📚",
        },
        {
            id: "hottest-topics-by-exam",
            title: "Hottest Topic by Exam",
            icon: "🔥",
        },
        {
            id: "hottest-topics-by-subject",
            title: "Hottest Topic by Subject",
            icon: "🔥",
        },
    ];

    // Sub-pages for Cross-Exam Insights
    const crossExamSubPages = [
        {
            id: "subject-cards",
            title: "Subject Comparison",
            icon: "📋",
        },
        {
            id: "subject-analysis",
            title: "Subject & Topic Analysis",
            icon: "📊",
        },
        {
            id: "hot-topics",
            title: "Hot Topics",
            icon: "🔥",
        },
    ];

    const subPages = type === "exam-dashboard" ? examDashboardSubPages : crossExamSubPages;
    const panelTitle = type === "exam-dashboard" ? "Exam Dashboard" : "Cross-Exam Insights";

    // Set default active sub-page when panel opens
    useEffect(() => {
        if (isOpen && !activeSubPage && subPages.length > 0) {
            onSubPageChange(subPages[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isOpen ? 0.3 : 0 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black z-40 lg:hidden"
                    />

                    {/* Secondary Sidebar */}
                    <motion.aside
                        initial={{ x: -240 }}
                        animate={{ x: isOpen ? 0 : -240 }}
                        exit={{ x: -240 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 left-64 z-30 h-screen bg-white shadow-xl border-r border-gray-200 flex flex-col"
                        style={{ width: "240px" }}
                    >
                        {/* Header with Collapse Button */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 z-50 bg-white shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-800 truncate pr-2 flex-1 min-w-0">{panelTitle}</h3>
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-gray-700 flex-shrink-0 ml-2"
                                title="Close sidebar"
                                aria-label="Close sidebar"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* Sub-Pages Navigation */}
                        <nav className="flex-1 overflow-y-auto p-4 bg-white">
                            <div className="space-y-2">
                                {subPages.map((page) => (
                                    <button
                                        key={page.id}
                                        onClick={() => onSubPageChange(page.id)}
                                        className={`w-full text-left py-3 px-4 rounded-lg transition-all ${
                                            activeSubPage === page.id
                                                ? "bg-blue-100 text-blue-700 font-medium shadow-sm border-l-4 border-blue-600"
                                                : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg flex-shrink-0">{page.icon}</span>
                                            <span className="text-sm font-medium whitespace-nowrap">{page.title}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </nav>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}

