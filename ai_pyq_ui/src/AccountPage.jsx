// src/AccountPage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import AvatarEditor from "./components/AvatarEditor";
import EditProfileModal from "./components/EditProfileModal";
import TransactionModal from "./components/TransactionModal";
import { getCurrentUser, getUserData, authenticatedFetch, setUserData } from "./utils/auth";
import { useProgressTracking } from "./hooks/useProgressTracking";
import { buildApiUrl } from "./config/apiConfig";

// API URLs are now handled by buildApiUrl from apiConfig

export default function AccountPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [examsList, setExamsList] = useState([]);
    const [userIsAdmin, setUserIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // User data state
    const [userData, setUserDataState] = useState(null);
    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [mobileNumber, setMobileNumber] = useState("");
    const [refreshKey, setRefreshKey] = useState(0); // Force re-render when subscription changes
    const [subscriptionPlan, setSubscriptionPlan] = useState("free"); // Subscription plan state for reactive updates
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Force re-render when subscription changes
    
    // Edit states
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isEditingAvatar, setIsEditingAvatar] = useState(false);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    
    // Tabs
    const [activeTab, setActiveTab] = useState("notes"); // "notes" or "progress"
    
    // Subscription plans
    const [availablePlans, setAvailablePlans] = useState([]);
    const [plansLoading, setPlansLoading] = useState(false);
    const [activePlanTemplateId, setActivePlanTemplateId] = useState(null);
    
    // Password change form
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    // Messages
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    
    // Progress Overview
    const [selectedExam, setSelectedExam] = useState("");
    const { fetchProgress, progressData: progressOverviewData, loading: progressLoading } = useProgressTracking();
    
    // My Notes
    const [notesCount, setNotesCount] = useState(null);
    
    // Feedback
    const [feedback, setFeedback] = useState("");
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    
    // Language preference
    const [language, setLanguage] = useState(localStorage.getItem("language") || "en");
    const [supportedLanguages, setSupportedLanguages] = useState([]);
    const [languagesLoading, setLanguagesLoading] = useState(true);
    
    // Account deletion
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");

    // Separate effect to refresh data when page becomes visible (user navigates back)
    useEffect(() => {
        const handleFocus = () => {
            // When user returns to this tab/page, refresh user data
            console.log("AccountPage: Page focused, refreshing user data...");
            const loadUserData = async () => {
                try {
                    const cachedUserData = getUserData();
                    if (cachedUserData) {
                        setUserDataState(cachedUserData);
                        setFullName(cachedUserData.full_name || "");
                        setUsername(cachedUserData.username || "");
                        setEmail(cachedUserData.email || "");
                        setMobileNumber(cachedUserData.mobile_number || "");
                        setUserIsAdmin(cachedUserData.is_admin === true);
                    }
                    // Also fetch fresh data from backend
                    getCurrentUser()
                        .then(user => {
                            if (user) {
                                setUserDataState(user);
                                setFullName(user.full_name || "");
                                setUsername(user.username || "");
                                setEmail(user.email || "");
                                setUserIsAdmin(user.is_admin === true);
                            }
                        })
                        .catch(() => {
                            // Ignore errors
                        });
                } catch (err) {
                    console.error("Failed to refresh user data:", err);
                }
            };
            loadUserData();
        };
        
        window.addEventListener("focus", handleFocus);
        return () => {
            window.removeEventListener("focus", handleFocus);
        };
    }, []);

    useEffect(() => {
        // Fetch exams list for sidebar
        const fetchExams = async () => {
            try {
                const res = await fetch(buildApiUrl("filters"));
                const data = await res.json();
                setExamsList(data.exams || []);
            } catch (err) {
                console.error("Failed to fetch exams:", err);
            }
        };
        fetchExams();
        
        // Fetch notes count
        const fetchNotesCount = async () => {
            try {
                const response = await authenticatedFetch("/notes/stats");
                if (response.ok) {
                    const data = await response.json();
                    setNotesCount(data.total || 0);
                } else {
                    // Endpoint might not exist, set to null to hide count
                    setNotesCount(null);
                }
            } catch (err) {
                // Endpoint might not exist, set to null to hide count
                console.error("Failed to fetch notes count:", err);
                setNotesCount(null);
            }
        };
        fetchNotesCount();
        
        // Fetch subscription plans
        const fetchPlans = async () => {
            setPlansLoading(true);
            try {
                const res = await fetch(`${buildApiUrl("subscription-plans")}?t=${Date.now()}`, {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                });
                if (res.ok) {
                    const plans = await res.json();
                    setAvailablePlans(plans || []);
                } else {
                    setAvailablePlans([]);
                }
            } catch (err) {
                console.error("Failed to fetch subscription plans:", err);
                setAvailablePlans([]);
            } finally {
                setPlansLoading(false);
            }
        };
        fetchPlans();
        
        // Fetch active subscription plan template ID
        const fetchActiveSubscription = async () => {
            try {
                const res = await authenticatedFetch("/payment/active-subscription");
                if (res.ok) {
                    const data = await res.json();
                    if (data.is_active && data.active_plan_template_id) {
                        setActivePlanTemplateId(data.active_plan_template_id);
                    } else {
                        setActivePlanTemplateId(null);
                    }
                } else {
                    setActivePlanTemplateId(null);
                }
            } catch (err) {
                console.error("Failed to fetch active subscription:", err);
                setActivePlanTemplateId(null);
            }
        };
        fetchActiveSubscription();

        // Load user data
        const loadUserData = async () => {
            try {
                // First, try to use cached user data for immediate UI update
                const cachedUserData = getUserData();
                if (cachedUserData) {
                    setUserDataState(cachedUserData);
                    setFullName(cachedUserData.full_name || "");
                    setUsername(cachedUserData.username || "");
                    setEmail(cachedUserData.email || "");
                    setUserIsAdmin(cachedUserData.is_admin === true);
                    setLoading(false);
                }
                
                // OPTIONAL: Try to fetch fresh data from backend
                // If this fails, we just keep using cached data
                getCurrentUser()
                    .then(user => {
                        if (user) {
                            setUserDataState(user);
                            setFullName(user.full_name || "");
                            setUsername(user.username || "");
                            setEmail(user.email || "");
                            setMobileNumber(user.mobile_number || "");
                            setUserIsAdmin(user.is_admin === true);
                            // Update subscription plan state
                            if (user.subscription_plan) {
                                const plan = user.subscription_plan.toLowerCase();
                                setSubscriptionPlan(plan);
                                console.log("AccountPage: Updated subscription plan from backend:", plan);
                            }
                        }
                    })
                    .catch(() => {
                        // Ignore errors - keep using cached data
                    });
            } catch (err) {
                console.error("Failed to load user data:", err);
            } finally {
                setLoading(false);
            }
        };
        loadUserData();
        
        // Re-check when user logs in/out or subscription changes
        const handleUserChange = () => {
            console.log("AccountPage: User data changed, refreshing...");
            // Immediately update from localStorage (fastest)
            const cachedData = getUserData();
            console.log("AccountPage: Cached user data:", cachedData);
            if (cachedData?.subscription_plan) {
                const plan = cachedData.subscription_plan.toLowerCase();
                setSubscriptionPlan(plan);
                console.log("AccountPage: Immediately updated subscription plan to:", plan);
            }
            // Also check hasPremium flag
            const hasPremium = cachedData?.hasPremium === true || localStorage.getItem("hasPremium") === "true";
            console.log("AccountPage: hasPremium flag:", hasPremium);
            // Force immediate state update
            setRefreshKey(prev => prev + 1);
            // Then refresh user data from backend
            loadUserData(); // Refresh user data including subscription
        };
        
        // Also refresh when page becomes visible (user navigates back)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log("AccountPage: Page visible, refreshing user data...");
                loadUserData();
            }
        };
        
        window.addEventListener("userLoggedIn", handleUserChange);
        window.addEventListener("userLoggedOut", handleUserChange);
        window.addEventListener("premiumStatusChanged", handleUserChange); // Listen for subscription changes
        window.addEventListener("userProfileUpdated", handleUserChange); // Listen for profile updates
        document.addEventListener("visibilitychange", handleVisibilityChange);
        
        return () => {
            window.removeEventListener("userLoggedIn", handleUserChange);
            window.removeEventListener("userLoggedOut", handleUserChange);
            window.removeEventListener("premiumStatusChanged", handleUserChange);
            window.removeEventListener("userProfileUpdated", handleUserChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    // Refresh user data when navigating to this page (location change)
    useEffect(() => {
        if (location.pathname === "/account") {
            const refreshUserData = async () => {
                console.log("AccountPage: Location changed to /account, refreshing user data...");
                try {
                    // Always get latest from localStorage first (immediate update)
                    const cachedUserData = getUserData();
                    console.log("AccountPage: Cached subscription_plan:", cachedUserData?.subscription_plan);
                    if (cachedUserData) {
                        setUserDataState(cachedUserData);
                        setFullName(cachedUserData.full_name || "");
                        setUsername(cachedUserData.username || "");
                        setEmail(cachedUserData.email || "");
                        setMobileNumber(cachedUserData.mobile_number || "");
                        setUserIsAdmin(cachedUserData.is_admin === true);
                        // Update subscription plan immediately from cached data
                        if (cachedUserData.subscription_plan) {
                            const plan = cachedUserData.subscription_plan.toLowerCase();
                            setSubscriptionPlan(plan);
                            console.log("AccountPage: Immediately set subscription plan from cache:", plan);
                        }
                    }
                    // Force immediate re-render
                    setRefreshKey(prev => prev + 1);
                    // Then fetch fresh from backend
                    const user = await getCurrentUser();
                    if (user) {
                        console.log("AccountPage: Backend subscription_plan:", user.subscription_plan);
                        setUserDataState(user);
                        setFullName(user.full_name || "");
                        setUsername(user.username || "");
                        setEmail(user.email || "");
                        setUserIsAdmin(user.is_admin === true);
                        // Update subscription plan from backend data
                        if (user.subscription_plan) {
                            const plan = user.subscription_plan.toLowerCase();
                            setSubscriptionPlan(plan);
                            console.log("AccountPage: Updated subscription plan from backend:", plan);
                        }
                        // Update localStorage with fresh data
                        setUserData(user);
                    }
                    setRefreshKey(prev => prev + 1); // Force re-render again after backend fetch
                } catch (err) {
                    console.error("Failed to refresh user data on navigation:", err);
                }
            };
            refreshUserData();
        }
    }, [location.pathname]); // Refresh when pathname changes (user navigates to this page)
    
    // Auto-select exam with most progress on page load
    useEffect(() => {
        const autoSelectBestExam = async () => {
            // Only run if no exam is selected and we have exams list
            if (selectedExam || examsList.length === 0) {
                return;
            }
            
            try {
                // Fetch progress for all exams in parallel
                const progressPromises = examsList.map(async (exam) => {
                    try {
                        const response = await fetch(buildApiUrl(`roadmap/progress/${encodeURIComponent(exam)}`), {
                            credentials: "include"
                        });
                        if (response.ok) {
                            const data = await response.json();
                            return { exam, progress: data };
                        }
                        return { exam, progress: null };
                    } catch (err) {
                        console.error(`Failed to fetch progress for ${exam}:`, err);
                        return { exam, progress: null };
                    }
                });
                
                const results = await Promise.all(progressPromises);
                
                // Find exam with highest progress percentage
                let bestExam = null;
                let highestProgress = -1;
                
                results.forEach(({ exam, progress }) => {
                    if (progress && progress.progress_percentage !== undefined) {
                        if (progress.progress_percentage > highestProgress) {
                            highestProgress = progress.progress_percentage;
                            bestExam = exam;
                        }
                    }
                });
                
                // If we found an exam with progress, select it
                if (bestExam) {
                    console.log(`Auto-selected exam with highest progress: ${bestExam} (${highestProgress.toFixed(1)}%)`);
                    setSelectedExam(bestExam);
                } else if (examsList.length > 0) {
                    // If no progress found, select the first exam as fallback
                    setSelectedExam(examsList[0]);
                }
            } catch (err) {
                console.error("Failed to auto-select exam:", err);
                // Fallback to first exam if available
                if (examsList.length > 0) {
                    setSelectedExam(examsList[0]);
                }
            }
        };
        
        // Run auto-select after a short delay to ensure exams list is loaded
        const timer = setTimeout(() => {
            autoSelectBestExam();
        }, 500);
        
        return () => clearTimeout(timer);
    }, [examsList, selectedExam]);
    
    // Fetch progress when exam is selected
    useEffect(() => {
        if (selectedExam) {
            fetchProgress(selectedExam);
        }
    }, [selectedExam, fetchProgress]);
    
    // Get user initials for avatar
    const getUserInitials = () => {
        const name = fullName || username || "User";
        const names = name.split(" ");
        return names.length > 1 
            ? (names[0][0] + names[1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase();
    };
    
    // Handle edit profile save
    const handleEditProfileSave = async ({ fullName: newFullName, username: newUsername, mobileNumber: newMobileNumber }) => {
        try {
            // Update all fields
            const response = await authenticatedFetch(buildApiUrl("auth/profile"), {
                method: "PUT",
                body: JSON.stringify({ 
                    full_name: newFullName,
                    username: newUsername,
                    mobile_number: newMobileNumber
                }),
            });
            
            if (response.ok) {
                const updatedUser = await response.json();
                setUserData(updatedUser);
                setUserDataState(updatedUser);
                setFullName(newFullName);
                setUsername(newUsername);
                setMobileNumber(newMobileNumber || "");
                setIsEditProfileOpen(false);
                setSuccessMessage("Profile updated successfully!");
                setTimeout(() => setSuccessMessage(""), 3000);
                window.dispatchEvent(new Event("userProfileUpdated"));
                window.dispatchEvent(new Event("userLoggedIn"));
            } else {
                const error = await response.json();
                setErrorMessage(error.detail || "Failed to update profile. Please try again.");
            }
        } catch (err) {
            setErrorMessage("Failed to update profile. Please try again.");
        }
    };
    
    // Handle avatar save
    const handleAvatarSave = async (avatarData) => {
        try {
            if (avatarData.type === "image") {
                // Upload image
                const formData = new FormData();
                formData.append("avatar", avatarData.image);
                
                // For FormData, we need to let the browser set Content-Type with boundary
                const response = await fetch(buildApiUrl("auth/profile/avatar"), {
                    method: "PUT",
                    credentials: "include",
                    body: formData,
                });
                
                if (response.ok) {
                    const updatedUser = await response.json();
                    setUserData(updatedUser);
                    setUserDataState(updatedUser);
                    setSuccessMessage("Avatar updated successfully!");
                    setTimeout(() => setSuccessMessage(""), 3000);
                    window.dispatchEvent(new Event("userProfileUpdated"));
                } else {
                    setErrorMessage("Failed to update avatar. Please try again.");
                }
            } else {
                // Save initials/color preference (store in localStorage for now)
                localStorage.setItem("avatarInitials", avatarData.initials);
                localStorage.setItem("avatarColor", avatarData.color);
                setSuccessMessage("Avatar preferences saved!");
                setTimeout(() => setSuccessMessage(""), 3000);
            }
        } catch (err) {
            setErrorMessage("Failed to update avatar. Please try again.");
        }
    };
    
    // Handle feedback submission
    const handleSubmitFeedback = async () => {
        if (!feedback.trim()) {
            setErrorMessage("Please enter your feedback");
            return;
        }
        
        setIsSubmittingFeedback(true);
        setErrorMessage("");
        
        try {
            const response = await authenticatedFetch(buildApiUrl("feedback"), {
                method: "POST",
                body: JSON.stringify({ feedback: feedback.trim() }),
            });
            
            if (response.ok) {
                setFeedback("");
                setSuccessMessage("Thank you for your feedback!");
                setTimeout(() => setSuccessMessage(""), 3000);
            } else {
                setErrorMessage("Failed to submit feedback. Please try again.");
            }
        } catch (err) {
            setErrorMessage("Failed to submit feedback. Please try again.");
        } finally {
            setIsSubmittingFeedback(false);
        }
    };
    
    // Fetch supported languages from backend
    useEffect(() => {
        const fetchLanguages = async () => {
            try {
                const response = await authenticatedFetch(buildApiUrl("auth/supported-languages"));
                if (response.ok) {
                    const data = await response.json();
                    setSupportedLanguages(data.languages || []);
                } else {
                    // Fallback to default languages if API fails
                    setSupportedLanguages([
                        { code: "en", name: "English" },
                        { code: "hi", name: "Hindi" },
                    ]);
                }
            } catch (err) {
                console.error("Failed to fetch languages:", err);
                // Fallback to default languages
                setSupportedLanguages([
                    { code: "en", name: "English" },
                    { code: "hi", name: "Hindi" },
                ]);
            } finally {
                setLanguagesLoading(false);
            }
        };
        fetchLanguages();
    }, []);

    // Load language preference from user data
    useEffect(() => {
        if (userData?.preferred_language) {
            setLanguage(userData.preferred_language);
            localStorage.setItem("language", userData.preferred_language);
        } else {
            // Check localStorage as fallback
            const storedLanguage = localStorage.getItem("language");
            if (storedLanguage) {
                setLanguage(storedLanguage);
            }
        }
    }, [userData]);

    // Handle language change
    const handleLanguageChange = async (newLanguage) => {
        setLanguage(newLanguage);
        localStorage.setItem("language", newLanguage);
        
        // Save to backend
        try {
            const response = await authenticatedFetch(buildApiUrl("auth/profile"), {
                method: "PUT",
                body: JSON.stringify({ preferred_language: newLanguage }),
            });
            
            if (response.ok) {
                const updatedUser = await response.json();
                setUserData(updatedUser);
                setUserDataState(updatedUser);
                setSuccessMessage("Language preference saved!");
                setTimeout(() => setSuccessMessage(""), 3000);
                window.dispatchEvent(new Event("userProfileUpdated"));
            } else {
                setErrorMessage("Failed to save language preference. Please try again.");
            }
        } catch (err) {
            console.error("Failed to save language preference:", err);
            setErrorMessage("Failed to save language preference. Please try again.");
        }
    };
    
    // Handle data export
    const handleExportData = async () => {
        try {
            const response = await authenticatedFetch(buildApiUrl("user/export"));
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `user-data-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setSuccessMessage("Data exported successfully!");
                setTimeout(() => setSuccessMessage(""), 3000);
            } else {
                // Fallback: export from localStorage
                const userData = getUserData();
                const dataStr = JSON.stringify(userData, null, 2);
                const blob = new Blob([dataStr], { type: "application/json" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `user-data-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setSuccessMessage("Data exported successfully!");
                setTimeout(() => setSuccessMessage(""), 3000);
            }
        } catch (err) {
            setErrorMessage("Failed to export data. Please try again.");
        }
    };
    
    // Handle account deletion
    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== "DELETE") {
            setErrorMessage("Please type DELETE to confirm");
            return;
        }
        
        try {
            const response = await authenticatedFetch(buildApiUrl("auth/account"), {
                method: "DELETE",
            });
            
            if (response.ok) {
                // Clear local storage
                localStorage.clear();
                // Dispatch logout event
                window.dispatchEvent(new Event("userLoggedOut"));
                // Redirect to home and log out
                navigate("/", { replace: true });
                // Force page reload to ensure complete logout
                setTimeout(() => {
                    window.location.href = "/";
                }, 500);
            } else {
                setErrorMessage("Failed to delete account. Please try again.");
            }
        } catch (err) {
            setErrorMessage("Failed to delete account. Please try again.");
        }
    };

    const handleUpdateName = async () => {
        if (!fullName.trim()) {
            setErrorMessage("Name cannot be empty");
            return;
        }
        
        setErrorMessage("");
        setSuccessMessage("");
        
        try {
            const response = await authenticatedFetch(buildApiUrl("auth/profile"), {
                method: "PUT",
                body: JSON.stringify({ full_name: fullName.trim() }),
            });
            
            if (response.ok) {
                const updatedUser = await response.json();
                setUserData(updatedUser);
                setUserDataState(updatedUser);
                setIsEditingName(false);
                setSuccessMessage("Name updated successfully!");
                setTimeout(() => setSuccessMessage(""), 3000);
                // Dispatch event to update Sidebar
                window.dispatchEvent(new Event("userProfileUpdated"));
                window.dispatchEvent(new Event("userLoggedIn")); // Refresh user data
            } else if (response.status === 401) {
                // Token is invalid - prompt user to login again
                setErrorMessage("Your session has expired. Please sign out and sign in again to continue.");
            } else {
                try {
                    const error = await response.json();
                    setErrorMessage(error.detail || "Failed to update name. Please try again.");
                } catch {
                    setErrorMessage("Failed to update name. Please try again.");
                }
            }
        } catch (err) {
            if (err.message && err.message.includes("Failed to fetch")) {
                setErrorMessage("Cannot connect to server. Please check your connection.");
            } else if (err.message && err.message.includes("No authentication token")) {
                setErrorMessage("You are not logged in. Please sign in to continue.");
            } else {
                setErrorMessage(err.message || "Failed to update name. Please try again.");
            }
        }
    };

    const handleUpdateUsername = async () => {
        if (!username.trim()) {
            setErrorMessage("Username cannot be empty");
            return;
        }
        
        if (username.length < 3 || username.length > 20) {
            setErrorMessage("Username must be 3-20 characters");
            return;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setErrorMessage("Username can only contain letters, numbers, and underscores");
            return;
        }
        
        setErrorMessage("");
        setSuccessMessage("");
        
        try {
            const response = await authenticatedFetch(buildApiUrl("auth/profile"), {
                method: "PUT",
                body: JSON.stringify({ username: username.trim() }),
            });
            
            if (response.ok) {
                const updatedUser = await response.json();
                setUserData(updatedUser);
                setUserDataState(updatedUser);
                setIsEditingUsername(false);
                setSuccessMessage("Username updated successfully!");
                setTimeout(() => setSuccessMessage(""), 3000);
                // Dispatch event to update Sidebar
                window.dispatchEvent(new Event("userProfileUpdated"));
                window.dispatchEvent(new Event("userLoggedIn")); // Refresh user data
            } else if (response.status === 401) {
                // Token is invalid - prompt user to login again
                setErrorMessage("Your session has expired. Please sign out and sign in again to continue.");
            } else {
                try {
                    const error = await response.json();
                    setErrorMessage(error.detail || "Failed to update username. Please try again.");
                } catch {
                    setErrorMessage("Failed to update username. Please try again.");
                }
            }
        } catch (err) {
            if (err.message && err.message.includes("Failed to fetch")) {
                setErrorMessage("Cannot connect to server. Please check your connection.");
            } else if (err.message && err.message.includes("No authentication token")) {
                setErrorMessage("You are not logged in. Please sign in to continue.");
            } else {
                setErrorMessage(err.message || "Failed to update username. Please try again.");
            }
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setErrorMessage("All password fields are required");
            return;
        }
        
        if (newPassword.length < 8) {
            setErrorMessage("New password must be at least 8 characters");
            return;
        }
        
        if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
            setErrorMessage("New password must contain uppercase, lowercase, and numbers");
            return;
        }
        
        if (newPassword !== confirmPassword) {
            setErrorMessage("New passwords do not match");
            return;
        }
        
        setErrorMessage("");
        setSuccessMessage("");
        
        try {
            const response = await authenticatedFetch(buildApiUrl("auth/change-password"), {
                method: "PUT",
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                }),
            });
            
            if (response.ok) {
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setIsChangingPassword(false);
                setSuccessMessage("Password changed successfully!");
                setTimeout(() => setSuccessMessage(""), 3000);
            } else if (response.status === 401) {
                // Token is invalid - prompt user to login again
                setErrorMessage("Your session has expired. Please sign out and sign in again to continue.");
            } else {
                try {
                    const error = await response.json();
                    setErrorMessage(error.detail || "Failed to change password. Please try again.");
                } catch {
                    setErrorMessage("Failed to change password. Please try again.");
                }
            }
        } catch (err) {
            if (err.message && err.message.includes("Failed to fetch")) {
                setErrorMessage("Cannot connect to server. Please check your connection.");
            } else if (err.message && err.message.includes("No authentication token")) {
                setErrorMessage("You are not logged in. Please sign in to continue.");
            } else {
                setErrorMessage(err.message || "Failed to change password. Please try again.");
            }
        }
    };

    // Helper functions - MUST be defined before use
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("en-US", { 
                year: "numeric", 
                month: "long", 
                day: "numeric" 
            });
        } catch {
            return "Invalid date";
        }
    };

    const isSubscriptionActive = () => {
        // Check both userData state and localStorage for subscription_end_date
        const cachedData = getUserData();
        const subscriptionEndDate = userData?.subscription_end_date || cachedData?.subscription_end_date;
        if (!subscriptionEndDate) return false;
        const endDate = new Date(subscriptionEndDate);
        return endDate > new Date();
    };

    const getDaysUntilExpiry = () => {
        // Check both userData state and localStorage for subscription_end_date
        const cachedData = getUserData();
        const subscriptionEndDate = userData?.subscription_end_date || cachedData?.subscription_end_date;
        if (!subscriptionEndDate) return null;
        const endDate = new Date(subscriptionEndDate);
        const today = new Date();
        const diffTime = endDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Update subscription plan whenever userData, refreshKey, or location changes
    // MUST be before any conditional returns (Rules of Hooks)
    useEffect(() => {
        const updateSubscriptionPlan = () => {
            // CRITICAL: Check localStorage FIRST (updated immediately when subscription changes)
            const cachedData = getUserData();
            if (cachedData?.subscription_plan) {
                const plan = cachedData.subscription_plan.toLowerCase();
                console.log("AccountPage: useEffect - Subscription plan from localStorage:", plan);
                setSubscriptionPlan(plan);
                return;
            }
            // Fallback to userData state
            if (userData?.subscription_plan) {
                const plan = userData.subscription_plan.toLowerCase();
                console.log("AccountPage: useEffect - Subscription plan from state:", plan);
                setSubscriptionPlan(plan);
                return;
            }
            console.log("AccountPage: useEffect - No subscription plan found, defaulting to free");
            setSubscriptionPlan("free");
        };
        
        updateSubscriptionPlan();
    }, [userData, refreshKey, location.pathname]); // Re-run when userData, refreshKey, or location changes

    // Calculate derived values - MUST be before conditional returns
    // ALWAYS read from localStorage first for most up-to-date value (updated immediately by SubscriptionPage)
    // This ensures we always show the latest subscription status, even if state hasn't updated yet
    // We read directly from localStorage here so we don't need to wait for state updates
    const cachedDataForRender = getUserData();
    const renderSubscriptionPlan = (cachedDataForRender?.subscription_plan || subscriptionPlan || "free").toLowerCase();
    const isPremium = renderSubscriptionPlan === "premium";
    
    // Check subscription active status directly from localStorage (most up-to-date)
    const subscriptionEndDateForActive = cachedDataForRender?.subscription_end_date || userData?.subscription_end_date;
    const isActive = subscriptionEndDateForActive ? new Date(subscriptionEndDateForActive) > new Date() : false;
    
    const daysUntilExpiry = getDaysUntilExpiry();
    
    // Debug log
    console.log("AccountPage: Render - subscriptionPlan state:", subscriptionPlan, "cachedData subscription_plan:", cachedDataForRender?.subscription_plan, "renderSubscriptionPlan:", renderSubscriptionPlan, "isPremium:", isPremium, "isActive:", isActive, "subscriptionEndDate:", subscriptionEndDateForActive, "refreshKey:", refreshKey);

    if (loading) {
        return (
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar exam="" setExam={() => {}} examsList={examsList} onOpenSecondarySidebar={() => {}} />
                <main className="flex-1 ml-64 flex items-center justify-center">
                    <p className="text-gray-600">Loading...</p>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar exam="" setExam={() => {}} examsList={examsList} onOpenSecondarySidebar={() => {}} />
            
            <main className="flex-1 md:ml-64">
                <div className="max-w-7xl mx-auto px-2 md:px-4 lg:px-8 py-4 md:py-6 lg:py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 md:mb-6">
                            👤 My Account
                        </h1>

                        {successMessage && (
                            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                                {successMessage}
                            </div>
                        )}

                        {errorMessage && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                {errorMessage}
                            </div>
                        )}
                        
                        {/* Two Column Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 md:gap-6">
                            {/* Left Section (25-30%) */}
                            <div className="lg:col-span-3">
                                {/* Combined User Account Card */}
                                <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
                                    {/* User Profile Section */}
                                    <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-4 md:mb-6">
                                        <div
                                            className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white font-semibold text-2xl md:text-3xl flex-shrink-0"
                                            style={{ 
                                                backgroundColor: localStorage.getItem("avatarColor") || "#14b8a6" 
                                            }}
                                        >
                                            {localStorage.getItem("avatarInitials") || getUserInitials()}
                                        </div>
                                        <div className="flex-1 min-w-0 text-center md:text-left">
                                            <p className="text-xl md:text-2xl font-semibold text-gray-900 truncate">{fullName || "Not set"}</p>
                                            <p className="text-xs md:text-sm text-gray-500 truncate">@{username || "username"}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsEditProfileOpen(true)}
                                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-6"
                                    >
                                        Edit Profile
                                    </button>
                                    
                                    {/* Divider */}
                                    <div className="border-t border-gray-200 my-6"></div>
                                    
                                    {/* Premium/Upgrade Status Section */}
                                    <div className="mb-6">
                                        {(() => {
                                            // Re-check subscription status directly from localStorage for most accurate status
                                            const cachedData = getUserData();
                                            const planFromCache = cachedData?.subscription_plan || "";
                                            const planFromState = userData?.subscription_plan || "";
                                            const planFromLocal = subscriptionPlan || "";
                                            
                                            // Check all possible sources and normalize
                                            const currentPlanRaw = planFromCache || planFromState || planFromLocal || "free";
                                            const currentPlan = String(currentPlanRaw).toLowerCase().trim();
                                            
                                            // Check if user has premium (more lenient check)
                                            const isUserPremium = currentPlan === "premium" || 
                                                                  currentPlan.includes("premium") ||
                                                                  cachedData?.hasPremium === true ||
                                                                  localStorage.getItem("hasPremium") === "true";
                                            
                                            // Check subscription end date
                                            const subscriptionEndDate = cachedData?.subscription_end_date || userData?.subscription_end_date;
                                            let isSubscriptionActive = false;
                                            let diffDays = null;
                                            
                                            if (subscriptionEndDate) {
                                                try {
                                                    const endDate = new Date(subscriptionEndDate);
                                                    const today = new Date();
                                                    isSubscriptionActive = endDate > today;
                                                    if (isSubscriptionActive) {
                                                        const diffTime = endDate - today;
                                                        diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                    }
                                                } catch (e) {
                                                    console.error("Error parsing subscription end date:", e);
                                                }
                                            }
                                            
                                            // Show Premium if user has premium plan, even if end date check fails
                                            // (end date might not be set for some subscription types)
                                            if (isUserPremium) {
                                                return (
                                                    <div className="text-center">
                                                        <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-semibold text-sm inline-block mb-2">
                                                            Premium
                                                        </span>
                                                        {diffDays !== null && diffDays > 0 && (
                                                            <p className="text-xs text-gray-600 mt-2">
                                                                Expires in {diffDays} {diffDays === 1 ? "day" : "days"}
                                                            </p>
                                                        )}
                                                        {subscriptionEndDate && !isSubscriptionActive && (
                                                            <p className="text-xs text-orange-600 mt-2">
                                                                Subscription expired
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div className="text-center">
                                                        <p className="text-sm text-gray-600 mb-3">Free Plan</p>
                                                        <button
                                                            onClick={() => navigate("/subscription")}
                                                            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors text-sm font-medium"
                                                        >
                                                            Upgrade to Premium
                                                        </button>
                                                    </div>
                                                );
                                            }
                                        })()}
                                    </div>
                                    
                                    {/* Admin Section */}
                                    {userIsAdmin && (
                                        <>
                                            {/* Divider */}
                                            <div className="border-t border-gray-200 my-6"></div>
                                            <div className="mb-6">
                                                <h3 className="text-sm font-semibold text-gray-900 mb-3">Admin Tools</h3>
                                                <div className="space-y-2">
                                                    <button
                                                        onClick={() => navigate("/admin")}
                                                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                                    >
                                                        Admin Panel
                                                    </button>
                                                    <button
                                                        onClick={() => navigate("/admin/subscription-management")}
                                                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                                    >
                                                        Subscription Management
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    
                                    {/* Divider */}
                                    <div className="border-t border-gray-200 my-6"></div>
                                    
                                    {/* Language Preference Section */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Language Mode:
                                        </label>
                                        <select
                                            value={language}
                                            onChange={(e) => handleLanguageChange(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            disabled={languagesLoading}
                                        >
                                            {languagesLoading ? (
                                                <option>Loading languages...</option>
                                            ) : (
                                                supportedLanguages.map((lang) => (
                                                    <option key={lang.code} value={lang.code}>
                                                        {lang.name}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    </div>
                                    
                                    {/* Divider */}
                                    <div className="border-t border-gray-200 my-6"></div>
                                    
                                    {/* Transaction Button */}
                                    <button
                                        onClick={() => setIsTransactionModalOpen(true)}
                                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-purple-600 font-medium mb-4"
                                    >
                                        Transaction
                                    </button>
                                    
                                    {/* Divider */}
                                    <div className="border-t border-gray-200 my-6"></div>
                                    
                                    {/* Delete Account Button */}
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-red-50 transition-colors text-red-600 font-medium"
                                    >
                                        Delete Account
                                    </button>
                                </div>
                            </div>
                            
                            {/* Right Section (70%) */}
                            <div className="lg:col-span-7 space-y-6">

                                {/* Progress Overview Section */}
                                <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3 md:gap-0">
                                        <h2 className="text-xl font-semibold text-gray-900">Progress Overview</h2>
                                        <select
                                            value={selectedExam}
                                            onChange={(e) => setSelectedExam(e.target.value)}
                                            className="w-full md:w-auto px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Exam</option>
                                            {examsList.map((exam) => (
                                                <option key={exam} value={exam}>
                                                    {exam}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {selectedExam && (
                                        <div>
                                            {progressLoading ? (
                                                <div className="flex items-center justify-center py-12">
                                                    <div className="text-center">
                                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                                                        <p className="text-gray-600 text-sm">Loading progress...</p>
                                                    </div>
                                                </div>
                                            ) : progressOverviewData ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                                    {/* Circular Progress Chart */}
                                                    <div className="flex items-center justify-center">
                                                        <div className="relative w-48 h-48">
                                                            <svg className="transform -rotate-90 w-48 h-48">
                                                                <circle
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    r="70"
                                                                    stroke="currentColor"
                                                                    strokeWidth="10"
                                                                    fill="none"
                                                                    className="text-gray-200"
                                                                />
                                                                <motion.circle
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    r="70"
                                                                    stroke="url(#gradient)"
                                                                    strokeWidth="10"
                                                                    fill="none"
                                                                    strokeLinecap="round"
                                                                    strokeDasharray={439.82}
                                                                    initial={{ strokeDashoffset: 439.82 }}
                                                                    animate={{ 
                                                                        strokeDashoffset: 439.82 - (progressOverviewData.progress_percentage / 100) * 439.82 
                                                                    }}
                                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                                />
                                                                <defs>
                                                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                        <stop offset="0%" stopColor="#3B82F6" />
                                                                        <stop offset="50%" stopColor="#8B5CF6" />
                                                                        <stop offset="100%" stopColor="#EC4899" />
                                                                    </linearGradient>
                                                                </defs>
                                                            </svg>
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="text-center">
                                                                    <div className="text-3xl font-bold text-gray-900">
                                                                        {progressOverviewData.progress_percentage.toFixed(0)}%
                                                                    </div>
                                                                    <div className="text-sm text-gray-500 mt-1">Complete</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Statistics Cards */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                                                            <div className="text-xs text-gray-600 mb-1">Questions Solved</div>
                                                            <div className="text-2xl font-bold text-gray-900">
                                                                {progressOverviewData.solved_count} / {progressOverviewData.total_questions}
                                                            </div>
                                                        </div>
                                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                                                            <div className="text-xs text-gray-600 mb-1">Weightage Progress</div>
                                                            <div className="text-2xl font-bold text-gray-900">
                                                                {progressOverviewData.weightage_progress.toFixed(1)}%
                                                            </div>
                                                        </div>
                                                        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4">
                                                            <div className="text-xs text-gray-600 mb-1">Remaining</div>
                                                            <div className="text-2xl font-bold text-gray-900">
                                                                {progressOverviewData.total_questions - progressOverviewData.solved_count}
                                                            </div>
                                                        </div>
                                                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4">
                                                            <div className="text-xs text-gray-600 mb-1">Subjects</div>
                                                            <div className="text-2xl font-bold text-gray-900">
                                                                {progressOverviewData.subjects?.filter(s => s.solved_count > 0).length || 0} / {progressOverviewData.subjects?.length || 0}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 text-gray-600">
                                                    No progress data available for this exam
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {!selectedExam && (
                                        <div className="text-center py-12 text-gray-500">
                                            Select an exam to view progress
                                        </div>
                                    )}
                                </div>
                                
                                {/* Tabs Section */}
                                <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4 shadow-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setActiveTab("notes");
                                                navigate("/my-notes");
                                            }}
                                            className={`p-4 rounded-xl border-2 transition-all ${
                                                activeTab === "notes"
                                                    ? "border-blue-500 bg-blue-50 shadow-md"
                                                    : "border-gray-200 bg-white hover:border-gray-300"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                                                    activeTab === "notes" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                                                }`}>
                                                    📝
                                                </div>
                                                <div className="text-left">
                                                    <h3 className={`text-lg font-bold mb-1 ${
                                                        activeTab === "notes" ? "text-blue-700" : "text-gray-900"
                                                    }`}>
                                                        My Notes
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        View and manage your saved notes
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.button>

                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setActiveTab("progress");
                                                navigate("/my-progress");
                                            }}
                                            className={`p-4 rounded-xl border-2 transition-all ${
                                                activeTab === "progress"
                                                    ? "border-blue-500 bg-blue-50 shadow-md"
                                                    : "border-gray-200 bg-white hover:border-gray-300"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                                                    activeTab === "progress" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                                                }`}>
                                                    📊
                                                </div>
                                                <div className="text-left">
                                                    <h3 className={`text-lg font-bold mb-1 ${
                                                        activeTab === "progress" ? "text-blue-700" : "text-gray-900"
                                                    }`}>
                                                        My Progress
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        Track your learning progress and analytics
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.button>
                                    </div>
                                </div>
                                
                                {/* Subscription Plans Section */}
                                <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
                                    <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">Subscription Plans</h2>
                                    {plansLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                        </div>
                                    ) : (
                                        <div className={`grid grid-cols-1 gap-3 md:gap-4 ${availablePlans.filter(p => p.plan_type === "premium").length > 0 ? (availablePlans.filter(p => p.plan_type === "premium").length === 1 ? "md:grid-cols-2" : "md:grid-cols-3") : "md:grid-cols-2"}`}>
                                            {/* Free Plan */}
                                            <div className="bg-white rounded-xl border-2 border-gray-200 p-3 md:p-4 shadow-sm">
                                                <div className="mb-4">
                                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Free</h3>
                                                    <div className="flex items-baseline">
                                                        <span className="text-3xl font-bold text-gray-900">₹0</span>
                                                        <span className="text-gray-600 ml-2 text-sm">/month</span>
                                                    </div>
                                                </div>
                                                <ul className="space-y-2 mb-4 text-sm">
                                                    <li className="flex items-start">
                                                        <span className="text-green-500 mr-2">✓</span>
                                                        <span className="text-gray-700">Basic PYQ search</span>
                                                    </li>
                                                    <li className="flex items-start">
                                                        <span className="text-green-500 mr-2">✓</span>
                                                        <span className="text-gray-700">Exam Dashboard access</span>
                                                    </li>
                                                    <li className="flex items-start">
                                                        <span className="text-green-500 mr-2">✓</span>
                                                        <span className="text-gray-700">Basic analytics</span>
                                                    </li>
                                                    <li className="flex items-start">
                                                        <span className="text-gray-400 mr-2">✗</span>
                                                        <span className="text-gray-500">Stable/Volatile insights</span>
                                                    </li>
                                                    <li className="flex items-start">
                                                        <span className="text-gray-400 mr-2">✗</span>
                                                        <span className="text-gray-500">Advanced analytics</span>
                                                    </li>
                                                </ul>
                                                {(() => {
                                                    const cachedData = getUserData();
                                                    const currentPlan = (cachedData?.subscription_plan || subscriptionPlan || "free").toLowerCase();
                                                    const isUserPremium = currentPlan === "premium";
                                                    const subscriptionEndDate = cachedData?.subscription_end_date || userData?.subscription_end_date;
                                                    const isSubscriptionActive = subscriptionEndDate ? new Date(subscriptionEndDate) > new Date() : false;
                                                    
                                                    if (!isUserPremium || !isSubscriptionActive) {
                                                        return (
                                                            <button
                                                                disabled
                                                                className="w-full py-2 px-4 border-2 border-gray-300 text-gray-700 rounded-lg bg-gray-50 cursor-default text-sm"
                                                            >
                                                                Current Plan
                                                            </button>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>

                                            {/* Premium Plans */}
                                            {availablePlans.filter(p => p.plan_type === "premium").map((plan) => {
                                                const isActivePlan = activePlanTemplateId !== null && plan.id === activePlanTemplateId;
                                                
                                                return (
                                                    <div
                                                        key={plan.id}
                                                        className={`relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 ${
                                                            isActivePlan ? "border-emerald-500" : "border-blue-500"
                                                        } p-3 md:p-4 shadow-lg`}
                                                    >
                                                        {isActivePlan && (
                                                            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                                                Active
                                                            </div>
                                                        )}
                                                        <div className="mb-4">
                                                            <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                                                            <div className="flex items-baseline">
                                                                <span className="text-3xl font-bold text-gray-900">₹{plan.price}</span>
                                                                <span className="text-gray-600 ml-2 text-sm">
                                                                    /{plan.duration_months === 1 ? "month" : `${plan.duration_months} months`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <ul className="space-y-2 mb-4 text-sm">
                                                            <li className="flex items-start">
                                                                <span className="text-green-500 mr-2">✓</span>
                                                                <span className="text-gray-700">Everything in Free</span>
                                                            </li>
                                                            <li className="flex items-start">
                                                                <span className="text-green-500 mr-2">✓</span>
                                                                <span className="text-gray-700">Stable/Volatile topic insights</span>
                                                            </li>
                                                            <li className="flex items-start">
                                                                <span className="text-green-500 mr-2">✓</span>
                                                                <span className="text-gray-700">Advanced analytics & trends</span>
                                                            </li>
                                                            <li className="flex items-start">
                                                                <span className="text-green-500 mr-2">✓</span>
                                                                <span className="text-gray-700">Cross-exam comparisons</span>
                                                            </li>
                                                            <li className="flex items-start">
                                                                <span className="text-green-500 mr-2">✓</span>
                                                                <span className="text-gray-700">Priority support</span>
                                                            </li>
                                                        </ul>
                                                        {isActivePlan ? (
                                                            <button
                                                                disabled
                                                                className="w-full py-2 px-4 bg-green-500 text-white rounded-lg cursor-not-allowed text-sm font-semibold"
                                                            >
                                                                Premium Active ✓
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => navigate("/subscription")}
                                                                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                                                            >
                                                                Upgrade to {plan.name}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Feedback Section */}
                                <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
                                    <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">Feedback</h2>
                                    <p className="text-sm text-gray-600 mb-4">
                                        We'd love to hear your thoughts and suggestions
                                    </p>
                                    <textarea
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        placeholder="Share your feedback, suggestions, or report issues..."
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                                        rows={4}
                                    />
                                    <button
                                        onClick={handleSubmitFeedback}
                                        disabled={isSubmittingFeedback || !feedback.trim()}
                                        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>
            
            {/* Edit Profile Modal */}
            <EditProfileModal
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
                currentFullName={fullName}
                currentUsername={username}
                currentMobileNumber={mobileNumber}
                onSave={handleEditProfileSave}
            />
            
            {/* Transaction Modal */}
            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
            />
            
            {/* Avatar Editor Modal */}
            <AvatarEditor
                isOpen={isEditingAvatar}
                onClose={() => setIsEditingAvatar(false)}
                currentInitials={getUserInitials()}
                currentName={fullName || username}
                onSave={handleAvatarSave}
            />
            
            {/* Delete Account Confirmation Modal - Double Confirmation */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
                    >
                        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">Delete Account</h2>
                        <p className="text-gray-600 mb-2 text-center">
                            This action cannot be undone. All your data will be permanently deleted.
                        </p>
                        <p className="text-sm text-red-600 mb-4 text-center font-medium">
                            You will be immediately logged out after deletion.
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Type <span className="font-mono text-red-600 font-bold">DELETE</span> to confirm:
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className="w-full px-4 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                placeholder="Type DELETE here"
                            />
                        </div>
                        {errorMessage && deleteConfirmText && (
                            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                                {errorMessage}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteConfirmText("");
                                    setErrorMessage("");
                                }}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== "DELETE"}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                            >
                                Delete Account
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

