// components/conceptmap/InfoPopup.jsx
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function InfoPopup({ isOpen, onClose, data, position }) {
    if (!isOpen || !data) return null;

    const { title, description, info } = data;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black bg-opacity-30 z-40"
                    />
                    
                    {/* Popup Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 max-w-md w-full mx-4"
                        style={{
                            left: position?.x ? `${position.x}px` : "50%",
                            top: position?.y ? `${position.y}px` : "50%",
                            transform: position?.x ? "translate(-50%, -50%)" : "translate(-50%, -50%)",
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 max-h-96 overflow-y-auto">
                            {description && (
                                <p className="text-sm text-gray-700 mb-4">{description}</p>
                            )}
                            
                            {info && (
                                <div className="space-y-3">
                                    {typeof info === "object" ? (
                                        Object.entries(info).map(([key, value]) => (
                                            <div key={key} className="border-l-4 border-blue-500 pl-3">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                    {key.replace(/_/g, " ")}
                                                </p>
                                                <p className="text-sm text-gray-800 mt-1">
                                                    {typeof value === "object" ? JSON.stringify(value, null, 2) : value}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-700">{info}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

