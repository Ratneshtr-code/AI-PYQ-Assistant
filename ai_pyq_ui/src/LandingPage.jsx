// src/LandingPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { setUserData, isAuthenticated } from "./utils/auth";
import { buildApiUrl } from "./config/apiConfig";

export default function LandingPage() {
    const navigate = useNavigate();
    const [authMode, setAuthMode] = useState("signin"); // "signin" or "signup"
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [testimonialIndex, setTestimonialIndex] = useState(0);
    
    // Sign In form state
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [signInError, setSignInError] = useState("");
    const [signInLoading, setSignInLoading] = useState(false);
    
    // Sign Up form state
    const [username, setUsername] = useState("");
    const [signUpEmail, setSignUpEmail] = useState("");
    const [signUpPassword, setSignUpPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [signUpError, setSignUpError] = useState("");
    const [signUpLoading, setSignUpLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState("");

    // Redirect if already authenticated (but not on logout)
    useEffect(() => {
        const checkAuth = () => {
            if (isAuthenticated()) {
                navigate("/exam-dashboard", { replace: true });
            }
        };
        
        // Initial check
        checkAuth();
        
        // Listen for login events (but not logout - we want to stay on landing page after logout)
        window.addEventListener("userLoggedIn", checkAuth);
        
        return () => {
            window.removeEventListener("userLoggedIn", checkAuth);
        };
    }, [navigate]);

    // Carousel auto-rotation
    useEffect(() => {
        const interval = setInterval(() => {
            setCarouselIndex((prev) => (prev + 1) % 3);
        }, 3000); // Change every 3 seconds
        return () => clearInterval(interval);
    }, []);

    // Testimonials auto-rotation
    useEffect(() => {
        const interval = setInterval(() => {
            setTestimonialIndex((prev) => (prev + 1) % 4);
        }, 4000); // Change every 4 seconds
        return () => clearInterval(interval);
    }, []);

    const validatePassword = (pwd) => {
        if (pwd.length < 8) return "Password must be at least 8 characters";
        if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter";
        if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter";
        if (!/\d/.test(pwd)) return "Password must contain at least one number";
        return "";
    };

    const handlePasswordChange = (e) => {
        const pwd = e.target.value;
        setSignUpPassword(pwd);
        if (pwd) {
            const strength = validatePassword(pwd);
            setPasswordStrength(strength);
        } else {
            setPasswordStrength("");
        }
    };

    const handleSignIn = async (e) => {
        e.preventDefault();
        setSignInError("");
        setSignInLoading(true);

        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setSignInError("Email is required");
            setSignInLoading(false);
            return;
        }
        
        if (!trimmedEmail.includes("@")) {
            setSignInError("Please enter a valid email address");
            setSignInLoading(false);
            return;
        }
        
        if (!password || password.length === 0) {
            setSignInError("Password is required");
            setSignInLoading(false);
            return;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(buildApiUrl("auth/login"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                signal: controller.signal,
                body: JSON.stringify({
                    email: trimmedEmail,
                    password: password,
                }),
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = "Login failed. Please check your credentials.";
                
                try {
                    const errorData = await response.json();
                    if (errorData.detail) {
                        errorMessage = errorData.detail;
                    } else if (response.status === 401) {
                        errorMessage = "Incorrect email or password. Please try again.";
                    } else if (response.status === 403) {
                        errorMessage = "Account is inactive. Please contact support.";
                    } else if (response.status === 400) {
                        errorMessage = errorData.detail || "Invalid request. Please check your input.";
                    }
                } catch (parseError) {
                    if (response.status === 401) {
                        errorMessage = "Incorrect email or password. Please try again.";
                    } else if (response.status === 403) {
                        errorMessage = "Account is inactive. Please contact support.";
                    } else if (response.status === 400) {
                        errorMessage = "Invalid request. Please check your input.";
                    } else if (response.status >= 500) {
                        errorMessage = "Server error. Please try again later.";
                    }
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();

            if (!data.user) {
                throw new Error("Invalid response from server. Please try again.");
            }

            if (typeof data.user.is_admin !== "boolean") {
                data.user.is_admin = false;
            }

            // Check if email verification is required (shouldn't happen for login, but handle it)
            if (data.requires_verification) {
                localStorage.setItem("pendingVerificationUserId", data.user_id);
                localStorage.setItem("pendingVerificationEmail", trimmedEmail);
                navigate(`/verify-email?user_id=${data.user_id}`);
            } else {
                setUserData(data.user);
                window.dispatchEvent(new Event("premiumStatusChanged"));
                window.dispatchEvent(new Event("userLoggedIn"));
                navigate("/exam-dashboard", { replace: true });
            }
        } catch (err) {
            localStorage.removeItem("authToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("userData");
            
            if (err.name === 'AbortError') {
                setSignInError("Request timed out. Please check your connection and try again.");
            } else if (err.message && err.message.includes("Failed to fetch")) {
                setSignInError("Cannot connect to server. Please make sure the backend server is running.");
            } else if (err.message) {
                setSignInError(err.message);
            } else {
                setSignInError("Failed to login. Please check your credentials and try again.");
            }
        } finally {
            setSignInLoading(false);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setSignUpError("");

        if (!username || !signUpEmail || !signUpPassword) {
            setSignUpError("Please fill in all required fields");
            return;
        }

        if (username.length < 3 || username.length > 20) {
            setSignUpError("Username must be 3-20 characters");
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setSignUpError("Username can only contain letters, numbers, and underscores");
            return;
        }

        if (signUpPassword !== confirmPassword) {
            setSignUpError("Passwords do not match");
            return;
        }

        const pwdError = validatePassword(signUpPassword);
        if (pwdError) {
            setSignUpError(pwdError);
            return;
        }

        setSignUpLoading(true);

        try {
            const response = await fetch(buildApiUrl("auth/signup"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    email: signUpEmail.trim(),
                    username: username.trim(),
                    password: signUpPassword,
                    full_name: username.trim(),
                }),
            });

            if (!response.ok) {
                let errorMessage = "Signup failed. Please try again.";
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorMessage;
                } catch (parseError) {
                    if (response.status === 400) {
                        errorMessage = "Invalid input. Please check your details.";
                    } else if (response.status === 409) {
                        errorMessage = "Email or username already registered.";
                    } else if (response.status >= 500) {
                        errorMessage = "Server error. Please try again later.";
                    } else {
                        errorMessage = `Signup failed (${response.status}). Please try again.`;
                    }
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();

            // Check if email verification is required
            if (data.requires_verification) {
                // Store user ID and email for verification page
                localStorage.setItem("pendingVerificationUserId", data.user_id);
                localStorage.setItem("pendingVerificationEmail", signUpEmail.trim());
                // Navigate to verification page
                navigate(`/verify-email?user_id=${data.user_id}`);
            } else {
                setUserData(data.user);
                window.dispatchEvent(new Event("premiumStatusChanged"));
                window.dispatchEvent(new Event("userLoggedIn"));
                navigate("/exam-dashboard", { replace: true });
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                setSignUpError("Request timed out. Please check your connection and try again.");
            } else if (err.message && err.message.includes("Failed to fetch")) {
                setSignUpError("Cannot connect to server. Please make sure the backend server is running.");
            } else if (err.message) {
                setSignUpError(err.message);
            } else {
                setSignUpError("Failed to create account. Please try again.");
            }
        } finally {
            setSignUpLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 relative overflow-hidden">
            {/* Subtle background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-100/20 rounded-full blur-3xl"></div>
                    </div>

            {/* Top Section - Full Width: Branding (65%) + Auth (35%) */}
            <div className="relative z-10 min-h-screen flex flex-col lg:flex-row lg:items-start">
                {/* Left Side - Branding Content (65%) */}
                <div className="w-full lg:w-[65%] flex flex-col justify-center px-6 sm:px-8 lg:px-12 xl:px-16 pt-8 lg:pt-12 pb-12 lg:pb-16">
                                <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="max-w-3xl"
                    >
                        {/* Hero Section */}
                        <div className="mb-6 lg:mb-8">
                                <motion.div
                                className="flex items-center gap-4 mb-8"
                                initial={{ opacity: 0, x: -30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                            >
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg border-2 border-blue-200">
                                    <span className="text-white font-bold text-3xl">AI</span>
                                    </div>
                                <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent leading-tight">
                                    AI PYQ Assistant
                                </h1>
                                </motion.div>
                            <motion.p 
                                className="text-xl lg:text-2xl font-semibold text-gray-800 mb-6 leading-relaxed"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.3 }}
                            >
                                The First AI-Powered Platform for Previous Year Questions
                            </motion.p>
                            <motion.p 
                                className="text-base lg:text-lg text-gray-700 leading-relaxed max-w-2xl"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                            >
                                Revolutionize your exam preparation with intelligent search, personalized roadmaps, and comprehensive PYQ analysis.
                            </motion.p>
                                </div>

                        {/* Carousel Section */}
                            <motion.div
                            className="mb-12"
                            initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                        >
                            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-8 lg:p-10">
                                <AnimatePresence mode="wait">
                                    {carouselIndex === 0 && (
                            <motion.div
                                            key="features"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            transition={{ duration: 0.5, ease: "easeInOut" }}
                                        >
                                            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                                Why Choose AI PYQ Assistant?
                                            </h2>
                                            <div className="space-y-6">
                            <motion.div
                                                    className="flex items-start gap-5 group"
                                                    whileHover={{ x: 5 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 border border-blue-200 shadow-md">
                                                        <span className="text-3xl">🧠</span>
                                </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 text-base mb-2">AI-Powered Semantic Search</h3>
                                                        <p className="text-gray-700 leading-relaxed text-sm">Search through thousands of PYQs using natural language. Find exactly what you need, not just keyword matches.</p>
                                                    </div>
                            </motion.div>
                            <motion.div
                                                    className="flex items-start gap-5 group"
                                                    whileHover={{ x: 5 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 border border-indigo-200 shadow-md">
                                                        <span className="text-3xl">🎯</span>
                                </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 text-base mb-2">Smart AI Roadmap</h3>
                                                        <p className="text-gray-700 leading-relaxed text-sm">Get personalized study roadmaps generated by AI. Quick help in creating your preparation strategy based on your goals.</p>
                            </div>
                                                </motion.div>
                                    <motion.div
                                                    className="flex items-start gap-5 group"
                                                    whileHover={{ x: 5 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 border border-purple-200 shadow-md">
                                                        <span className="text-3xl">📑</span>
                                                </div>
                                                <div>
                                                        <h3 className="font-bold text-gray-900 text-base mb-2">Topic-wise Organization</h3>
                                                        <p className="text-gray-700 leading-relaxed text-sm">Access PYQs organized by topics for systematic preparation. Master each subject area efficiently.</p>
                                        </div>
                                    </motion.div>
                                    <motion.div
                                                    className="flex items-start gap-5 group"
                                                    whileHover={{ x: 5 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <div className="w-14 h-14 bg-gradient-to-br from-teal-100 to-teal-200 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 border border-teal-200 shadow-md">
                                                        <span className="text-3xl">🔍</span>
                                                </div>
                                                <div>
                                                        <h3 className="font-bold text-gray-900 text-base mb-2">Cross-Exam Insights</h3>
                                                        <p className="text-gray-700 leading-relaxed text-sm">Compare patterns and trends across different competitive exams. Understand what's important.</p>
                                                </div>
                                                </motion.div>
                                        </div>
                                    </motion.div>
                                )}
                                    {carouselIndex === 1 && (
                                    <motion.div
                                            key="premium"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            transition={{ duration: 0.5, ease: "easeInOut" }}
                                        >
                                            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                                Premium Features
                                            </h2>
                                            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 border border-blue-200 shadow-lg">
                                                <ul className="space-y-4">
                                                    <motion.li 
                                                        className="flex items-center gap-3"
                                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.1 }}
                                                    >
                                                        <span className="text-green-600 font-bold text-xl">✓</span>
                                                        <span className="text-gray-800 text-base font-medium">Advanced Analytics & Performance Tracking</span>
                                                    </motion.li>
                                                    <motion.li 
                                                        className="flex items-center gap-3"
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.2 }}
                                                    >
                                                        <span className="text-green-600 font-bold text-2xl">✓</span>
                                                        <span className="text-gray-800 text-base font-medium">Personal Note-Taking & Organization</span>
                                                    </motion.li>
                                                    <motion.li 
                                                        className="flex items-center gap-3"
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.3 }}
                                                    >
                                                        <span className="text-green-600 font-bold text-2xl">✓</span>
                                                        <span className="text-gray-800 text-base font-medium">Unlimited AI Roadmap Generation</span>
                                                    </motion.li>
                                                    <motion.li 
                                                        className="flex items-center gap-3"
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.4 }}
                                                    >
                                                        <span className="text-green-600 font-bold text-2xl">✓</span>
                                                        <span className="text-gray-800 text-base font-medium">Priority Support & Updates</span>
                                                    </motion.li>
                                                    <motion.li 
                                                        className="flex items-center gap-3"
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.5 }}
                                                    >
                                                        <span className="text-green-600 font-bold text-2xl">✓</span>
                                                        <span className="text-gray-800 text-base font-medium">Exclusive Access to New Features</span>
                                                    </motion.li>
                                                </ul>
                                        </div>
                                    </motion.div>
                                )}
                                    {carouselIndex === 2 && (
                                    <motion.div
                                            key="market"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            transition={{ duration: 0.5, ease: "easeInOut" }}
                                        >
                                            <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 border-l-4 border-yellow-400 p-8 rounded-r-2xl shadow-lg border-t border-r border-b border-yellow-200">
                                                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6 bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                                                    First in Market
                                                </h2>
                                                <p className="text-base lg:text-lg text-gray-800 font-medium leading-relaxed mb-6">
                                                    The only AI-powered PYQ assistant designed specifically to boost your exam preparation. 
                                                    Experience the future of competitive exam preparation with cutting-edge AI technology 
                                                    that understands context, not just keywords.
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-4xl">🚀</span>
                                                    <span className="text-gray-900 font-bold text-lg">Revolutionary Learning Experience</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                                {/* Carousel Indicators */}
                                <div className="flex gap-3 mt-8 justify-center">
                                    {[0, 1, 2].map((index) => (
                                    <button
                                        key={index}
                                            onClick={() => setCarouselIndex(index)}
                                        className={`h-2.5 rounded-full transition-all duration-300 ${
                                                carouselIndex === index
                                                    ? "w-10 bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md"
                                                : "w-2.5 bg-gray-300 hover:bg-gray-400"
                                        }`}
                                            aria-label={`Go to slide ${index + 1}`}
                                    />
                                ))}
                            </div>
                        </div>
                        </motion.div>
                    </motion.div>

            </div>

                {/* Right Side - Authentication (35%) */}
                <div className="w-full lg:w-[35%] flex items-start justify-center px-6 sm:px-8 lg:px-8 xl:px-12 py-12 lg:py-16 lg:pt-16 lg:sticky lg:top-0 lg:self-start">
                <motion.div
                        initial={{ opacity: 0, x: 30, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-full max-w-md"
                >
                    {/* Toggle between Sign In and Sign Up */}
                        <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-xl border border-gray-200 shadow-lg">
                        <button
                            onClick={() => {
                                setAuthMode("signin");
                                setSignInError("");
                                setSignUpError("");
                            }}
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                                authMode === "signin"
                                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                                    : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => {
                                setAuthMode("signup");
                                setSignInError("");
                                setSignUpError("");
                            }}
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                                authMode === "signup"
                                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                                    : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Sign In Form */}
                    {authMode === "signin" && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8"
                            >
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                                <p className="text-gray-600">Sign in to continue to AI PYQ Assistant</p>
                            </div>

                            <form onSubmit={handleSignIn} className="space-y-6">
                                <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your.email@example.com"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                        required
                                    />
                                </div>

                                {signInError && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
                                        >
                                        {signInError}
                                        </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={signInLoading}
                                        className="w-full bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {signInLoading ? "Signing in..." : "Sign In"}
                                </button>
                            </form>

                                {/* Google Sign-In Section */}
                                <div className="mt-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-300"></div>
                                        </div>
                                        <div className="relative flex justify-center text-sm">
                                            <span className="px-2 bg-white text-gray-500">Or continue with</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            window.location.href = buildApiUrl("auth/google");
                                        }}
                                        className="mt-4 w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-sm"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path
                                                fill="#4285F4"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="#34A853"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="#FBBC05"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            />
                                            <path
                                                fill="#EA4335"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            />
                                        </svg>
                                        Sign in with Google
                                    </button>
                                </div>

                                {/* Forgot Password Link */}
                                <div className="mt-6 text-center">
                                    <button
                                        onClick={() => navigate("/forgot-password")}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            </motion.div>
                    )}

                    {/* Sign Up Form */}
                    {authMode === "signup" && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="bg-white rounded-3xl shadow-xl border border-gray-200 p-5"
                            >
                            <div className="text-center mb-5">
                                    <h2 className="text-xl font-bold text-gray-900 mb-2">Create Account</h2>
                                    <p className="text-gray-600 text-xs">Sign up to get started with AI PYQ Assistant</p>
                            </div>

                            <form onSubmit={handleSignUp} className="space-y-4">
                                <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Username <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="johndoe"
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">3-20 characters, letters, numbers, and underscores only</p>
                                </div>

                                <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={signUpEmail}
                                        onChange={(e) => setSignUpEmail(e.target.value)}
                                        placeholder="your.email@example.com"
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm"
                                        required
                                    />
                                </div>

                                <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={signUpPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="At least 8 characters with uppercase, lowercase, and number"
                                            className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm ${
                                                passwordStrength ? "border-red-400" : "border-gray-300"
                                        }`}
                                        required
                                    />
                                    {passwordStrength && (
                                        <p className="text-xs text-red-600 mt-1">{passwordStrength}</p>
                                    )}
                                    {signUpPassword && !passwordStrength && (
                                        <p className="text-xs text-green-600 mt-1">✓ Password strength is good</p>
                                    )}
                                </div>

                                <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter your password"
                                            className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm ${
                                                confirmPassword && signUpPassword !== confirmPassword ? "border-red-400" : "border-gray-300"
                                        }`}
                                        required
                                    />
                                    {confirmPassword && signUpPassword !== confirmPassword && (
                                        <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                                    )}
                                    {confirmPassword && signUpPassword === confirmPassword && signUpPassword && (
                                        <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
                                    )}
                                </div>

                                {signUpError && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
                                        >
                                        {signUpError}
                                        </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={signUpLoading || !!passwordStrength}
                                        className="w-full bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {signUpLoading ? "Creating account..." : "Sign Up"}
                                </button>
                            </form>

                                {/* Google Sign-Up Section */}
                                <div className="mt-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-300"></div>
                                        </div>
                                        <div className="relative flex justify-center text-sm">
                                            <span className="px-2 bg-white text-gray-500">Or continue with</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            window.location.href = buildApiUrl("auth/google");
                                        }}
                                        className="mt-4 w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-sm"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path
                                                fill="#4285F4"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="#34A853"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="#FBBC05"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            />
                                            <path
                                                fill="#EA4335"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            />
                                        </svg>
                                        Sign up with Google
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </div>
                        </div>

            {/* Bottom Section - Full Width: Analytics (100%) + Testimonials (100%) */}
            <div className="relative z-10 w-full px-6 sm:px-8 lg:px-12 xl:px-16 pt-6 lg:pt-8 pb-12 lg:pb-16">
                <div className="max-w-7xl mx-auto">
                    <div className="w-full flex flex-col gap-12 lg:gap-16">
                        {/* Analytics & Features Section (100%) */}
                        <div className="w-full">
                            <motion.h2 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                                className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-10 lg:mb-12 text-center bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent"
                            >
                                Powerful Analytics & Features
                            </motion.h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                                    <motion.div
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.02, y: -5 }}
                                    transition={{ duration: 0.4, delay: 0.1 }}
                                    className="bg-white rounded-3xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-2xl flex items-center justify-center mb-6 shadow-md border border-blue-200">
                                        <span className="text-4xl">📈</span>
                                            </div>
                                    <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4">
                                        10x Boost
                                    </h3>
                                    <p className="text-gray-700 leading-relaxed text-base">
                                        Students experience a 10x improvement in their preparation efficiency with AI-powered insights and personalized roadmaps.
                                    </p>
                                    </motion.div>

                                    <motion.div
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.02, y: -5 }}
                                    transition={{ duration: 0.4, delay: 0.2 }}
                                    className="bg-white rounded-3xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-200 rounded-2xl flex items-center justify-center mb-6 shadow-md border border-purple-200">
                                        <span className="text-4xl">📚</span>
                                        </div>
                                    <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4">
                                        25+ Years of PYQs
                                    </h3>
                                    <p className="text-gray-700 leading-relaxed text-base">
                                        Access previous year questions from the past 25+ years across multiple competitive exams, all in one place.
                                    </p>
                                    </motion.div>

                                    <motion.div
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.02, y: -5 }}
                                    transition={{ duration: 0.4, delay: 0.3 }}
                                    className="bg-white rounded-3xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-cyan-200 rounded-2xl flex items-center justify-center mb-6 shadow-md border border-teal-200">
                                        <span className="text-4xl">🎯</span>
                                        </div>
                                    <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4">
                                        Multiple Exams
                                    </h3>
                                    <p className="text-gray-700 leading-relaxed text-base">
                                        Support for multiple competitive exams including UPSC, SSC, Banking, Railway, and many more.
                                    </p>
                                    </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.02, y: -5 }}
                                    transition={{ duration: 0.4, delay: 0.4 }}
                                    className="bg-white rounded-3xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-200 rounded-2xl flex items-center justify-center mb-6 shadow-md border border-orange-200">
                                        <span className="text-4xl">🔍</span>
                            </div>
                                    <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4">
                                        Smart Analytics
                                    </h3>
                                    <p className="text-gray-700 leading-relaxed text-base">
                                        Advanced analytics to track your progress, identify weak areas, and optimize your study strategy.
                                    </p>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.02, y: -5 }}
                                    transition={{ duration: 0.4, delay: 0.5 }}
                                    className="bg-white rounded-3xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-200 rounded-2xl flex items-center justify-center mb-6 shadow-md border border-green-200">
                                        <span className="text-4xl">⚡</span>
                                        </div>
                                    <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4">
                                        Instant Search
                                    </h3>
                                    <p className="text-gray-700 leading-relaxed text-base">
                                        Find relevant PYQs instantly using natural language queries powered by advanced AI semantic search.
                                    </p>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.02, y: -5 }}
                                    transition={{ duration: 0.4, delay: 0.6 }}
                                    className="bg-white rounded-3xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6 shadow-md border border-indigo-200">
                                        <span className="text-4xl">📊</span>
                                        </div>
                                    <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4">
                                        Performance Tracking
                                    </h3>
                                    <p className="text-gray-700 leading-relaxed text-base">
                                        Monitor your performance across different topics and exams with detailed insights and recommendations.
                                    </p>
                                </motion.div>
                                </div>
                                </div>

                        {/* Testimonials Section (100%) */}
                        <div className="w-full">
                            <motion.h2 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                                className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-10 lg:mb-12 text-center bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent"
                            >
                                What Students Say
                            </motion.h2>
                            <div className="relative w-full overflow-hidden rounded-3xl bg-white p-8 lg:p-10 border border-gray-200 shadow-xl">
                                <AnimatePresence mode="wait">
                                    {testimonialIndex === 0 && (
                                        <motion.div
                                            key="testimonial-0"
                                            initial={{ opacity: 0, x: 50, scale: 0.95 }}
                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                            exit={{ opacity: 0, x: -50, scale: 0.95 }}
                                            transition={{ duration: 0.6, ease: "easeInOut" }}
                                            className="w-full flex flex-col justify-center"
                                        >
                                            <div className="flex items-center gap-2 mb-8 justify-center">
                                                {[...Array(5)].map((_, i) => (
                                                    <span key={i} className="text-yellow-400 text-3xl drop-shadow-lg">★</span>
                                                ))}
                                            </div>
                                            <p className="text-lg lg:text-xl text-gray-800 italic text-center mb-10 leading-relaxed font-medium">
                                                "AI PYQ Assistant has completely transformed my preparation strategy. The semantic search 
                                                helps me find exactly what I need without wasting time. Highly recommended!"
                                            </p>
                                            <div className="flex items-center justify-center gap-5 mt-auto">
                                                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md border-2 border-blue-200">
                                                    RK
                                                </div>
                                                <div>
                                                    <div className="font-bold text-lg text-gray-900">Rahul Kumar</div>
                                                    <div className="text-gray-600 text-sm">UPSC Aspirant</div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                    {testimonialIndex === 1 && (
                                        <motion.div
                                            key="testimonial-1"
                                            initial={{ opacity: 0, x: 50, scale: 0.95 }}
                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                            exit={{ opacity: 0, x: -50, scale: 0.95 }}
                                            transition={{ duration: 0.6, ease: "easeInOut" }}
                                            className="w-full flex flex-col justify-center"
                                        >
                                            <div className="flex items-center gap-2 mb-8 justify-center">
                                                {[...Array(5)].map((_, i) => (
                                                    <span key={i} className="text-yellow-400 text-3xl drop-shadow-lg">★</span>
                                                ))}
                                            </div>
                                            <p className="text-lg lg:text-xl text-gray-800 italic text-center mb-10 leading-relaxed font-medium">
                                                "The AI Roadmap feature is a game-changer! It created a personalized study plan that 
                                                actually works. My confidence has increased significantly."
                                            </p>
                                            <div className="flex items-center justify-center gap-5 mt-auto">
                                                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md border-2 border-purple-200">
                                                    PS
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xl text-gray-900">Priya Sharma</div>
                                                    <div className="text-gray-600">SSC CGL Aspirant</div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                    {testimonialIndex === 2 && (
                                        <motion.div
                                            key="testimonial-2"
                                            initial={{ opacity: 0, x: 50, scale: 0.95 }}
                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                            exit={{ opacity: 0, x: -50, scale: 0.95 }}
                                            transition={{ duration: 0.6, ease: "easeInOut" }}
                                            className="w-full flex flex-col justify-center"
                                        >
                                            <div className="flex items-center gap-2 mb-8 justify-center">
                                                {[...Array(5)].map((_, i) => (
                                                    <span key={i} className="text-yellow-400 text-3xl drop-shadow-lg">★</span>
                                                ))}
                                            </div>
                                            <p className="text-lg lg:text-xl text-gray-800 italic text-center mb-10 leading-relaxed font-medium">
                                                "Topic-wise organization makes it so easy to focus on weak areas. The cross-exam insights 
                                                feature helped me understand patterns I never noticed before."
                                            </p>
                                            <div className="flex items-center justify-center gap-5 mt-auto">
                                                <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md border-2 border-teal-200">
                                                    AM
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xl text-gray-900">Amit Mehta</div>
                                                    <div className="text-gray-600">Banking Exam Aspirant</div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                    {testimonialIndex === 3 && (
                                        <motion.div
                                            key="testimonial-3"
                                            initial={{ opacity: 0, x: 50, scale: 0.95 }}
                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                            exit={{ opacity: 0, x: -50, scale: 0.95 }}
                                            transition={{ duration: 0.6, ease: "easeInOut" }}
                                            className="w-full flex flex-col justify-center"
                                        >
                                            <div className="flex items-center gap-2 mb-8 justify-center">
                                                {[...Array(5)].map((_, i) => (
                                                    <span key={i} className="text-yellow-400 text-3xl drop-shadow-lg">★</span>
                                                ))}
                                            </div>
                                            <p className="text-lg lg:text-xl text-gray-800 italic text-center mb-10 leading-relaxed font-medium">
                                                "Best investment for my exam preparation! The premium features are worth every penny. 
                                                My notes are organized and I can track my progress easily."
                                            </p>
                                            <div className="flex items-center justify-center gap-5 mt-auto">
                                                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md border-2 border-orange-200">
                                                    SK
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xl text-gray-900">Sneha Kapoor</div>
                                                    <div className="text-gray-600">Railway Exam Aspirant</div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                
                                {/* Testimonial Indicators */}
                                <div className="flex gap-3 mt-8 justify-center">
                                    {[0, 1, 2, 3].map((index) => (
                                        <button
                                            key={index}
                                            onClick={() => setTestimonialIndex(index)}
                                            className={`h-2.5 rounded-full transition-all duration-300 ${
                                                testimonialIndex === index
                                                    ? "w-10 bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md"
                                                    : "w-2.5 bg-gray-300 hover:bg-gray-400"
                                            }`}
                                            aria-label={`Go to testimonial ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

