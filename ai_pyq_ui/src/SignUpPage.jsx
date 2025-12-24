// src/SignUpPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { setUserData } from "./utils/auth";

// Use empty string for Vite proxy (same-origin)
const API_BASE_URL = "";

export default function SignUpPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState("");

    const validatePassword = (pwd) => {
        if (pwd.length < 8) return "Password must be at least 8 characters";
        if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter";
        if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter";
        if (!/\d/.test(pwd)) return "Password must contain at least one number";
        return "";
    };

    const handlePasswordChange = (e) => {
        const pwd = e.target.value;
        setPassword(pwd);
        if (pwd) {
            const strength = validatePassword(pwd);
            setPasswordStrength(strength);
        } else {
            setPasswordStrength("");
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError("");

        // Validation
        if (!username || !email || !password) {
            setError("Please fill in all required fields");
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

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        const pwdError = validatePassword(password);
        if (pwdError) {
            setError(pwdError);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include", // Important: include cookies
                body: JSON.stringify({
                    email: email.trim(),
                    username: username.trim(),
                    password: password,
                    full_name: username.trim(),
                }),
            });

            // Check response status BEFORE parsing JSON
            if (!response.ok) {
                let errorMessage = "Signup failed. Please try again.";
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorMessage;
                } catch (parseError) {
                    // If response is not JSON (e.g., HTML error page), use status-based message
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

            // Store user data - session cookie is automatically set by backend!
            setUserData(data.user);

            // Dispatch event to update sidebar
            window.dispatchEvent(new Event("premiumStatusChanged"));
            window.dispatchEvent(new Event("userLoggedIn"));

            // Navigate to home
            navigate("/");
        } catch (err) {
            // Handle different error types
            if (err.name === 'AbortError') {
                setError("Request timed out. Please check your connection and try again.");
            } else if (err.message && err.message.includes("Failed to fetch")) {
                setError("Cannot connect to server. Please make sure the backend server is running.");
            } else if (err.message) {
                setError(err.message);
            } else {
                setError("Failed to create account. Please try again.");
            }
            console.error("Signup error:", err);
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
                    <p className="text-gray-600">Sign up to get started with AI PYQ Assistant</p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Username <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="johndoe"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">3-20 characters, letters, numbers, and underscores only</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email <span className="text-red-500">*</span>
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
                            Password <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={handlePasswordChange}
                            placeholder="At least 8 characters with uppercase, lowercase, and number"
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                passwordStrength ? "border-red-300" : "border-gray-300"
                            }`}
                            required
                        />
                        {passwordStrength && (
                            <p className="text-xs text-red-600 mt-1">{passwordStrength}</p>
                        )}
                        {password && !passwordStrength && (
                            <p className="text-xs text-green-600 mt-1">✓ Password strength is good</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter your password"
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                confirmPassword && password !== confirmPassword ? "border-red-300" : "border-gray-300"
                            }`}
                            required
                        />
                        {confirmPassword && password !== confirmPassword && (
                            <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                        )}
                        {confirmPassword && password === confirmPassword && password && (
                            <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !!passwordStrength}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creating account..." : "Sign Up"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Already have an account?{" "}
                        <button
                            onClick={() => navigate("/login")}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Sign In
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

