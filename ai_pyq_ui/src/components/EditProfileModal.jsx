// src/components/EditProfileModal.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function EditProfileModal({ isOpen, onClose, currentFullName, currentUsername, currentMobileNumber, onSave }) {
    const [fullName, setFullName] = useState(currentFullName || "");
    const [username, setUsername] = useState(currentUsername || "");
    const [mobileNumber, setMobileNumber] = useState(currentMobileNumber || "");
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) {
            setFullName(currentFullName || "");
            setUsername(currentUsername || "");
            setMobileNumber(currentMobileNumber || "");
            setError("");
        }
    }, [isOpen, currentFullName, currentUsername, currentMobileNumber]);

    const handleSave = () => {
        if (!fullName.trim()) {
            setError("Full name cannot be empty");
            return;
        }
        if (!username.trim()) {
            setError("Username cannot be empty");
            return;
        }
        if (username.length < 3 || username.length > 20) {
            setError("Username must be 3-20 characters");
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setError("Username can only contain letters, numbers, and underscores");
            return;
        }
        // Validate mobile number if provided
        if (mobileNumber.trim() && !/^\+?[1-9]\d{9,14}$/.test(mobileNumber.trim())) {
            setError("Mobile number must be 10-15 digits (international format with + prefix allowed)");
            return;
        }
        onSave({ 
            fullName: fullName.trim(), 
            username: username.trim(),
            mobileNumber: mobileNumber.trim() || null
        });
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
                    className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Edit Profile</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your full name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter username"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                3-20 characters, letters, numbers, and underscores only
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mobile Number
                            </label>
                            <input
                                type="tel"
                                value={mobileNumber}
                                onChange={(e) => setMobileNumber(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter mobile number (e.g., +91 9876543210)"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Optional: 10-15 digits, international format with + prefix allowed
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

