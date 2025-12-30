// src/components/exam/QuestionPaperView.jsx
import { motion } from "framer-motion";

export default function QuestionPaperView({ questions, currentIndex, onClose, onNavigate }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
            >
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Question Paper</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                        ×
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {questions.map((question, index) => (
                            <div
                                key={question.question_id}
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                    index === currentIndex
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 hover:border-gray-300"
                                }`}
                                onClick={() => {
                                    onNavigate(index);
                                    onClose();
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="font-bold text-gray-700">Q. {index + 1})</span>
                                    <p className="text-gray-800 flex-1">{question.question_text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Back
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

