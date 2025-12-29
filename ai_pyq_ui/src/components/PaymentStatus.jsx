// src/components/PaymentStatus.jsx
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function PaymentStatus({ status, orderData, onClose }) {
    const navigate = useNavigate();

    const isSuccess = status === "success";
    const isFailure = status === "failed";
    const isPending = status === "pending";

    const handleContinue = () => {
        if (onClose) {
            onClose();
        } else {
            navigate("/exam-dashboard");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl border-2 border-gray-200 p-8 shadow-lg max-w-md mx-auto"
        >
            <div className="text-center">
                {/* Status Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
                        isSuccess ? "bg-green-100" : isFailure ? "bg-red-100" : "bg-yellow-100"
                    }`}
                >
                    {isSuccess && (
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                    {isFailure && (
                        <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                    {isPending && (
                        <svg className="w-10 h-10 text-yellow-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    )}
                </motion.div>

                {/* Status Title */}
                <h2 className={`text-2xl font-bold mb-2 ${
                    isSuccess ? "text-green-600" : isFailure ? "text-red-600" : "text-yellow-600"
                }`}>
                    {isSuccess && "Payment Successful!"}
                    {isFailure && "Payment Failed"}
                    {isPending && "Payment Pending"}
                </h2>

                {/* Status Message */}
                <p className="text-gray-600 mb-6">
                    {isSuccess && (
                        <>
                            Your premium subscription has been activated successfully. 
                            You now have access to all premium features!
                        </>
                    )}
                    {isFailure && (
                        <>
                            We couldn't process your payment. Please try again or contact support if the problem persists.
                        </>
                    )}
                    {isPending && (
                        <>
                            Your payment is being processed. Please wait while we confirm your subscription.
                        </>
                    )}
                </p>

                {/* Order Details */}
                {orderData && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                        <div className="space-y-2 text-sm">
                            {orderData.order_id && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Order ID:</span>
                                    <span className="font-mono text-gray-900">{orderData.order_id}</span>
                                </div>
                            )}
                            {orderData.amount && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Amount:</span>
                                    <span className="font-semibold text-gray-900">₹{orderData.amount.toFixed(2)}</span>
                                </div>
                            )}
                            {orderData.plan_name && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Plan:</span>
                                    <span className="font-medium text-gray-900">{orderData.plan_name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Action Button */}
                <button
                    onClick={handleContinue}
                    className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${
                        isSuccess
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : isFailure
                            ? "bg-gray-600 text-white hover:bg-gray-700"
                            : "bg-yellow-600 text-white hover:bg-yellow-700"
                    }`}
                >
                    {isSuccess && "Continue to Dashboard"}
                    {isFailure && "Try Again"}
                    {isPending && "Check Status"}
                </button>

                {/* Help Text */}
                {isFailure && (
                    <p className="text-sm text-gray-500 mt-4">
                        Need help? <a href="mailto:support@aipyq.com" className="text-blue-600 hover:underline">Contact Support</a>
                    </p>
                )}
            </div>
        </motion.div>
    );
}

