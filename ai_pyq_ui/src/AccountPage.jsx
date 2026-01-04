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
import { buildApiUrl, isCapacitor } from "./config/apiConfig";
import { useMobileDetection } from "./utils/useMobileDetection";

// API URLs are now handled by buildApiUrl from apiConfig

export default function AccountPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useMobileDetection();
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
                const notesUrl = buildApiUrl("notes/stats");
                const response = await authenticatedFetch(notesUrl);
                if (response.ok) {
                    // Check if response is JSON before parsing
                    const contentType = response.headers.get("content-type");
                    if (!contentType || !contentType.includes("application/json")) {
                        const text = await response.text();
                        console.error(`AccountPage: Notes stats expected JSON but got ${contentType || 'unknown type'}. Response preview:`, text.substring(0, 200));
                        setNotesCount(null);
                        return;
                    }
                    const data = await response.json();
                    setNotesCount(data.total || 0);
                } else {
                    // Endpoint might not exist, set to null to hide count
                    setNotesCount(null);
                }
            } catch (err) {
                // Endpoint might not exist, set to null to hide count
                console.error("AccountPage: Failed to fetch notes count:", err);
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
                const activeSubUrl = buildApiUrl("payment/active-subscription");
                const res = await authenticatedFetch(activeSubUrl);
                if (res.ok) {
                    // Check if response is JSON before parsing
                    const contentType = res.headers.get("content-type");
                    if (!contentType || !contentType.includes("application/json")) {
                        const text = await res.text();
                        console.error(`AccountPage: Expected JSON but got ${contentType || 'unknown type'}. Response preview:`, text.substring(0, 200));
                        setActivePlanTemplateId(null);
                        return;
                    }
                    const data = await res.json();
                    if (data.is_active && data.active_plan_template_id) {
                        console.log("AccountPage: Active subscription found, plan template ID:", data.active_plan_template_id);
                        setActivePlanTemplateId(data.active_plan_template_id);
                    } else {
                        console.log("AccountPage: No active subscription found");
                        setActivePlanTemplateId(null);
                    }
                } else {
                    console.log(`AccountPage: Active subscription endpoint returned status: ${res.status}`);
                    setActivePlanTemplateId(null);
                }
            } catch (err) {
                console.error("AccountPage: Failed to fetch active subscription:", err);
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
                <div className={`max-w-7xl mx-auto ${isCapacitor() ? 'px-2 py-3' : 'px-2 md:px-4 lg:px-8 py-4 md:py-6 lg:py-8'}`}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {/* Header with Back Button - Mobile Only */}
                        <div className="flex items-center gap-3 mb-4 md:mb-6 lg:mb-0">
                            <button
                                onClick={() => navigate(-1)}
                                className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                                aria-label="Go back"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
                                👤 My Account
                            </h1>
                        </div>

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
                        <div className={`grid grid-cols-1 lg:grid-cols-10 ${isCapacitor() ? 'gap-3' : 'gap-4 md:gap-6'}`}>
                            {/* Left Section (25-30%) */}
                            <div className="lg:col-span-3">
                                {/* Combined User Account Card */}
                                <div className={`bg-white rounded-lg border border-gray-200 shadow-sm lg:p-6 relative ${isCapacitor() ? 'p-3' : 'p-4 md:p-6'}`}>
                                    {/* Edit Profile Icon - Mobile Only */}
                                    <button
                                        onClick={() => setIsEditProfileOpen(true)}
                                        className="lg:hidden absolute top-4 right-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                                        aria-label="Edit Profile"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    
                                    {/* User Profile Section */}
                                    <div className={`flex flex-row md:flex-row items-center md:items-start gap-4 ${isCapacitor() ? 'mb-3' : 'mb-5'}`}>
                                        <div className="relative">
                                            <div
                                                className={`rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-sm ${
                                                    isCapacitor() 
                                                        ? 'w-16 h-16 text-lg' 
                                                        : 'w-20 h-20 md:w-24 md:h-24 lg:w-20 lg:h-20 text-xl md:text-2xl lg:text-xl'
                                                }`}
                                                style={{ 
                                                    backgroundColor: localStorage.getItem("avatarColor") || "#14b8a6" 
                                                }}
                                            >
                                                {localStorage.getItem("avatarInitials") || getUserInitials()}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 text-left md:text-left">
                                            <p className={`font-semibold text-gray-900 truncate ${isCapacitor() ? 'text-base' : 'text-lg md:text-xl lg:text-xl'}`}>{fullName || "Not set"}</p>
                                            <p className={`text-gray-500 truncate mt-0.5 ${isCapacitor() ? 'text-xs' : 'text-xs md:text-sm lg:text-sm'}`}>@{username || "username"}</p>
                                            {/* Quick Stats for Android */}
                                            {isCapacitor() && notesCount !== null && (
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                        <span>📝</span>
                                                        <span>{notesCount} notes</span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Edit Profile Button - Desktop Only */}
                                    <button
                                        onClick={() => setIsEditProfileOpen(true)}
                                        className="hidden lg:block w-full px-4 py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium mb-5"
                                    >
                                        Edit Profile
                                    </button>
                                    
                                    {/* Divider */}
                                    <div className={`border-t border-gray-200 ${isCapacitor() ? 'my-3' : 'my-5'}`}></div>
                                    
                                    {/* Premium/Upgrade Status Section */}
                                    <div className={isCapacitor() ? 'mb-3' : 'mb-5'}>
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
                                                    <div className={isCapacitor() ? "text-center" : "text-center"}>
                                                        <div className={`inline-flex items-center gap-2 bg-emerald-600 text-white rounded-md font-medium mb-2 ${
                                                            isCapacitor() ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
                                                        }`}>
                                                            <svg className={isCapacitor() ? "w-3 h-3" : "w-4 h-4"} fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                            <span>Premium</span>
                                                        </div>
                                                        {diffDays !== null && diffDays > 0 && (
                                                            <p className={`text-gray-500 ${isCapacitor() ? 'text-[10px] mt-1' : 'text-xs mt-2'}`}>
                                                                Expires in {diffDays} {diffDays === 1 ? "day" : "days"}
                                                            </p>
                                                        )}
                                                        {subscriptionEndDate && !isSubscriptionActive && (
                                                            <p className={`text-orange-600 ${isCapacitor() ? 'text-[10px] mt-1' : 'text-xs mt-2'}`}>
                                                                Subscription expired
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div className="text-center">
                                                        <p className={`text-gray-600 font-medium ${isCapacitor() ? 'text-xs mb-2' : 'text-sm mb-3'}`}>Free Plan</p>
                                                        <button
                                                            onClick={() => navigate("/subscription")}
                                                            className={`w-full bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium ${
                                                                isCapacitor() ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
                                                            }`}
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
                                            <div className="border-t border-gray-200 my-5"></div>
                                            <div className="mb-5">
                                                <h3 className="text-sm font-semibold text-gray-900 mb-3">Admin Tools</h3>
                                                <div className="space-y-2">
                                                    <button
                                                        onClick={() => navigate("/admin")}
                                                        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                                                    >
                                                        Admin Panel
                                                    </button>
                                                    <button
                                                        onClick={() => navigate("/admin/subscription-management")}
                                                        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                                                    >
                                                        Subscription Management
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    
                                    {/* Divider */}
                                    <div className="border-t border-gray-200 my-5"></div>
                                    
                                    {/* Language Preference Section */}
                                    <div className={isCapacitor() ? 'mb-3' : 'mb-5'}>
                                        <label className={`block font-medium text-gray-700 ${isCapacitor() ? 'text-xs mb-1.5' : 'text-sm mb-2'}`}>
                                            Language Mode
                                        </label>
                                        <div className="relative p-[2px] bg-gradient-to-r from-amber-400 via-purple-500 to-pink-500 rounded-md shadow-lg">
                                            <select
                                                value={language}
                                                onChange={(e) => handleLanguageChange(e.target.value)}
                                                className={`w-full border-2 border-transparent rounded-md focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all bg-white text-gray-900 font-medium shadow-lg hover:shadow-xl cursor-pointer appearance-none ${
                                                    isCapacitor() ? 'px-2.5 py-2 text-xs' : 'px-3 py-2.5 text-sm'
                                                }`}
                                                style={{
                                                    WebkitAppearance: 'none',
                                                    MozAppearance: 'none'
                                                }}
                                                disabled={languagesLoading}
                                            >
                                                {languagesLoading ? (
                                                    <option className="bg-white text-gray-900">Loading languages...</option>
                                                ) : (
                                                    supportedLanguages.map((lang) => (
                                                        <option key={lang.code} value={lang.code} className="bg-white text-gray-900">
                                                            {lang.name}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none" style={{ top: '2px', bottom: '2px', right: '2px' }}>
                                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Divider - Hidden on mobile */}
                                    <div className="hidden lg:block border-t border-gray-200 my-5"></div>
                                    
                                    {/* Transaction Section - Hidden on mobile */}
                                    <div className="hidden lg:block">
                                        <h3 className="text-sm font-medium text-gray-700 mb-2">Transactions</h3>
                                        <button
                                            onClick={() => setIsTransactionModalOpen(true)}
                                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-700 text-sm font-medium"
                                        >
                                            View Transactions
                                        </button>
                                    </div>
                                    
                                    {/* Divider - Hidden on mobile */}
                                    <div className="hidden lg:block border-t border-gray-200 my-5"></div>
                                    
                                    {/* Delete Account Section - Hidden on mobile */}
                                    <div className="hidden lg:block">
                                        <h3 className="text-sm font-medium text-gray-700 mb-2">Account</h3>
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="w-full px-4 py-2 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors text-red-600 text-sm font-medium"
                                        >
                                            Delete Account
                                        </button>
                                    </div>
                                    
                                </div>
                            </div>
                            
                            {/* Right Section (70%) */}
                            <div className="lg:col-span-7 space-y-6">

                                {/* Progress Overview Section */}
                                <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${isCapacitor() ? 'p-3' : 'p-4 md:p-6'}`}>
                                    <div className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0 ${isCapacitor() ? 'mb-3' : 'mb-4'}`}>
                                        <h2 className={`font-semibold text-gray-900 ${isCapacitor() ? 'text-lg' : 'text-xl'}`}>Progress Overview</h2>
                                        <select
                                            value={selectedExam}
                                            onChange={(e) => setSelectedExam(e.target.value)}
                                            className={`w-full md:w-auto border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                                isCapacitor() ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
                                            }`}
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
                                                        <div className={`relative ${isCapacitor() ? 'w-32 h-32' : 'w-48 h-48'}`}>
                                                            <svg className={`transform -rotate-90 ${isCapacitor() ? 'w-32 h-32' : 'w-48 h-48'}`}>
                                                                <circle
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    r={isCapacitor() ? "45" : "70"}
                                                                    stroke="currentColor"
                                                                    strokeWidth={isCapacitor() ? "8" : "10"}
                                                                    fill="none"
                                                                    className="text-gray-200"
                                                                />
                                                                <motion.circle
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    r={isCapacitor() ? "45" : "70"}
                                                                    stroke="url(#gradient)"
                                                                    strokeWidth={isCapacitor() ? "8" : "10"}
                                                                    fill="none"
                                                                    strokeLinecap="round"
                                                                    strokeDasharray={isCapacitor() ? 282.74 : 439.82}
                                                                    initial={{ strokeDashoffset: isCapacitor() ? 282.74 : 439.82 }}
                                                                    animate={{ 
                                                                        strokeDashoffset: isCapacitor() 
                                                                            ? 282.74 - (progressOverviewData.progress_percentage / 100) * 282.74
                                                                            : 439.82 - (progressOverviewData.progress_percentage / 100) * 439.82 
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
                                                                    <div className={`font-bold text-gray-900 ${isCapacitor() ? 'text-2xl' : 'text-3xl'}`}>
                                                                        {progressOverviewData.progress_percentage.toFixed(0)}%
                                                                    </div>
                                                                    <div className={`text-gray-500 mt-1 ${isCapacitor() ? 'text-xs' : 'text-sm'}`}>Complete</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Statistics Cards */}
                                                    <div className={`grid grid-cols-2 ${isCapacitor() ? 'gap-2' : 'gap-3'}`}>
                                                        <div className={`bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg ${isCapacitor() ? 'p-2.5' : 'p-4'}`}>
                                                            <div className={`text-gray-600 mb-1 ${isCapacitor() ? 'text-[10px]' : 'text-xs'}`}>Questions Solved</div>
                                                            <div className={`font-bold text-gray-900 ${isCapacitor() ? 'text-lg' : 'text-2xl'}`}>
                                                                {progressOverviewData.solved_count} / {progressOverviewData.total_questions}
                                                            </div>
                                                        </div>
                                                        <div className={`bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg ${isCapacitor() ? 'p-2.5' : 'p-4'}`}>
                                                            <div className={`text-gray-600 mb-1 ${isCapacitor() ? 'text-[10px]' : 'text-xs'}`}>Weightage Progress</div>
                                                            <div className={`font-bold text-gray-900 ${isCapacitor() ? 'text-lg' : 'text-2xl'}`}>
                                                                {progressOverviewData.weightage_progress.toFixed(1)}%
                                                            </div>
                                                        </div>
                                                        <div className={`bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg ${isCapacitor() ? 'p-2.5' : 'p-4'}`}>
                                                            <div className={`text-gray-600 mb-1 ${isCapacitor() ? 'text-[10px]' : 'text-xs'}`}>Remaining</div>
                                                            <div className={`font-bold text-gray-900 ${isCapacitor() ? 'text-lg' : 'text-2xl'}`}>
                                                                {progressOverviewData.total_questions - progressOverviewData.solved_count}
                                                            </div>
                                                        </div>
                                                        <div className={`bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg ${isCapacitor() ? 'p-2.5' : 'p-4'}`}>
                                                            <div className={`text-gray-600 mb-1 ${isCapacitor() ? 'text-[10px]' : 'text-xs'}`}>Subjects</div>
                                                            <div className={`font-bold text-gray-900 ${isCapacitor() ? 'text-lg' : 'text-2xl'}`}>
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
                                <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${isCapacitor() ? 'p-2.5' : 'p-3 md:p-4'}`}>
                                    <div className={`grid grid-cols-1 md:grid-cols-2 ${isCapacitor() ? 'gap-2' : 'gap-2 md:gap-3'}`}>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setActiveTab("notes");
                                                navigate("/my-notes");
                                            }}
                                            className={`rounded-xl border-2 transition-all ${
                                                isCapacitor() ? 'p-2.5' : 'p-4'
                                            } ${
                                                activeTab === "notes"
                                                    ? "border-blue-500 bg-blue-50 shadow-md"
                                                    : "border-gray-200 bg-white hover:border-gray-300"
                                            }`}
                                        >
                                            <div className={`flex items-center ${isCapacitor() ? 'gap-2' : 'gap-3'}`}>
                                                <div className={`rounded-lg flex items-center justify-center ${
                                                    isCapacitor() ? 'w-10 h-10 text-lg' : 'w-12 h-12 text-2xl'
                                                } ${
                                                    activeTab === "notes" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                                                }`}>
                                                    📝
                                                </div>
                                                <div className="text-left">
                                                    <h3 className={`font-bold mb-1 ${
                                                        isCapacitor() ? 'text-sm' : 'text-lg'
                                                    } ${
                                                        activeTab === "notes" ? "text-blue-700" : "text-gray-900"
                                                    }`}>
                                                        My Notes
                                                    </h3>
                                                    <p className={`text-gray-600 ${isCapacitor() ? 'text-xs' : 'text-sm'}`}>
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
                                            className={`rounded-xl border-2 transition-all ${
                                                isCapacitor() ? 'p-2.5' : 'p-4'
                                            } ${
                                                activeTab === "progress"
                                                    ? "border-blue-500 bg-blue-50 shadow-md"
                                                    : "border-gray-200 bg-white hover:border-gray-300"
                                            }`}
                                        >
                                            <div className={`flex items-center ${isCapacitor() ? 'gap-2' : 'gap-3'}`}>
                                                <div className={`rounded-lg flex items-center justify-center ${
                                                    isCapacitor() ? 'w-10 h-10 text-lg' : 'w-12 h-12 text-2xl'
                                                } ${
                                                    activeTab === "progress" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                                                }`}>
                                                    📊
                                                </div>
                                                <div className="text-left">
                                                    <h3 className={`font-bold mb-1 ${
                                                        isCapacitor() ? 'text-sm' : 'text-lg'
                                                    } ${
                                                        activeTab === "progress" ? "text-blue-700" : "text-gray-900"
                                                    }`}>
                                                        My Progress
                                                    </h3>
                                                    <p className={`text-gray-600 ${isCapacitor() ? 'text-xs' : 'text-sm'}`}>
                                                        Track your learning progress and analytics
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.button>
                                    </div>
                                </div>
                                
                                {/* Subscription Plans Section */}
                                <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${isCapacitor() ? 'p-3' : 'p-4 md:p-6'}`}>
                                    <h2 className={`font-semibold text-gray-900 ${isCapacitor() ? 'text-base mb-2' : 'text-lg md:text-xl mb-3 md:mb-4'}`}>Subscription Plans</h2>
                                    {plansLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                        </div>
                                    ) : (
                                        <div className={`grid grid-cols-1 ${isCapacitor() ? 'gap-2' : 'gap-3 md:gap-4'} ${availablePlans.filter(p => p.plan_type === "premium").length > 0 ? (availablePlans.filter(p => p.plan_type === "premium").length === 1 ? "md:grid-cols-2" : "md:grid-cols-3") : "md:grid-cols-2"} ${isCapacitor() ? 'overflow-x-auto' : ''}`}>
                                            {/* Free Plan */}
                                            <div className={`bg-white rounded-xl border-2 border-gray-200 shadow-sm ${isCapacitor() ? 'p-2.5' : 'p-3 md:p-4'}`}>
                                                        <div className={isCapacitor() ? 'mb-3' : 'mb-4'}>
                                                            <h3 className={`font-bold text-gray-900 ${isCapacitor() ? 'text-lg mb-1' : 'text-xl mb-2'}`}>Free</h3>
                                                            <div className="flex items-baseline">
                                                                <span className={`font-bold text-gray-900 ${isCapacitor() ? 'text-2xl' : 'text-3xl'}`}>₹0</span>
                                                                <span className={`text-gray-600 ml-2 ${isCapacitor() ? 'text-xs' : 'text-sm'}`}>/month</span>
                                                            </div>
                                                        </div>
                                                        <ul className={`space-y-2 ${isCapacitor() ? 'mb-3 text-xs' : 'mb-4 text-sm'}`}>
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
                                            {availablePlans.filter(p => p.plan_type === "premium").map((plan, planIndex, filteredPlans) => {
                                                // Check both activePlanTemplateId and user's subscription status
                                                const cachedData = getUserData();
                                                const userSubscriptionPlan = (cachedData?.subscription_plan || subscriptionPlan || "free").toLowerCase();
                                                const isUserPremium = userSubscriptionPlan === "premium" || 
                                                                     userSubscriptionPlan.includes("premium") ||
                                                                     cachedData?.hasPremium === true ||
                                                                     localStorage.getItem("hasPremium") === "true";
                                                const subscriptionEndDate = cachedData?.subscription_end_date || userData?.subscription_end_date;
                                                const isSubscriptionActive = subscriptionEndDate ? new Date(subscriptionEndDate) > new Date() : false;
                                                
                                                const isAndroid = isCapacitor();
                                                
                                                // PRIMARY: Plan is active if activePlanTemplateId matches this specific plan.id
                                                // This ensures only the latest/current subscription plan is marked as active
                                                let isActivePlan = false;
                                                
                                                if (activePlanTemplateId !== null && plan.id === activePlanTemplateId) {
                                                    // Exact match - this is the active plan
                                                    isActivePlan = true;
                                                } else if (isUserPremium && isSubscriptionActive) {
                                                    // Fallback: User has premium and subscription is active
                                                    // On Android, only mark as active if activePlanTemplateId is not set
                                                    // AND this is the first premium plan (to avoid marking all plans)
                                                    if (isAndroid) {
                                                        // On Android, only use fallback if activePlanTemplateId is null
                                                        // and mark only the first premium plan to avoid marking all
                                                        if (activePlanTemplateId === null && planIndex === 0) {
                                                            isActivePlan = true;
                                                        }
                                                    } else {
                                                        // Desktop: use the same logic as before
                                                        isActivePlan = true;
                                                    }
                                                }
                                                
                                                // Debug logging for Android
                                                if (isAndroid) {
                                                    console.log("AccountPage: Subscription check (Android):", {
                                                        planId: plan.id,
                                                        planIndex,
                                                        activePlanTemplateId,
                                                        userSubscriptionPlan,
                                                        isUserPremium,
                                                        subscriptionEndDate,
                                                        isSubscriptionActive,
                                                        isActivePlan,
                                                        match: activePlanTemplateId === plan.id
                                                    });
                                                }
                                                
                                                return (
                                                    <div
                                                        key={plan.id}
                                                        className={`relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 ${
                                                            isActivePlan ? "border-emerald-500" : "border-blue-500"
                                                        } ${isCapacitor() ? 'p-2.5' : 'p-3 md:p-4'} shadow-lg`}
                                                    >
                                                        {isActivePlan && (
                                                            <div className={`absolute top-2 right-2 bg-green-500 text-white font-bold rounded-full ${
                                                                isCapacitor() ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
                                                            }`}>
                                                                Active
                                                            </div>
                                                        )}
                                                        <div className={isCapacitor() ? 'mb-3' : 'mb-4'}>
                                                            <h3 className={`font-bold text-gray-900 ${isCapacitor() ? 'text-lg mb-1' : 'text-xl mb-2'}`}>{plan.name}</h3>
                                                            <div className="flex items-baseline">
                                                                <span className={`font-bold text-gray-900 ${isCapacitor() ? 'text-2xl' : 'text-3xl'}`}>₹{plan.price}</span>
                                                                <span className={`text-gray-600 ml-2 ${isCapacitor() ? 'text-xs' : 'text-sm'}`}>
                                                                    /{plan.duration_months === 1 ? "month" : `${plan.duration_months} months`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <ul className={`space-y-2 ${isCapacitor() ? 'mb-3 text-xs' : 'mb-4 text-sm'}`}>
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
                                                                className={`w-full bg-green-500 text-white rounded-lg cursor-not-allowed font-semibold ${
                                                                    isCapacitor() ? 'py-1.5 px-3 text-xs' : 'py-2 px-4 text-sm'
                                                                }`}
                                                            >
                                                                Premium Active ✓
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => navigate("/subscription")}
                                                                className={`w-full bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold ${
                                                                    isCapacitor() ? 'py-1.5 px-3 text-xs' : 'py-2 px-4 text-sm'
                                                                }`}
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
                                <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${isCapacitor() ? 'p-3' : 'p-4 md:p-6'}`}>
                                    <h2 className={`font-semibold text-gray-900 ${isCapacitor() ? 'text-base mb-2' : 'text-lg md:text-xl mb-3 md:mb-4'}`}>Feedback</h2>
                                    <p className={`text-gray-600 ${isCapacitor() ? 'text-xs mb-3' : 'text-sm mb-4'}`}>
                                        We'd love to hear your thoughts and suggestions
                                    </p>
                                    <textarea
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        placeholder="Share your feedback, suggestions, or report issues..."
                                        className={`w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none ${
                                            isCapacitor() ? 'px-3 py-2 text-xs' : 'px-4 py-3'
                                        }`}
                                        rows={isCapacitor() ? 3 : 4}
                                    />
                                    <button
                                        onClick={handleSubmitFeedback}
                                        disabled={isSubmittingFeedback || !feedback.trim()}
                                        className={`mt-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed ${
                                            isCapacitor() ? 'px-3 py-1.5 text-xs' : 'px-4 py-2'
                                        }`}
                                    >
                                        {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Transaction and Delete Account - Mobile Only, at bottom of page */}
                        <div className={`lg:hidden ${isCapacitor() ? 'mt-4 space-y-2' : 'mt-6 space-y-4'}`}>
                            <div className={`bg-purple-100 rounded-lg border-2 border-purple-300 shadow-sm ${isCapacitor() ? 'p-3' : 'p-4'}`}>
                                <h3 className={`font-semibold text-purple-800 ${isCapacitor() ? 'text-xs mb-1.5' : 'text-sm mb-2'}`}>Transactions</h3>
                                <button
                                    onClick={() => setIsTransactionModalOpen(true)}
                                    className={`w-full bg-white border-2 border-purple-400 rounded-md hover:bg-purple-200 transition-colors text-purple-800 font-medium ${
                                        isCapacitor() ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
                                    }`}
                                >
                                    View Transactions
                                </button>
                            </div>
                            
                            <div className={`bg-red-100 rounded-lg border-2 border-red-300 shadow-sm ${isCapacitor() ? 'p-3' : 'p-4'}`}>
                                <h3 className={`font-semibold text-red-800 ${isCapacitor() ? 'text-xs mb-1.5' : 'text-sm mb-2'}`}>Account</h3>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className={`w-full bg-white border-2 border-red-400 rounded-md hover:bg-red-200 transition-colors text-red-700 font-medium ${
                                        isCapacitor() ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
                                    }`}
                                >
                                    Delete Account
                                </button>
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

