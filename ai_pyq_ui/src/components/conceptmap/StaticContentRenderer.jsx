// components/conceptmap/StaticContentRenderer.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { buildApiUrl } from "../../config/apiConfig";

export default function StaticContentRenderer({ topic }) {
    const [imageUrl, setImageUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!topic || !topic.path) {
            setImageUrl(null);
            setLoading(false);
            setError(null);
            return;
        }

        // Reset state when topic changes
        setLoading(true);
        setError(null);
        setImageUrl(null);

        // Build URL for static content
        const url = buildApiUrl(`conceptmap/static/${topic.path}`);
        setImageUrl(url);
        
        // Preload image to check if it exists
        const img = new Image();
        img.onload = () => {
            setLoading(false);
            setError(null);
        };
        img.onerror = () => {
            setLoading(false);
            setError(`Image not found: ${topic.path}`);
        };
        img.src = url;
    }, [topic]);

    if (!topic || !topic.path) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                    <p className="text-gray-500 text-lg">No content available</p>
                    <p className="text-gray-400 text-sm mt-2">Select a topic to view content</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                    <p className="text-gray-600">Loading content...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                    <div className="text-4xl mb-3">📄</div>
                    <p className="text-gray-500 text-lg">Content not available</p>
                    <p className="text-gray-400 text-sm mt-2">The file "{topic.path}" could not be found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg p-4 overflow-auto">
            <motion.img
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                src={imageUrl}
                alt={topic.title || "Concept Map Content"}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                style={{ 
                    maxWidth: "100%",
                    maxHeight: "100%",
                    width: "auto",
                    height: "auto"
                }}
            />
        </div>
    );
}

