// src/components/CheckoutForm.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { authenticatedFetch } from "../utils/auth";

export default function CheckoutForm({ 
    plan, 
    amount, 
    durationMonths, 
    paymentMethod, 
    onSuccess, 
    onCancel,
    isTestMode = false 
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showComingSoon, setShowComingSoon] = useState(false);

    const handleProceedToPayment = async () => {
        if (!paymentMethod) {
            setError("Please select a payment method");
            return;
        }

        setLoading(true);
        setError("");
        setShowComingSoon(false);

        try {
            // Create payment order
            const response = await authenticatedFetch("/payment/create-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    plan_id: plan.id || null,
                    plan_type: plan.plan_type || "premium",
                    amount: amount,
                    duration_months: durationMonths,
                    payment_method: paymentMethod
                }),
            });

            if (!response.ok) {
                let errorMessage = "Failed to create payment order";
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                    console.error("Order creation error:", errorData);
                } catch (e) {
                    const text = await response.text().catch(() => "");
                    console.error("Order creation error (text):", text);
                    errorMessage = text || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const orderData = await response.json();
            console.log("Order created successfully:", orderData);

            // If test mode, automatically upgrade user without payment gateway
            if (isTestMode || orderData.test_mode || orderData.coming_soon) {
                // In test mode, directly upgrade the user
                setLoading(true);
                try {
                    const upgradeResponse = await authenticatedFetch("/payment/test-mode-upgrade", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            order_id: orderData.order_id
                        }),
                    });

                    if (!upgradeResponse.ok) {
                        const errorData = await upgradeResponse.json().catch(() => ({}));
                        throw new Error(errorData.detail || "Failed to upgrade subscription");
                    }

                    const upgradeResult = await upgradeResponse.json();
                    if (upgradeResult.success) {
                        // Successfully upgraded
                        onSuccess(upgradeResult);
                    } else {
                        setError(upgradeResult.message || "Failed to upgrade subscription");
                        setLoading(false);
                    }
                } catch (upgradeErr) {
                    console.error("Test mode upgrade error:", upgradeErr);
                    setError(upgradeErr.message || "Failed to upgrade subscription in test mode");
                    setLoading(false);
                }
                return;
            }

            // Initialize Razorpay payment
            if (window.Razorpay && orderData.razorpay_order_id) {
                const options = {
                    key: orderData.razorpay_key_id,
                    amount: Math.round(orderData.amount * 100), // Convert to paise
                    currency: orderData.currency,
                    name: "AI PYQ Assistant",
                    description: `Premium Subscription - ${durationMonths} month(s)`,
                    order_id: orderData.razorpay_order_id,
                    handler: async function (response) {
                        // Verify payment
                        await verifyPayment(response, orderData.order_id);
                    },
                    prefill: {
                        name: orderData.user_name || "",
                        email: orderData.user_email || "",
                    },
                    theme: {
                        color: "#2563eb"
                    },
                    modal: {
                        ondismiss: function() {
                            setLoading(false);
                        }
                    }
                };

                const razorpay = new window.Razorpay(options);
                razorpay.open();
            } else {
                // No Razorpay integration yet
                setShowComingSoon(true);
                setLoading(false);
            }
        } catch (err) {
            console.error("Payment error:", err);
            setError(err.message || "Failed to initiate payment. Please try again.");
            setLoading(false);
        }
    };

    const verifyPayment = async (razorpayResponse, orderId) => {
        try {
            const response = await authenticatedFetch("/payment/verify", {
                method: "POST",
                body: JSON.stringify({
                    order_id: orderId,
                    razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                    razorpay_order_id: razorpayResponse.razorpay_order_id,
                    razorpay_signature: razorpayResponse.razorpay_signature
                }),
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    onSuccess(result);
                } else {
                    setError(result.message || "Payment verification failed");
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                setError(errorData.detail || "Payment verification failed");
            }
        } catch (err) {
            console.error("Verification error:", err);
            setError("Failed to verify payment. Please contact support.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Plan</span>
                        <span className="font-medium text-gray-900">{plan.name || "Premium"}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Duration</span>
                        <span className="font-medium text-gray-900">{durationMonths} month(s)</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Payment Method</span>
                        <span className="font-medium text-gray-900 capitalize">{paymentMethod || "Not selected"}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-3 mt-3">
                        <div className="flex justify-between">
                            <span className="text-lg font-semibold text-gray-900">Total</span>
                            <span className="text-lg font-bold text-gray-900">₹{amount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Test Mode / Coming Soon Message */}
            {showComingSoon && !isTestMode && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6"
                >
                    <div className="flex items-start gap-3">
                        <div className="text-2xl">🚧</div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-yellow-900 mb-2">
                                Testing Mode / Coming Soon
                            </h4>
                            <p className="text-sm text-yellow-800 mb-3">
                                Payment gateway integration is currently in progress. 
                                We're setting up Razorpay and will enable real payments soon.
                            </p>
                            <p className="text-sm text-yellow-800">
                                <strong>For now:</strong> This is a test environment. No actual payment will be processed.
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
            
            {/* Test Mode Info Message */}
            {isTestMode && !showComingSoon && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6"
                >
                    <div className="flex items-start gap-3">
                        <div className="text-2xl">🧪</div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-blue-900 mb-2">
                                Test Mode Active
                            </h4>
                            <p className="text-sm text-blue-800">
                                You're in test mode. Clicking "Proceed to Payment" will automatically upgrade your account to Premium without processing any payment.
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Cancel
                </button>
                <button
                    onClick={handleProceedToPayment}
                    disabled={loading || !paymentMethod}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                        </>
                    ) : (
                        "Proceed to Payment"
                    )}
                </button>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <p className="text-sm text-blue-800">
                        <strong>Secure Payment:</strong> Your payment information is encrypted and secure. 
                        We never store your card details.
                    </p>
                </div>
            </div>
        </div>
    );
}

