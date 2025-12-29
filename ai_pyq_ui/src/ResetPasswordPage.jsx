// src/ResetPasswordPage.jsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";

const API_BASE_URL = "";

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [token, setToken] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState("");

    useEffect(() => {
        // Get token from URL params
        const urlToken = searchParams.get("token");
        if (urlToken) {
            setToken(urlToken);
        } else {
            setError("Invalid reset link. Please request a new password reset.");
        }
    }, [searchParams]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!token) {
            setError("Invalid reset link. Please request a new password reset.");
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
            const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    token: token,
                    new_password: password,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to reset password");
            }

            setSuccess(true);
        } catch (err) {
            setError(err.message || "Failed to reset password. Please try again.");
            console.error("Reset password error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
                >
                    <div className="text-center">
                        <div className="mb-6">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Password Reset Successful!</h1>
                        <p className="text-gray-600 mb-6">
                            Your password has been reset successfully. You can now login with your new password.
                        </p>
                        <button
                            onClick={() => navigate("/login")}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Go to Login
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
                    <p className="text-gray-600">
                        Enter your new password below
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password <span className="text-red-500">*</span>
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
                            autoFocus
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
                            Confirm New Password <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter your new password"
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
                        disabled={loading || !!passwordStrength || password !== confirmPassword}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Remember your password?{" "}
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

