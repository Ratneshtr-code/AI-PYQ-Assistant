// src/components/TransactionModal.jsx
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authenticatedFetch, getUserData } from "../utils/auth";

export default function TransactionModal({ isOpen, onClose }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError("");
        const allTransactions = [];
        
        console.log("TransactionModal: Starting to fetch transactions...");
        
        try {
            // PRIMARY: Fetch user orders from the database (this is the main source)
            try {
                const ordersResponse = await authenticatedFetch("/payment/user-orders");
                if (ordersResponse.ok) {
                    const orders = await ordersResponse.json();
                    if (Array.isArray(orders) && orders.length > 0) {
                        orders.forEach(order => {
                            allTransactions.push({
                                id: order.id,
                                order_id: order.order_id,
                                plan_name: order.plan_name || "Premium Subscription",
                                amount: order.amount || 0,
                                status: order.status?.toLowerCase() === "paid" ? "completed" : 
                                       order.status?.toLowerCase() === "success" ? "completed" :
                                       order.status?.toLowerCase() || "completed",
                                created_at: order.created_at || order.payment_date || order.created_at,
                                description: `Subscription: ${order.plan_name || "Premium"}`,
                                payment_method: "Razorpay",
                                razorpay_order_id: order.razorpay_order_id,
                                razorpay_payment_id: order.razorpay_payment_id,
                                currency: order.currency || "INR"
                            });
                        });
                        console.log("Found orders from /payment/user-orders:", orders.length);
                    }
                } else if (ordersResponse.status !== 404) {
                    console.log("User orders endpoint returned:", ordersResponse.status);
                }
            } catch (err) {
                console.log("User orders endpoint error:", err);
            }
            
            // Try to fetch from transactions endpoint (if it exists) - secondary source
            try {
                const response = await authenticatedFetch("/payment/transactions");
                if (response.ok) {
                    const data = await response.json();
                    const transactions = data.transactions || data || [];
                    if (Array.isArray(transactions)) {
                        transactions.forEach(transaction => {
                            // Check if we already have this transaction
                            const existing = allTransactions.find(
                                t => t.order_id === transaction.order_id || 
                                     (transaction.id && t.id === transaction.id)
                            );
                            if (!existing) {
                                allTransactions.push(transaction);
                            }
                        });
                        console.log("Found transactions from /payment/transactions:", transactions.length);
                    }
                } else if (response.status !== 404) {
                    console.log("Transactions endpoint returned:", response.status);
                }
            } catch (err) {
                // Endpoint doesn't exist (404) - this is expected, ignore
                if (err.message && !err.message.includes("404")) {
                    console.log("Transactions endpoint error:", err);
                }
            }
            
            // Also try to fetch active subscription which might contain transaction info (fallback)
            try {
                const activeSubResponse = await authenticatedFetch("/payment/active-subscription");
                if (activeSubResponse.ok) {
                    const activeSubData = await activeSubResponse.json();
                    console.log("Active subscription data:", activeSubData);
                    
                    // Handle different response structures
                    const subscription = activeSubData.subscription || activeSubData;
                    
                    // If user has active subscription, create a transaction entry from it
                    if (activeSubData.is_active) {
                        // Try to find order_id from various possible fields
                        const orderId = subscription.order_id || 
                                       subscription.payment_order_id || 
                                       subscription.razorpay_order_id ||
                                       subscription.payment_id ||
                                       subscription.id ||
                                       activeSubData.order_id;
                        
                        // Try to find plan name from various possible fields
                        const planName = subscription.plan_name || 
                                       subscription.plan_template?.name ||
                                       subscription.plan_template_name ||
                                       activeSubData.plan_name ||
                                       (activeSubData.active_plan_template_id ? "Premium Subscription" : null) ||
                                       "Premium Subscription";
                        
                        // Try to find amount from various possible fields
                        const amount = subscription.amount || 
                                     subscription.price ||
                                     subscription.plan_template?.price ||
                                     subscription.payment_amount ||
                                     activeSubData.amount ||
                                     activeSubData.price ||
                                     0;
                        
                        // Try to find dates from various possible fields
                        const createdAt = subscription.created_at || 
                                        subscription.subscription_start_date || 
                                        subscription.payment_date ||
                                        subscription.start_date ||
                                        subscription.purchased_at ||
                                        subscription.created_date ||
                                        activeSubData.created_at ||
                                        activeSubData.subscription_start_date ||
                                        activeSubData.payment_date;
                        
                        // Check if we already have this transaction
                        const existingTransaction = allTransactions.find(
                            t => (orderId && (t.order_id === orderId || t.id === orderId)) ||
                                 (t.plan_name === planName && amount > 0 && t.amount === amount)
                        );
                        
                        // For premium users with active subscription, always create a transaction entry
                        // even if some details are missing
                        if (!existingTransaction) {
                            // Create transaction entry from subscription data
                            const transaction = {
                                id: orderId || `sub_${activeSubData.active_plan_template_id || Date.now()}`,
                                order_id: orderId || `SUB-${activeSubData.active_plan_template_id || Date.now()}`,
                                plan_name: planName,
                                amount: amount,
                                status: subscription.status || subscription.payment_status || activeSubData.status || "completed",
                                created_at: createdAt || subscription.subscription_start_date || activeSubData.subscription_start_date || new Date().toISOString(),
                                description: `Subscription: ${planName}`,
                                payment_method: subscription.payment_method || subscription.payment_gateway || activeSubData.payment_method || "Razorpay",
                                subscription_end_date: subscription.subscription_end_date || subscription.end_date || activeSubData.subscription_end_date
                            };
                            allTransactions.push(transaction);
                            console.log("Created transaction from active subscription:", transaction);
                        }
                    }
                }
            } catch (err) {
                console.log("Active subscription endpoint not available or failed:", err);
            }
            
            
            // Sort transactions by date (newest first)
            allTransactions.sort((a, b) => {
                const dateA = new Date(a.created_at || a.date || a.timestamp || 0);
                const dateB = new Date(b.created_at || b.date || b.timestamp || 0);
                return dateB - dateA;
            });
            
            console.log("TransactionModal: Total transactions found:", allTransactions.length);
            setTransactions(allTransactions);
            
            if (allTransactions.length === 0) {
                console.log("TransactionModal: No transactions found from any endpoint");
                // Try to get user data to see if they have premium
                const userData = getUserData();
                console.log("TransactionModal: User data:", userData);
                console.log("TransactionModal: User subscription plan:", userData?.subscription_plan);
            }
        } catch (err) {
            console.error("TransactionModal: Failed to fetch transactions:", err);
            setError("Failed to load transactions. Please try again.");
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens
            setTransactions([]);
            setError("");
            // Small delay to ensure modal is fully rendered before fetching
            const timer = setTimeout(() => {
                fetchTransactions();
            }, 100);
            return () => clearTimeout(timer);
        } else {
            // Reset when modal closes
            setTransactions([]);
            setLoading(false);
            setError("");
        }
    }, [isOpen, fetchTransactions]);

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return "Invalid date";
        }
    };

    const formatAmount = (amount) => {
        if (amount === null || amount === undefined) return "N/A";
        return `₹${amount.toFixed(2)}`;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" 
                onClick={onClose}
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-4 md:p-6 max-h-[90vh] md:max-h-[80vh] overflow-y-auto"
                    style={{ position: 'relative', zIndex: 10000 }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Transaction History</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                                <p className="text-gray-600 text-sm">Loading transactions...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-red-600">{error}</p>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-600 font-medium">No transactions found</p>
                            {(() => {
                                const userData = getUserData();
                                const isPremium = userData?.subscription_plan === "premium" || 
                                                  localStorage.getItem("hasPremium") === "true";
                                if (isPremium) {
                                    return (
                                        <>
                                            <p className="text-sm text-gray-500 mt-2">
                                                Your subscription is active, but transaction details are not available.
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                This may be due to a test subscription or admin-granted access.
                                            </p>
                                        </>
                                    );
                                }
                                return (
                                    <p className="text-sm text-gray-500 mt-2">You haven't made any transactions yet</p>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((transaction, index) => (
                                <div
                                    key={transaction.id || index}
                                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {transaction.plan_name || transaction.description || "Subscription"}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {formatDate(transaction.created_at || transaction.date || transaction.timestamp)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-gray-900">
                                                {formatAmount(transaction.amount)}
                                            </p>
                                            <span
                                                className={`text-xs px-2 py-1 rounded ${
                                                    transaction.status === "success" || transaction.status === "completed"
                                                        ? "bg-green-100 text-green-700"
                                                        : transaction.status === "pending"
                                                        ? "bg-yellow-100 text-yellow-700"
                                                        : "bg-red-100 text-red-700"
                                                }`}
                                            >
                                                {transaction.status || "completed"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        {transaction.order_id && (
                                            <p className="text-xs text-gray-500">
                                                Order ID: {transaction.order_id}
                                            </p>
                                        )}
                                        {transaction.razorpay_order_id && (
                                            <p className="text-xs text-gray-500">
                                                Razorpay Order: {transaction.razorpay_order_id}
                                            </p>
                                        )}
                                        {transaction.razorpay_payment_id && (
                                            <p className="text-xs text-gray-500">
                                                Payment ID: {transaction.razorpay_payment_id}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

