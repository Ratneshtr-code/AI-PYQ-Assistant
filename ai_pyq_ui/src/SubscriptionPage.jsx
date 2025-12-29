// src/SubscriptionPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import PaymentMethodSelector from "./components/PaymentMethodSelector";
import CheckoutForm from "./components/CheckoutForm";
import PaymentStatus from "./components/PaymentStatus";
import { authenticatedFetch, setUserData, getUserData } from "./utils/auth";

const API_BASE_URL = ""; // Use Vite proxy

export default function SubscriptionPage() {
    const navigate = useNavigate();
    const [examsList, setExamsList] = useState([]);
    const [hasPremium, setHasPremium] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    
    // Payment flow state
    const [paymentStep, setPaymentStep] = useState("plans"); // "plans", "payment-method", "checkout", "status"
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState(null); // "success", "failed", "pending"
    const [orderData, setOrderData] = useState(null);
    const [isTestMode, setIsTestMode] = useState(true); // Will be set based on API response

    useEffect(() => {
        // Check premium status from userData
        const userData = getUserData();
        const premium = userData?.subscription_plan === "premium" || localStorage.getItem("hasPremium") === "true";
        setHasPremium(premium);

        // Fetch exams list for sidebar
        const fetchExams = async () => {
            try {
                const res = await fetch("/filters");
                const data = await res.json();
                setExamsList(data.exams || []);
            } catch (err) {
                console.error("Failed to fetch exams:", err);
            }
        };
        fetchExams();

        // Load Razorpay script
        const loadRazorpay = () => {
            if (window.Razorpay) {
                return; // Already loaded
            }
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;
            script.onerror = () => {
                console.warn("Failed to load Razorpay script");
            };
            document.body.appendChild(script);
        };
        loadRazorpay();
    }, []);

    const handleUpgradeClick = (plan) => {
        setSelectedPlan({
            id: null, // Will be fetched from API if available
            name: "Premium",
            plan_type: "premium",
            price: 499,
            duration_months: 1
        });
        setPaymentStep("payment-method");
        setError("");
        setSuccess("");
    };

    const handlePaymentMethodSelect = (methodId) => {
        setSelectedPaymentMethod(methodId);
        setPaymentStep("checkout");
    };

    const handlePaymentSuccess = async (result) => {
        setPaymentStatus("success");
        setOrderData(result);
        setPaymentStep("status");

        // Update user data
        if (result.user) {
            setUserData(result.user);
            setHasPremium(true);
            // Dispatch events to update Sidebar
            window.dispatchEvent(new Event("premiumStatusChanged"));
            window.dispatchEvent(new Event("userLoggedIn"));
            window.dispatchEvent(new Event("userProfileUpdated"));
        }
    };

    const handlePaymentCancel = () => {
        setPaymentStep("plans");
        setSelectedPaymentMethod(null);
        setSelectedPlan(null);
        setError("");
    };

    const handleStatusClose = () => {
        setPaymentStep("plans");
        setPaymentStatus(null);
        setOrderData(null);
        setSelectedPaymentMethod(null);
        setSelectedPlan(null);
        navigate("/exam-dashboard");
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
                        {/* Back Button */}
                        <button
                            onClick={() => {
                                // Check if there's history, otherwise go to exam dashboard
                                if (window.history.length > 1) {
                                    navigate(-1);
                                } else {
                                    navigate("/exam-dashboard");
                                }
                            }}
                            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span>Back</span>
                        </button>
                        
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                            💎 Subscription Plans
                        </h1>
                        <p className="text-gray-600 mb-8">
                            Choose the plan that's right for you
                        </p>
                        
                        {success && (
                            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                                {success}
                            </div>
                        )}
                        
                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        {/* Payment Status Screen */}
                        {paymentStep === "status" && paymentStatus && (
                            <div className="mb-8">
                                <PaymentStatus 
                                    status={paymentStatus}
                                    orderData={orderData}
                                    onClose={handleStatusClose}
                                />
                            </div>
                        )}

                        {/* Payment Flow Steps */}
                        {paymentStep === "payment-method" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm mb-8"
                            >
                                <button
                                    onClick={() => setPaymentStep("plans")}
                                    className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    <span>Back to Plans</span>
                                </button>
                                <PaymentMethodSelector
                                    selectedMethod={selectedPaymentMethod}
                                    onSelect={handlePaymentMethodSelect}
                                />
                            </motion.div>
                        )}

                        {paymentStep === "checkout" && selectedPlan && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm mb-8"
                            >
                                <button
                                    onClick={() => setPaymentStep("payment-method")}
                                    className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    <span>Back</span>
                                </button>
                                <CheckoutForm
                                    plan={selectedPlan}
                                    amount={selectedPlan.price}
                                    durationMonths={selectedPlan.duration_months}
                                    paymentMethod={selectedPaymentMethod}
                                    onSuccess={handlePaymentSuccess}
                                    onCancel={handlePaymentCancel}
                                    isTestMode={isTestMode}
                                />
                            </motion.div>
                        )}

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
                                        onClick={() => navigate("/exam-dashboard")}
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
                                        onClick={() => handleUpgradeClick({ name: "Premium", price: 499, duration_months: 1 })}
                                        disabled={loading || paymentStep !== "plans"}
                                        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? "Upgrading..." : "Upgrade to Premium"}
                                    </button>
                                )}
                            </div>
                        </div>

                        {paymentStep === "plans" && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <p className="text-sm text-blue-800">
                                    <strong>Secure Payment:</strong> All payments are processed through secure payment gateways. 
                                    Your payment information is encrypted and secure.
                                </p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </main>
        </div>
    );
}

