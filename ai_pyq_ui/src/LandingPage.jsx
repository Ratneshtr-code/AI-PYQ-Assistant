// src/LandingPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { setUserData, isAuthenticated } from "./utils/auth";

const API_BASE_URL = "";

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

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated()) {
            navigate("/exam-dashboard", { replace: true });
        }
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
            
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
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

            setUserData(data.user);
            window.dispatchEvent(new Event("premiumStatusChanged"));
            window.dispatchEvent(new Event("userLoggedIn"));

            navigate("/exam-dashboard", { replace: true });
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
            const response = await fetch(`${API_BASE_URL}/auth/signup`, {
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
            setUserData(data.user);
            window.dispatchEvent(new Event("premiumStatusChanged"));
            window.dispatchEvent(new Event("userLoggedIn"));

            navigate("/exam-dashboard", { replace: true });
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
            </div>

            {/* Top Section - Full Width: Branding (65%) + Auth (35%) */}
            <div className="relative z-10 min-h-screen flex flex-col lg:flex-row lg:items-start">
                {/* Left Side - Branding Content (65%) */}
                <div className="w-full lg:w-[65%] flex flex-col justify-center px-6 sm:px-8 lg:px-12 xl:px-16 py-12 lg:py-16">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="max-w-3xl"
                    >
                        {/* Hero Section */}
                        <div className="mb-12 lg:mb-16">
                            <motion.div 
                                className="flex items-center gap-4 mb-8"
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                            >
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/50 ring-4 ring-white/10 backdrop-blur-sm">
                                    <span className="text-white font-bold text-3xl">AI</span>
                                </div>
                                <h1 className="text-5xl lg:text-6xl xl:text-7xl font-extrabold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent leading-tight">
                                    AI PYQ Assistant
                                </h1>
                            </motion.div>
                            <motion.p 
                                className="text-2xl lg:text-3xl font-semibold text-white/95 mb-6 leading-relaxed"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.3 }}
                            >
                                The First AI-Powered Platform for Previous Year Questions
                            </motion.p>
                            <motion.p 
                                className="text-lg lg:text-xl text-white/80 leading-relaxed max-w-2xl"
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
                            <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl shadow-black/20 p-8 lg:p-10">
                                <AnimatePresence mode="wait">
                                    {carouselIndex === 0 && (
                                        <motion.div
                                            key="features"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            transition={{ duration: 0.5, ease: "easeInOut" }}
                                        >
                                            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-8 bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                                                Why Choose AI PYQ Assistant?
                                            </h2>
                                            <div className="space-y-6">
                                                <motion.div 
                                                    className="flex items-start gap-5 group"
                                                    whileHover={{ x: 5 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <div className="w-14 h-14 bg-gradient-to-br from-blue-400/20 to-blue-600/30 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 backdrop-blur-sm border border-white/20 shadow-lg">
                                                        <span className="text-3xl">🧠</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-white text-lg mb-2">AI-Powered Semantic Search</h3>
                                                        <p className="text-white/80 leading-relaxed">Search through thousands of PYQs using natural language. Find exactly what you need, not just keyword matches.</p>
                                                    </div>
                                                </motion.div>
                                                <motion.div 
                                                    className="flex items-start gap-5 group"
                                                    whileHover={{ x: 5 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-400/20 to-indigo-600/30 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 backdrop-blur-sm border border-white/20 shadow-lg">
                                                        <span className="text-3xl">🎯</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-white text-lg mb-2">Smart AI Roadmap</h3>
                                                        <p className="text-white/80 leading-relaxed">Get personalized study roadmaps generated by AI. Quick help in creating your preparation strategy based on your goals.</p>
                                                    </div>
                                                </motion.div>
                                                <motion.div 
                                                    className="flex items-start gap-5 group"
                                                    whileHover={{ x: 5 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <div className="w-14 h-14 bg-gradient-to-br from-purple-400/20 to-purple-600/30 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 backdrop-blur-sm border border-white/20 shadow-lg">
                                                        <span className="text-3xl">📑</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-white text-lg mb-2">Topic-wise Organization</h3>
                                                        <p className="text-white/80 leading-relaxed">Access PYQs organized by topics for systematic preparation. Master each subject area efficiently.</p>
                                                    </div>
                                                </motion.div>
                                                <motion.div 
                                                    className="flex items-start gap-5 group"
                                                    whileHover={{ x: 5 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <div className="w-14 h-14 bg-gradient-to-br from-teal-400/20 to-teal-600/30 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 backdrop-blur-sm border border-white/20 shadow-lg">
                                                        <span className="text-3xl">🔍</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-white text-lg mb-2">Cross-Exam Insights</h3>
                                                        <p className="text-white/80 leading-relaxed">Compare patterns and trends across different competitive exams. Understand what's important.</p>
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
                                            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-8 bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                                                Premium Features
                                            </h2>
                                            <div className="bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-2xl p-8 border border-white/30 backdrop-blur-sm shadow-xl">
                                                <ul className="space-y-4">
                                                    <motion.li 
                                                        className="flex items-center gap-3"
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.1 }}
                                                    >
                                                        <span className="text-green-400 font-bold text-2xl">✓</span>
                                                        <span className="text-white text-lg font-medium">Advanced Analytics & Performance Tracking</span>
                                                    </motion.li>
                                                    <motion.li 
                                                        className="flex items-center gap-3"
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.2 }}
                                                    >
                                                        <span className="text-green-400 font-bold text-2xl">✓</span>
                                                        <span className="text-white text-lg font-medium">Personal Note-Taking & Organization</span>
                                                    </motion.li>
                                                    <motion.li 
                                                        className="flex items-center gap-3"
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.3 }}
                                                    >
                                                        <span className="text-green-400 font-bold text-2xl">✓</span>
                                                        <span className="text-white text-lg font-medium">Unlimited AI Roadmap Generation</span>
                                                    </motion.li>
                                                    <motion.li 
                                                        className="flex items-center gap-3"
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.4 }}
                                                    >
                                                        <span className="text-green-400 font-bold text-2xl">✓</span>
                                                        <span className="text-white text-lg font-medium">Priority Support & Updates</span>
                                                    </motion.li>
                                                    <motion.li 
                                                        className="flex items-center gap-3"
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.5 }}
                                                    >
                                                        <span className="text-green-400 font-bold text-2xl">✓</span>
                                                        <span className="text-white text-lg font-medium">Exclusive Access to New Features</span>
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
                                            <div className="bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20 border-l-4 border-yellow-400 p-8 rounded-r-2xl shadow-2xl backdrop-blur-sm border-t border-r border-b border-white/20">
                                                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent">
                                                    First in Market
                                                </h2>
                                                <p className="text-lg lg:text-xl text-white/90 font-medium leading-relaxed mb-6">
                                                    The only AI-powered PYQ assistant designed specifically to boost your exam preparation. 
                                                    Experience the future of competitive exam preparation with cutting-edge AI technology 
                                                    that understands context, not just keywords.
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-4xl">🚀</span>
                                                    <span className="text-white font-bold text-xl">Revolutionary Learning Experience</span>
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
                                                    ? "w-10 bg-gradient-to-r from-blue-400 to-purple-400 shadow-lg shadow-blue-500/50"
                                                    : "w-2.5 bg-white/30 hover:bg-white/50"
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
                <div className="w-full lg:w-[35%] flex items-start justify-center px-6 sm:px-8 lg:px-8 xl:px-12 py-12 lg:py-16 lg:sticky lg:top-0 lg:self-start">
                    <motion.div
                        initial={{ opacity: 0, x: 30, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="w-full max-w-md"
                    >
                        {/* Toggle between Sign In and Sign Up */}
                        <div className="flex gap-2 mb-8 bg-white/10 backdrop-blur-xl p-1.5 rounded-xl border border-white/20 shadow-2xl">
                            <button
                                onClick={() => {
                                    setAuthMode("signin");
                                    setSignInError("");
                                    setSignUpError("");
                                }}
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                                    authMode === "signin"
                                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/50"
                                        : "text-white/70 hover:text-white"
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
                                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/50"
                                        : "text-white/70 hover:text-white"
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
                                className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8"
                            >
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                                    <p className="text-white/80">Sign in to continue to AI PYQ Assistant</p>
                                </div>

                                <form onSubmit={handleSignIn} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="your.email@example.com"
                                            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter your password"
                                            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all outline-none"
                                            required
                                        />
                                    </div>

                                    {signInError && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-red-500/20 backdrop-blur-sm border border-red-400/50 text-red-100 px-4 py-3 rounded-xl text-sm"
                                        >
                                            {signInError}
                                        </motion.div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={signInLoading}
                                        className="w-full bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {signInLoading ? "Signing in..." : "Sign In"}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* Sign Up Form */}
                        {authMode === "signup" && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8"
                            >
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
                                    <p className="text-white/80">Sign up to get started with AI PYQ Assistant</p>
                                </div>

                                <form onSubmit={handleSignUp} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">
                                            Username <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="johndoe"
                                            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all outline-none"
                                            required
                                        />
                                        <p className="text-xs text-white/60 mt-1">3-20 characters, letters, numbers, and underscores only</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">
                                            Email <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={signUpEmail}
                                            onChange={(e) => setSignUpEmail(e.target.value)}
                                            placeholder="your.email@example.com"
                                            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">
                                            Password <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="password"
                                            value={signUpPassword}
                                            onChange={handlePasswordChange}
                                            placeholder="At least 8 characters with uppercase, lowercase, and number"
                                            className={`w-full px-4 py-3 bg-white/10 backdrop-blur-sm border rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all outline-none ${
                                                passwordStrength ? "border-red-400/50" : "border-white/30"
                                            }`}
                                            required
                                        />
                                        {passwordStrength && (
                                            <p className="text-xs text-red-300 mt-1">{passwordStrength}</p>
                                        )}
                                        {signUpPassword && !passwordStrength && (
                                            <p className="text-xs text-green-300 mt-1">✓ Password strength is good</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">
                                            Confirm Password
                                        </label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter your password"
                                            className={`w-full px-4 py-3 bg-white/10 backdrop-blur-sm border rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all outline-none ${
                                                confirmPassword && signUpPassword !== confirmPassword ? "border-red-400/50" : "border-white/30"
                                            }`}
                                            required
                                        />
                                        {confirmPassword && signUpPassword !== confirmPassword && (
                                            <p className="text-xs text-red-300 mt-1">Passwords do not match</p>
                                        )}
                                        {confirmPassword && signUpPassword === confirmPassword && signUpPassword && (
                                            <p className="text-xs text-green-300 mt-1">✓ Passwords match</p>
                                        )}
                                    </div>

                                    {signUpError && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-red-500/20 backdrop-blur-sm border border-red-400/50 text-red-100 px-4 py-3 rounded-xl text-sm"
                                        >
                                            {signUpError}
                                        </motion.div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={signUpLoading || !!passwordStrength}
                                        className="w-full bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {signUpLoading ? "Creating account..." : "Sign Up"}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Bottom Section - Full Width: Analytics (100%) + Testimonials (100%) */}
            <div className="relative z-10 w-full px-6 sm:px-8 lg:px-12 xl:px-16 py-12 lg:py-16">
                <div className="max-w-7xl mx-auto">
                    <div className="w-full flex flex-col gap-12 lg:gap-16">
                        {/* Analytics & Features Section (100%) */}
                        <div className="w-full">
                            <motion.h2 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                                className="text-4xl lg:text-5xl font-extrabold text-white mb-10 lg:mb-12 text-center bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 bg-clip-text text-transparent"
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
                                    className="backdrop-blur-xl bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-blue-500/30 transition-all duration-300"
                                >
                                    <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/50">
                                        <span className="text-4xl">📈</span>
                                    </div>
                                    <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                                        10x Boost
                                    </h3>
                                    <p className="text-white/80 leading-relaxed text-lg">
                                        Students experience a 10x improvement in their preparation efficiency with AI-powered insights and personalized roadmaps.
                                    </p>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.02, y: -5 }}
                                    transition={{ duration: 0.4, delay: 0.2 }}
                                    className="backdrop-blur-xl bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-rose-500/20 rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-purple-500/30 transition-all duration-300"
                                >
                                    <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-purple-500/50">
                                        <span className="text-4xl">📚</span>
                                    </div>
                                    <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                                        25+ Years of PYQs
                                    </h3>
                                    <p className="text-white/80 leading-relaxed text-lg">
                                        Access previous year questions from the past 25+ years across multiple competitive exams, all in one place.
                                    </p>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.02, y: -5 }}
                                    transition={{ duration: 0.4, delay: 0.3 }}
                                    className="backdrop-blur-xl bg-gradient-to-br from-teal-500/20 via-cyan-500/20 to-blue-500/20 rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-teal-500/30 transition-all duration-300"
                                >
                                    <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-teal-500/50">
                                        <span className="text-4xl">🎯</span>
                                    </div>
                                    <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                                        Multiple Exams
                                    </h3>
                                    <p className="text-white/80 leading-relaxed text-lg">
                                        Support for multiple competitive exams including UPSC, SSC, Banking, Railway, and many more.
                                    </p>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.02, y: -5 }}
                                    transition={{ duration: 0.4, delay: 0.4 }}
                                    className="backdrop-blur-xl bg-gradient-to-br from-orange-500/20 via-red-500/20 to-rose-500/20 rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-orange-500/30 transition-all duration-300"
                                >
                                    <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-orange-500/50">
                                        <span className="text-4xl">🔍</span>
                                    </div>
                                    <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                                        Smart Analytics
                                    </h3>
                                    <p className="text-white/80 leading-relaxed text-lg">
                                        Advanced analytics to track your progress, identify weak areas, and optimize your study strategy.
                                    </p>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.02, y: -5 }}
                                    transition={{ duration: 0.4, delay: 0.5 }}
                                    className="backdrop-blur-xl bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-teal-500/20 rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-green-500/30 transition-all duration-300"
                                >
                                    <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-green-500/50">
                                        <span className="text-4xl">⚡</span>
                                    </div>
                                    <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                                        Instant Search
                                    </h3>
                                    <p className="text-white/80 leading-relaxed text-lg">
                                        Find relevant PYQs instantly using natural language queries powered by advanced AI semantic search.
                                    </p>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.02, y: -5 }}
                                    transition={{ duration: 0.4, delay: 0.6 }}
                                    className="backdrop-blur-xl bg-gradient-to-br from-indigo-500/20 via-blue-500/20 to-purple-500/20 rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-indigo-500/30 transition-all duration-300"
                                >
                                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/50">
                                        <span className="text-4xl">📊</span>
                                    </div>
                                    <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                                        Performance Tracking
                                    </h3>
                                    <p className="text-white/80 leading-relaxed text-lg">
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
                                className="text-4xl lg:text-5xl font-extrabold text-white mb-10 lg:mb-12 text-center bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 bg-clip-text text-transparent"
                            >
                                What Students Say
                            </motion.h2>
                            <div className="relative w-full overflow-hidden rounded-3xl backdrop-blur-xl bg-white/10 p-8 lg:p-10 border border-white/20 shadow-2xl">
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
                                            <p className="text-xl lg:text-2xl text-white/95 italic text-center mb-10 leading-relaxed font-medium">
                                                "AI PYQ Assistant has completely transformed my preparation strategy. The semantic search 
                                                helps me find exactly what I need without wasting time. Highly recommended!"
                                            </p>
                                            <div className="flex items-center justify-center gap-5 mt-auto">
                                                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-xl shadow-blue-500/50 ring-4 ring-white/20">
                                                    RK
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xl text-white">Rahul Kumar</div>
                                                    <div className="text-white/70">UPSC Aspirant</div>
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
                                            <p className="text-xl lg:text-2xl text-white/95 italic text-center mb-10 leading-relaxed font-medium">
                                                "The AI Roadmap feature is a game-changer! It created a personalized study plan that 
                                                actually works. My confidence has increased significantly."
                                            </p>
                                            <div className="flex items-center justify-center gap-5 mt-auto">
                                                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-xl shadow-purple-500/50 ring-4 ring-white/20">
                                                    PS
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xl text-white">Priya Sharma</div>
                                                    <div className="text-white/70">SSC CGL Aspirant</div>
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
                                            <p className="text-xl lg:text-2xl text-white/95 italic text-center mb-10 leading-relaxed font-medium">
                                                "Topic-wise organization makes it so easy to focus on weak areas. The cross-exam insights 
                                                feature helped me understand patterns I never noticed before."
                                            </p>
                                            <div className="flex items-center justify-center gap-5 mt-auto">
                                                <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-xl shadow-teal-500/50 ring-4 ring-white/20">
                                                    AM
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xl text-white">Amit Mehta</div>
                                                    <div className="text-white/70">Banking Exam Aspirant</div>
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
                                            <p className="text-xl lg:text-2xl text-white/95 italic text-center mb-10 leading-relaxed font-medium">
                                                "Best investment for my exam preparation! The premium features are worth every penny. 
                                                My notes are organized and I can track my progress easily."
                                            </p>
                                            <div className="flex items-center justify-center gap-5 mt-auto">
                                                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-xl shadow-orange-500/50 ring-4 ring-white/20">
                                                    SK
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xl text-white">Sneha Kapoor</div>
                                                    <div className="text-white/70">Railway Exam Aspirant</div>
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
                                                    ? "w-10 bg-gradient-to-r from-blue-400 to-purple-400 shadow-lg shadow-blue-500/50"
                                                    : "w-2.5 bg-white/30 hover:bg-white/50"
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

