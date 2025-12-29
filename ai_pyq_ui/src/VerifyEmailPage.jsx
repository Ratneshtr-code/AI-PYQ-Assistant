// src/VerifyEmailPage.jsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { setUserData } from "./utils/auth";

const API_BASE_URL = "";

export default function VerifyEmailPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [userId, setUserId] = useState(null);
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [email, setEmail] = useState("");

    useEffect(() => {
        // Get user_id from URL params or localStorage
        const urlUserId = searchParams.get("user_id");
        const storedUserId = localStorage.getItem("pendingVerificationUserId");
        const storedEmail = localStorage.getItem("pendingVerificationEmail");
        
        if (urlUserId) {
            setUserId(parseInt(urlUserId));
            localStorage.setItem("pendingVerificationUserId", urlUserId);
        } else if (storedUserId) {
            setUserId(parseInt(storedUserId));
        } else {
            // No user ID, redirect to signup
            navigate("/signup");
            return;
        }
        
        if (storedEmail) {
            setEmail(storedEmail);
        }
    }, [navigate, searchParams]);

    const handleVerify = async (e) => {
        e.preventDefault();
        setError("");
        
        if (!otp || otp.length !== 6) {
            setError("Please enter a valid 6-digit OTP code");
            return;
        }

        if (!userId) {
            setError("Invalid session. Please sign up again.");
            navigate("/signup");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    user_id: userId,
                    otp_code: otp,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Verification failed");
            }

            const data = await response.json();
            
            // Clear pending verification data
            localStorage.removeItem("pendingVerificationUserId");
            localStorage.removeItem("pendingVerificationEmail");
            
            // Store user data
            setUserData(data.user);

            // Dispatch events
            window.dispatchEvent(new Event("premiumStatusChanged"));
            window.dispatchEvent(new Event("userLoggedIn"));

            // Navigate to exam dashboard
            navigate("/exam-dashboard", { replace: true });
        } catch (err) {
            setError(err.message || "Failed to verify email. Please try again.");
            console.error("Verification error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (!email) {
            setError("Email not found. Please sign up again.");
            navigate("/signup");
            return;
        }

        setResending(true);
        setError("");

        try {
            const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    email: email,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to resend OTP");
            }

            const data = await response.json();
            alert(data.message || "OTP code has been resent to your email");
        } catch (err) {
            setError(err.message || "Failed to resend OTP. Please try again.");
            console.error("Resend OTP error:", err);
        } finally {
            setResending(false);
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
                    <p className="text-gray-600">
                        We've sent a 6-digit verification code to your email address
                    </p>
                    {email && (
                        <p className="text-sm text-gray-500 mt-2">{email}</p>
                    )}
                </div>

                <form onSubmit={handleVerify} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Enter Verification Code
                        </label>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                                setOtp(value);
                            }}
                            placeholder="000000"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                            maxLength={6}
                            required
                            autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Enter the 6-digit code sent to your email
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || otp.length !== 6}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Verifying..." : "Verify Email"}
                    </button>
                </form>

                <div className="mt-6 text-center space-y-3">
                    <button
                        onClick={handleResendOTP}
                        disabled={resending || !email}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {resending ? "Sending..." : "Resend OTP Code"}
                    </button>
                    <p className="text-xs text-gray-500">
                        Didn't receive the code? Check your spam folder or click "Resend OTP Code"
                    </p>
                    <p className="text-sm text-gray-600">
                        <button
                            onClick={() => navigate("/signup")}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Back to Sign Up
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

