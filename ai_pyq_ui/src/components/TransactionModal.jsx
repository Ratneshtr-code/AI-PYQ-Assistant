// src/components/TransactionModal.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authenticatedFetch } from "../utils/auth";

export default function TransactionModal({ isOpen, onClose }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) {
            fetchTransactions();
        }
    }, [isOpen]);

    const fetchTransactions = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await authenticatedFetch("/payment/transactions");
            if (response.ok) {
                const data = await response.json();
                setTransactions(data.transactions || data || []);
            } else if (response.status === 404) {
                // No transactions endpoint or no transactions
                setTransactions([]);
            } else {
                setError("Failed to load transactions");
            }
        } catch (err) {
            console.error("Failed to fetch transactions:", err);
            setError("Failed to load transactions");
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto"
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
                            <p className="text-sm text-gray-500 mt-2">You haven't made any transactions yet</p>
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
                                    {transaction.order_id && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Order ID: {transaction.order_id}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

