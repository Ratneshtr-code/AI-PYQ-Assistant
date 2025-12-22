// src/SubscriptionPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";

export default function SubscriptionPage() {
    const navigate = useNavigate();
    const [examsList, setExamsList] = useState([]);
    const [hasPremium, setHasPremium] = useState(false);

    useEffect(() => {
        // Check premium status
        const premium = localStorage.getItem("hasPremium") === "true";
        setHasPremium(premium);

        // Fetch exams list for sidebar
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

    const handleUpgrade = () => {
        // Mock upgrade - set premium status
        localStorage.setItem("hasPremium", "true");
        localStorage.setItem("isLoggedIn", "true");
        setHasPremium(true);
        window.dispatchEvent(new Event("premiumStatusChanged"));
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar exam="" setExam={() => {}} examsList={examsList} onOpenSecondarySidebar={() => {}} />
            
            <main className="flex-1 ml-64">
                <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                            💎 Subscription Plans
                        </h1>
                        <p className="text-gray-600 mb-8">
                            Choose the plan that's right for you
                        </p>

                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                            {/* Free Plan */}
                            <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm">
                                <div className="mb-4">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
                                    <div className="flex items-baseline">
                                        <span className="text-4xl font-bold text-gray-900">₹0</span>
                                        <span className="text-gray-600 ml-2">/month</span>
                                    </div>
                                </div>
                                <ul className="space-y-3 mb-6">
                                    <li className="flex items-start">
                                        <span className="text-green-500 mr-2">✓</span>
                                        <span className="text-gray-700">Basic PYQ search</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-green-500 mr-2">✓</span>
                                        <span className="text-gray-700">Exam Dashboard access</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-green-500 mr-2">✓</span>
                                        <span className="text-gray-700">Basic analytics</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-gray-400 mr-2">✗</span>
                                        <span className="text-gray-500">Stable/Volatile insights</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-gray-400 mr-2">✗</span>
                                        <span className="text-gray-500">Advanced analytics</span>
                                    </li>
                                </ul>
                                {!hasPremium && (
                                    <button
                                        onClick={() => navigate("/")}
                                        className="w-full py-2 px-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Current Plan
                                    </button>
                                )}
                            </div>

                            {/* Premium Plan */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-500 p-6 shadow-lg relative">
                                {hasPremium && (
                                    <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                        Active
                                    </div>
                                )}
                                <div className="mb-4">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium</h3>
                                    <div className="flex items-baseline">
                                        <span className="text-4xl font-bold text-gray-900">₹499</span>
                                        <span className="text-gray-600 ml-2">/month</span>
                                    </div>
                                </div>
                                <ul className="space-y-3 mb-6">
                                    <li className="flex items-start">
                                        <span className="text-green-500 mr-2">✓</span>
                                        <span className="text-gray-700">Everything in Free</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-green-500 mr-2">✓</span>
                                        <span className="text-gray-700">Stable/Volatile topic insights</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-green-500 mr-2">✓</span>
                                        <span className="text-gray-700">Advanced analytics & trends</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-green-500 mr-2">✓</span>
                                        <span className="text-gray-700">Cross-exam comparisons</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-green-500 mr-2">✓</span>
                                        <span className="text-gray-700">Priority support</span>
                                    </li>
                                </ul>
                                {hasPremium ? (
                                    <button
                                        disabled
                                        className="w-full py-2 px-4 bg-green-500 text-white rounded-lg cursor-not-allowed"
                                    >
                                        Premium Active ✓
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleUpgrade}
                                        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                                    >
                                        Upgrade to Premium
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                            <p className="text-sm text-blue-800">
                                <strong>Demo Mode:</strong> Click "Upgrade to Premium" to activate premium features instantly. 
                                No payment required for testing.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}

