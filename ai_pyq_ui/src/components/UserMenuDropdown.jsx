// src/components/UserMenuDropdown.jsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getUserData } from "../utils/auth";

export default function UserMenuDropdown({ isOpen, onClose, onSignOut, userName, userInitials, subscriptionPlan, isCollapsed, onOpenFeedback, toggleButtonRef }) {
    const navigate = useNavigate();
    const dropdownRef = useRef(null);
    const userData = getUserData();
    const isAdmin = userData?.is_admin === true;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if click is inside the dropdown
            const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
            // Check if click is on the toggle button
            const isOnToggleButton = toggleButtonRef && toggleButtonRef.current && toggleButtonRef.current.contains(event.target);
            
            // Only close if click is outside both dropdown and toggle button
            if (!isInsideDropdown && !isOnToggleButton) {
                onClose();
            }
        };

        if (isOpen) {
            // Use a small delay to allow the toggle click to process first
            setTimeout(() => {
                document.addEventListener("mousedown", handleClickOutside);
            }, 0);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose, toggleButtonRef]);

    if (!isOpen) return null;

    const menuItems = [
        {
            id: "account",
            label: "My Account",
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
            onClick: () => {
                navigate("/account");
                onClose();
            }
        },
        {
            id: "subscription",
            label: "Subscription",
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
            ),
            badge: subscriptionPlan === "Premium" ? "Premium" : "Free",
            badgeColor: subscriptionPlan === "Premium" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700",
            onClick: () => {
                navigate("/subscription");
                onClose();
            }
        },
        {
            id: "feedback",
            label: "Feedback",
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
            ),
            onClick: () => {
                if (onOpenFeedback) {
                    onOpenFeedback();
                }
                onClose();
            }
        },
        {
            id: "help",
            label: "Help",
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            onClick: () => {
                // Navigate to help or open help modal
                onClose();
            }
        },
        {
            id: "logout",
            label: "Log out",
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
            ),
            onClick: () => {
                onSignOut();
                onClose();
            },
            className: "text-red-600 hover:bg-red-50"
        }
    ];

    return (
        <div
            ref={dropdownRef}
            className={`absolute bottom-full mb-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 ${
                isCollapsed ? "left-0" : "left-0"
            }`}
        >
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {userInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {userName}
                        </p>
                        {isAdmin && (
                            <span className="text-xs text-purple-600 font-medium">Admin</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={item.onClick}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors ${
                            item.className || ""
                        }`}
                    >
                        <span className="flex-shrink-0">{item.icon}</span>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${item.badgeColor}`}>
                                {item.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

