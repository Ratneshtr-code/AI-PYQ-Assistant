// src/LoginPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { setUserData, isAuthenticated } from "./utils/auth";

// Use empty string for Vite proxy (same-origin), or "http://127.0.0.1:8000" for direct access
const API_BASE_URL = "";

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated()) {
            navigate("/exam-dashboard", { replace: true });
        }
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        // Client-side validation
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setError("Email is required");
            setLoading(false);
            return;
        }
        
        if (!trimmedEmail.includes("@")) {
            setError("Please enter a valid email address");
            setLoading(false);
            return;
        }
        
        if (!password || password.length === 0) {
            setError("Password is required");
            setLoading(false);
            return;
        }

        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include", // Important: include cookies
                signal: controller.signal,
                body: JSON.stringify({
                    email: trimmedEmail,
                    password: password,
                }),
            });
            
            clearTimeout(timeoutId);

            // Check response status BEFORE parsing JSON
            if (!response.ok) {
                let errorMessage = "Login failed. Please check your credentials.";
                
                try {
                    const errorData = await response.json();
                    // Use the error detail from backend if available
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
                    // If JSON parsing fails, use status-based messages
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

            // Validate response has required fields
            if (!data.user) {
                throw new Error("Invalid response from server. Please try again.");
            }
            
            // Debug: Check if cookie was set
            console.log("Login successful, checking cookies...");
            const setCookieHeader = response.headers.get("set-cookie");
            console.log("Set-Cookie header:", setCookieHeader ? "✅ PRESENT" : "❌ MISSING");
            if (setCookieHeader) {
                console.log("Cookie details:", setCookieHeader.substring(0, 100) + "...");
            } else {
                console.error("⚠️ CRITICAL: Set-Cookie header not found! Cookie was NOT set by backend.");
            }

            // Verify user data includes is_admin
            if (typeof data.user.is_admin !== "boolean") {
                console.warn("User data missing is_admin field, defaulting to false");
                data.user.is_admin = false;
            }

            // Store user data - session cookie is automatically set by backend!
            setUserData(data.user);

            // Dispatch events
            window.dispatchEvent(new Event("premiumStatusChanged"));
            window.dispatchEvent(new Event("userLoggedIn"));

            // Navigate to exam dashboard
            navigate("/exam-dashboard", { replace: true });
        } catch (err) {
            // Clear any partial auth data on error
            localStorage.removeItem("authToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("userData");
            
            // Handle different error types
            if (err.name === 'AbortError') {
                setError("Request timed out. Please check your connection and try again.");
            } else if (err.message && err.message.includes("Failed to fetch")) {
                setError("Cannot connect to server. Please make sure the backend server is running on http://127.0.0.1:8000");
            } else if (err.message) {
                setError(err.message);
            } else {
                setError("Failed to login. Please check your credentials and try again.");
            }
            
            console.error("Login error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                    <p className="text-gray-600">Sign in to continue to AI PYQ Assistant</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your.email@example.com"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                {/* Google Sign-In Section - FORCE VISIBLE */}
                <div className="mt-6" style={{ display: 'block', visibility: 'visible' }}>
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
                            window.location.href = `${API_BASE_URL || "http://localhost:8000"}/auth/google`;
                        }}
                        className="mt-4 w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                        style={{ display: 'flex', visibility: 'visible' }}
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

                {/* Forgot Password and Sign Up Links - FORCE VISIBLE */}
                <div className="mt-6 text-center space-y-2" style={{ display: 'block', visibility: 'visible' }}>
                    <p className="text-sm text-gray-600">
                        <button
                            onClick={() => navigate("/forgot-password")}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                            style={{ display: 'inline', visibility: 'visible' }}
                        >
                            Forgot Password?
                        </button>
                    </p>
                    <p className="text-sm text-gray-600">
                        Don't have an account?{" "}
                        <button
                            onClick={() => navigate("/signup")}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Sign Up
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

