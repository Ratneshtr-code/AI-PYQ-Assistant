// src/components/InsightsWindow.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function InsightsWindow({ exam, subject, yearFrom, yearTo }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasPremium, setHasPremium] = useState(false);

    useEffect(() => {
        // Mock premium check - check localStorage
        const premium = localStorage.getItem("hasPremium") === "true";
        setHasPremium(premium);
    }, []);

    useEffect(() => {
        if (!exam) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        let url = `http://127.0.0.1:8000/dashboard/stable-volatile?exam=${encodeURIComponent(exam)}`;
        if (subject) {
            url += `&subject=${encodeURIComponent(subject)}`;
        }
        if (yearFrom) {
            url += `&year_from=${yearFrom}`;
        }
        if (yearTo) {
            url += `&year_to=${yearTo}`;
        }

        fetch(url)
            .then((res) => res.json())
            .then((result) => {
                setData(result);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching insights:", err);
                setError("Failed to load insights");
                setLoading(false);
            });
    }, [exam, subject, yearFrom, yearTo]);

    if (!hasPremium) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-lg p-6 border-2 border-purple-200 relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 to-indigo-100/50 backdrop-blur-sm"></div>
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-800">Insights & Strategy Summary</h3>
                        <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
                            ⭐ Premium
                        </span>
                    </div>
                    <div className="bg-white/80 rounded-lg p-6 text-center">
                        <div className="text-4xl mb-4">🔒</div>
                        <p className="text-gray-700 font-medium mb-2">Premium Feature</p>
                        <p className="text-sm text-gray-600 mb-4">
                            Unlock Stable/Volatile topic analysis to identify high ROI study areas
                        </p>
                        <button
                            onClick={() => {
                                localStorage.setItem("hasPremium", "true");
                                localStorage.setItem("isLoggedIn", "true");
                                setHasPremium(true);
                                // Dispatch event to update sidebar
                                window.dispatchEvent(new Event("premiumStatusChanged"));
                            }}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
                        >
                            Unlock Premium (Demo)
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-lg p-6 border-2 border-purple-200"
            >
                <h3 className="text-xl font-bold text-gray-800 mb-4">Insights & Strategy Summary</h3>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
                    ))}
                </div>
            </motion.div>
        );
    }

    if (error) {
        return (
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl shadow-lg p-6 border-2 border-red-200">
                <h3 className="text-xl font-bold text-red-800 mb-4">Insights & Strategy Summary</h3>
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    if (!data || (!data.stable_topics?.length && !data.volatile_topics?.length)) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-lg p-6 border-2 border-purple-200"
            >
                <h3 className="text-xl font-bold text-gray-800 mb-4">Insights & Strategy Summary</h3>
                <p className="text-gray-500 text-center py-8">No insights available for the selected filters</p>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-lg p-6 border-2 border-purple-200"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Insights & Strategy Summary</h3>
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                    ✓ Premium Active
                </span>
            </div>

            {data.summary && (
                <div className="bg-white rounded-lg p-4 mb-4 border-l-4 border-indigo-500">
                    <p className="text-gray-700 text-sm leading-relaxed">{data.summary}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stable Topics */}
                <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                    <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                        <span className="text-xl">✔</span> Stable Topics (High ROI)
                    </h4>
                    {data.stable_topics && data.stable_topics.length > 0 ? (
                        <ul className="space-y-2">
                            {data.stable_topics.slice(0, 10).map((topic, idx) => (
                                <motion.li
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="flex items-center gap-2 text-sm text-gray-700"
                                >
                                    <span className="text-green-600 font-bold">✔</span>
                                    <span className="flex-1">{topic.name}</span>
                                    <span className="text-xs text-gray-500">
                                        {topic.coverage_ratio * 100}% coverage
                                    </span>
                                </motion.li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-sm">No stable topics found</p>
                    )}
                </div>

                {/* Volatile Topics */}
                <div className="bg-white rounded-lg p-4 border-2 border-amber-200">
                    <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                        <span className="text-xl">⚠</span> Volatile Topics (High Risk)
                    </h4>
                    {data.volatile_topics && data.volatile_topics.length > 0 ? (
                        <ul className="space-y-2">
                            {data.volatile_topics.slice(0, 10).map((topic, idx) => (
                                <motion.li
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="flex items-center gap-2 text-sm text-gray-700"
                                >
                                    <span className="text-amber-600 font-bold">⚠</span>
                                    <span className="flex-1">{topic.name}</span>
                                    <span className="text-xs text-gray-500">
                                        {topic.total_count} questions
                                    </span>
                                </motion.li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-sm">No volatile topics found</p>
                    )}
                </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-600">
                    <strong>💡 Strategy Tip:</strong> Focus on Stable Topics for consistent scoring. Study Volatile Topics
                    when you have extra time, as they appear unpredictably.
                </p>
            </div>
        </motion.div>
    );
}

