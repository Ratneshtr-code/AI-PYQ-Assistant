// src/SubscriptionManagementPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import { authenticatedFetch, getCurrentUser } from "./utils/auth";

// Use empty string for Vite proxy (same-origin)
const API_BASE_URL = "";

export default function SubscriptionManagementPage() {
    const navigate = useNavigate();
    const [examsList, setExamsList] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    
    // Form state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        plan_type: "premium",
        price: 0,
        duration_months: 1,
        is_active: true
    });

    useEffect(() => {
        // Check if user is admin
        const checkAdmin = async () => {
            try {
                const user = await getCurrentUser();
                if (user && user.is_admin) {
                    setIsAdmin(true);
                    fetchPlans();
                    fetchExams();
                } else {
                    navigate("/exam-dashboard");
                }
            } catch (err) {
                console.error("Failed to check admin status:", err);
                navigate("/exam-dashboard");
            } finally {
                setLoading(false);
            }
        };
        checkAdmin();
    }, [navigate]);

    const fetchExams = async () => {
        try {
            const res = await fetch("/filters");
            const data = await res.json();
            setExamsList(data.exams || []);
        } catch (err) {
            console.error("Failed to fetch exams:", err);
        }
    };

    const fetchPlans = async () => {
        try {
            setError("");
            const response = await authenticatedFetch(`${API_BASE_URL}/admin/subscription-plans`);
            if (response.ok) {
                const data = await response.json();
                setPlans(data || []);
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to fetch plans: ${response.status}`);
            }
        } catch (err) {
            console.error("Error fetching plans:", err);
            setError(err.message || "Failed to fetch subscription plans. Please try again.");
            setPlans([]);
        }
    };

    const handleCreatePlan = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/admin/subscription-plans`, {
                method: "POST",
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setSuccess("Subscription plan created successfully!");
                setShowCreateForm(false);
                setFormData({
                    name: "",
                    plan_type: "premium",
                    price: 0,
                    duration_months: 1,
                    is_active: true
                });
                await fetchPlans();
                setTimeout(() => setSuccess(""), 3000);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to create plan");
            }
        } catch (err) {
            setError(err.message || "Failed to create subscription plan");
        }
    };

    const handleUpdatePlan = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        try {
            const response = await authenticatedFetch(
                `${API_BASE_URL}/admin/subscription-plans/${editingPlan.id}`,
                {
                    method: "PUT",
                    body: JSON.stringify(formData),
                }
            );

            if (response.ok) {
                setSuccess("Subscription plan updated successfully!");
                setEditingPlan(null);
                setFormData({
                    name: "",
                    plan_type: "premium",
                    price: 0,
                    duration_months: 1,
                    is_active: true
                });
                await fetchPlans();
                setTimeout(() => setSuccess(""), 3000);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to update plan");
            }
        } catch (err) {
            setError(err.message || "Failed to update subscription plan");
        }
    };

    const handleDeletePlan = async (planId) => {
        if (!window.confirm("Are you sure you want to deactivate this subscription plan? It will be marked as inactive.")) {
            return;
        }

        try {
            const response = await authenticatedFetch(
                `${API_BASE_URL}/admin/subscription-plans/${planId}`,
                {
                    method: "DELETE",
                }
            );

            if (response.ok) {
                setSuccess("Subscription plan deactivated successfully!");
                await fetchPlans();
                setTimeout(() => setSuccess(""), 3000);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to delete plan");
            }
        } catch (err) {
            setError(err.message || "Failed to delete subscription plan");
        }
    };

    const handleToggleActive = async (plan) => {
        try {
            const response = await authenticatedFetch(
                `${API_BASE_URL}/admin/subscription-plans/${plan.id}`,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        is_active: !plan.is_active
                    }),
                }
            );

            if (response.ok) {
                setSuccess(`Plan ${!plan.is_active ? "activated" : "deactivated"} successfully!`);
                await fetchPlans();
                setTimeout(() => setSuccess(""), 3000);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to toggle plan status");
            }
        } catch (err) {
            setError(err.message || "Failed to toggle plan status");
        }
    };

    const startEdit = (plan) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            plan_type: plan.plan_type,
            price: plan.price,
            duration_months: plan.duration_months,
            is_active: plan.is_active
        });
        setShowCreateForm(false);
    };

    const cancelEdit = () => {
        setEditingPlan(null);
        setFormData({
            name: "",
            plan_type: "premium",
            price: 0,
            duration_months: 1,
            is_active: true
        });
    };

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

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar exam="" setExam={() => {}} examsList={examsList} onOpenSecondarySidebar={() => {}} />
            
            <main className="flex-1 ml-64">
                <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {/* Back Button */}
                        <button
                            onClick={() => navigate(-1)}
                            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span>Back</span>
                        </button>
                        
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                            💎 Subscription Plan Management
                        </h1>
                        <p className="text-gray-600 mb-8">
                            Manage subscription plan templates, prices, and durations
                        </p>

                        {success && (
                            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                                {success}
                            </div>
                        )}

                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        {/* Create/Edit Form */}
                        {(showCreateForm || editingPlan) && (
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                    {editingPlan ? "Edit Subscription Plan" : "Create New Subscription Plan"}
                                </h2>
                                <form onSubmit={editingPlan ? handleUpdatePlan : handleCreatePlan} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Plan Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g., Monthly Premium, Yearly Premium"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Plan Type *
                                        </label>
                                        <select
                                            value={formData.plan_type}
                                            onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            <option value="free">Free</option>
                                            <option value="premium">Premium</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Price (₹) *
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Duration (Months) *
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.duration_months}
                                                onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) || 1 })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="is_active"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                                            Active (visible to users)
                                        </label>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            {editingPlan ? "Update Plan" : "Create Plan"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (editingPlan) {
                                                    cancelEdit();
                                                } else {
                                                    setShowCreateForm(false);
                                                }
                                            }}
                                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Plans List */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-gray-900">Subscription Plans</h2>
                                {!showCreateForm && !editingPlan && (
                                    <button
                                        onClick={() => setShowCreateForm(true)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        + Create New Plan
                                    </button>
                                )}
                            </div>

                            {plans.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    No subscription plans found. Create your first plan to get started.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {plans.map((plan) => (
                                                <tr key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {plan.name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            plan.plan_type === "premium" 
                                                                ? "bg-purple-100 text-purple-700" 
                                                                : "bg-gray-100 text-gray-700"
                                                        }`}>
                                                            {plan.plan_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                        ₹{plan.price.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                        {plan.duration_months} {plan.duration_months === 1 ? "month" : "months"}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            plan.is_active 
                                                                ? "bg-green-100 text-green-700" 
                                                                : "bg-red-100 text-red-700"
                                                        }`}>
                                                            {plan.is_active ? "Active" : "Inactive"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => startEdit(plan)}
                                                                className="text-blue-600 hover:text-blue-900"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleActive(plan)}
                                                                className="text-indigo-600 hover:text-indigo-900"
                                                            >
                                                                {plan.is_active ? "Deactivate" : "Activate"}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeletePlan(plan.id)}
                                                                className="text-red-600 hover:text-red-900"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}

