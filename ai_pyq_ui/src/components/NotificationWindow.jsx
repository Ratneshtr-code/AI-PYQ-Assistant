// src/components/NotificationWindow.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { buildApiUrl } from "../config/apiConfig";
import { useLanguage } from "../contexts/LanguageContext";

export default function NotificationWindow({ examName }) {
    const { language } = useLanguage();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!examName) {
            setLoading(false);
            return;
        }

        const fetchNotifications = async () => {
            try {
                setLoading(true);
                // Fetch from API endpoint - backend should read from D:\Project\ai_pyq\data\notification\<examName>.json
                const apiUrl = buildApiUrl(`notifications/${encodeURIComponent(examName)}`);
                console.log("🔔 [NotificationWindow] Fetching from:", apiUrl);
                
                const response = await fetch(apiUrl, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                });

                console.log("🔔 [NotificationWindow] Response status:", response.status);

                if (response.ok) {
                    const data = await response.json();
                    console.log("🔔 [NotificationWindow] Data received:", data);
                    
                    // Filter notifications by expiry date
                    const now = new Date();
                    const activeNotifications = (data.notifications || []).filter(notif => {
                        if (!notif.expiry_date) return true; // If no expiry, show it
                        const expiryDate = new Date(notif.expiry_date);
                        const isActive = expiryDate >= now;
                        if (!isActive) {
                            console.log(`🔔 [NotificationWindow] Notification "${notif.title}" expired on ${notif.expiry_date}`);
                        }
                        return isActive;
                    });
                    
                    console.log("🔔 [NotificationWindow] Active notifications:", activeNotifications.length);
                    setNotifications(activeNotifications);
                } else {
                    // API endpoint not available or no notifications found
                    console.log(`🔔 [NotificationWindow] API returned ${response.status}. Backend endpoint /notifications/${examName} may not be implemented yet.`);
                    setNotifications([]);
                }
            } catch (err) {
                console.error("🔔 [NotificationWindow] Error fetching notifications:", err);
                setNotifications([]);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [examName]);

    // Auto-rotate notifications every 5 seconds
    useEffect(() => {
        if (notifications.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % notifications.length);
        }, 5000); // Change notification every 5 seconds

        return () => clearInterval(interval);
    }, [notifications.length]);


    if (loading) {
        return null;
    }

    if (notifications.length === 0) {
        return null;
    }

    const currentNotification = notifications[currentIndex];

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4"
        >
            <div className="relative rounded-xl shadow-lg overflow-hidden border-2 border-amber-300/50">
                {/* Colorful Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50"></div>
                
                {/* Animated Border Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-yellow-400/20 to-orange-400/20 animate-pulse"></div>
                
                {/* Content */}
                <div className="relative py-2.5 md:py-3 px-4 md:px-5">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentNotification.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4 }}
                            className="flex items-center gap-2.5"
                        >
                            {/* Notification Icon */}
                            <div className="flex-shrink-0">
                                <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                                    <span className="text-white text-xs md:text-sm">🔔</span>
                                </div>
                            </div>
                            
                            {/* Notification Text */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm md:text-base leading-snug">
                                    <span className="font-semibold text-amber-900 bg-amber-100/50 px-1.5 py-0.5 rounded-md inline-block mr-2">
                                        {currentNotification.title}
                                    </span>
                                    {currentNotification.message && (
                                        <span className="text-amber-800 font-normal">
                                            {` : ${currentNotification.message}`}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation Dots - Only show if more than 1 notification */}
                    {notifications.length > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-2.5 pt-2 border-t border-amber-200/50">
                            {notifications.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentIndex(index)}
                                    className={`rounded-full transition-all ${
                                        index === currentIndex
                                            ? "w-8 h-2 bg-gradient-to-r from-amber-500 to-orange-500 shadow-sm"
                                            : "w-2 h-2 bg-amber-300/50 hover:bg-amber-400/70"
                                    }`}
                                    aria-label={`Go to notification ${index + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

