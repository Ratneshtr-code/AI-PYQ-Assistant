// src/components/FeedbackModal.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authenticatedFetch } from "../utils/auth";

const API_BASE_URL = "";

export default function FeedbackModal({ isOpen, onClose }) {
    const [feedback, setFeedback] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (isOpen) {
            setFeedback("");
            setError("");
            setSuccess("");
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!feedback.trim()) {
            setError("Please enter your feedback");
            return;
        }

        setIsSubmitting(true);
        setError("");
        setSuccess("");

        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/feedback`, {
                method: "POST",
                body: JSON.stringify({ feedback: feedback.trim() }),
            });

            if (response.ok) {
                setFeedback("");
                setSuccess("Thank you for your feedback!");
                setTimeout(() => {
                    setSuccess("");
                    onClose();
                }, 2000);
            } else {
                setError("Failed to submit feedback. Please try again.");
            }
        } catch (err) {
            setError("Failed to submit feedback. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Share Your Feedback</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">
                        We'd love to hear your thoughts, suggestions, or report any issues you've encountered.
                    </p>

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                            {success}
                        </div>
                    )}

                    <div className="mb-4">
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Share your feedback, suggestions, or report issues..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={5}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !feedback.trim()}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Submitting..." : "Submit Feedback"}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

