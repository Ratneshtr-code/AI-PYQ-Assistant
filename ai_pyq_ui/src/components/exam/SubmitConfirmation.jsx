// src/components/exam/SubmitConfirmation.jsx
import { motion } from "framer-motion";

export default function SubmitConfirmation({ examData, selectedOptions, markedForReview, onClose, onConfirm }) {
    const totalQuestions = examData.questions.length;
    const answeredCount = Object.keys(selectedOptions).length;
    const notAnsweredCount = totalQuestions - answeredCount;
    const markedCount = Object.keys(markedForReview).length;
    const notVisitedCount = totalQuestions - Object.keys(selectedOptions).length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            >
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit your test</h2>
                    
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-gray-300">
                                <span className="text-gray-700 font-semibold">Total Questions:</span>
                                <span className="text-gray-900 font-bold text-lg">{totalQuestions}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-gray-300">
                                <span className="text-gray-700 font-semibold">Answered:</span>
                                <span className="text-green-600 font-bold text-lg">{answeredCount}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-gray-300">
                                <span className="text-gray-700 font-semibold">Not Answered:</span>
                                <span className="text-red-600 font-bold text-lg">{notAnsweredCount}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-gray-300">
                                <span className="text-gray-700 font-semibold">Marked for Review:</span>
                                <span className="text-purple-600 font-bold text-lg">{markedCount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700 font-semibold">Not Visited:</span>
                                <span className="text-gray-600 font-bold text-lg">{notVisitedCount}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                        <p className="text-sm text-yellow-800">
                            <strong>Note:</strong> Are you sure you want to submit? Once submitted, you cannot change your answers.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                        >
                            Close
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-6 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                        >
                            Submit
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

