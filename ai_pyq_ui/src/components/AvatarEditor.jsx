// src/components/AvatarEditor.jsx
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AvatarEditor({ isOpen, onClose, currentInitials, currentName, onSave }) {
    const [mode, setMode] = useState("initials"); // "initials" or "upload"
    const [initials, setInitials] = useState(currentInitials || "");
    const [avatarColor, setAvatarColor] = useState("#14b8a6"); // Default teal
    const [uploadedImage, setUploadedImage] = useState(null);
    const [uploadPreview, setUploadPreview] = useState(null);
    const fileInputRef = useRef(null);

    const colorOptions = [
        { name: "Teal", value: "#14b8a6" },
        { name: "Blue", value: "#3b82f6" },
        { name: "Purple", value: "#8b5cf6" },
        { name: "Pink", value: "#ec4899" },
        { name: "Orange", value: "#f97316" },
        { name: "Green", value: "#10b981" },
        { name: "Indigo", value: "#6366f1" },
        { name: "Red", value: "#ef4444" },
    ];

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("File size must be less than 5MB");
                return;
            }
            if (!file.type.startsWith("image/")) {
                alert("Please select an image file");
                return;
            }
            setUploadedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (mode === "initials") {
            onSave({
                type: "initials",
                initials: initials || currentInitials,
                color: avatarColor,
            });
        } else {
            if (!uploadedImage) {
                alert("Please select an image");
                return;
            }
            onSave({
                type: "image",
                image: uploadedImage,
                preview: uploadPreview,
            });
        }
        onClose();
    };

    const handleRemoveImage = () => {
        setUploadedImage(null);
        setUploadPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
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
                        <h2 className="text-xl font-semibold text-gray-900">Edit Avatar</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setMode("initials")}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                                mode === "initials"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            Use Initials
                        </button>
                        <button
                            onClick={() => setMode("upload")}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                                mode === "upload"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            Upload Image
                        </button>
                    </div>

                    {/* Initials Mode */}
                    {mode === "initials" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center">
                                <div
                                    className="w-24 h-24 rounded-full flex items-center justify-center text-white font-semibold text-2xl"
                                    style={{ backgroundColor: avatarColor }}
                                >
                                    {initials || currentInitials}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Initials
                                </label>
                                <input
                                    type="text"
                                    value={initials}
                                    onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 2))}
                                    placeholder={currentInitials}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    maxLength={2}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Color
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {colorOptions.map((color) => (
                                        <button
                                            key={color.value}
                                            onClick={() => setAvatarColor(color.value)}
                                            className={`h-10 rounded-lg border-2 transition-all ${
                                                avatarColor === color.value
                                                    ? "border-gray-900 scale-110"
                                                    : "border-gray-200 hover:border-gray-300"
                                            }`}
                                            style={{ backgroundColor: color.value }}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Upload Mode */}
                    {mode === "upload" && (
                        <div className="space-y-4">
                            {uploadPreview ? (
                                <div className="flex flex-col items-center">
                                    <div className="relative">
                                        <img
                                            src={uploadPreview}
                                            alt="Avatar preview"
                                            className="w-24 h-24 rounded-full object-cover"
                                        />
                                        <button
                                            onClick={handleRemoveImage}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center">
                                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="avatar-upload"
                                />
                                <label
                                    htmlFor="avatar-upload"
                                    className="block w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-center cursor-pointer hover:bg-blue-700 transition-colors"
                                >
                                    {uploadPreview ? "Change Image" : "Choose Image"}
                                </label>
                                <p className="text-xs text-gray-500 mt-2 text-center">
                                    Max 5MB. JPG, PNG, or GIF
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

