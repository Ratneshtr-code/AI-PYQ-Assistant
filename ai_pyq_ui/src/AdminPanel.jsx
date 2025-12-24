// src/AdminPanel.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import { authenticatedFetch, getCurrentUser } from "./utils/auth";

// Use empty string for Vite proxy (same-origin)
const API_BASE_URL = "";

export default function AdminPanel() {
    const navigate = useNavigate();
    const [examsList, setExamsList] = useState([]);
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [editMode, setEditMode] = useState(false);

    const fetchUsers = async () => {
        try {
            setError(""); // Clear previous errors
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pageSize.toString(),
            });
            if (search) params.append("search", search);

            const response = await authenticatedFetch(
                `${API_BASE_URL}/admin/users?${params}`
            );
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || []);
                setTotal(data.total || 0);
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to fetch users: ${response.status}`);
            }
        } catch (err) {
            console.error("Error fetching users:", err);
            setError(err.message || "Failed to fetch users. Please try again.");
            setUsers([]);
            setTotal(0);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/admin/stats`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (err) {
            console.error("Failed to fetch stats:", err);
        }
    };

    const handleUpdateUser = async (userData) => {
        try {
            const response = await authenticatedFetch(
                `${API_BASE_URL}/admin/users/${selectedUser.id}`,
                {
                    method: "PUT",
                    body: JSON.stringify(userData),
                }
            );
            if (response.ok) {
                await fetchUsers();
                await fetchStats();
                setEditMode(false);
                setSelectedUser(null);
            } else {
                const data = await response.json();
                throw new Error(data.detail || "Update failed");
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeactivateUser = async (userId) => {
        if (!window.confirm("Are you sure you want to deactivate this user? They will not be able to login, but their account will remain in the database.")) {
            return;
        }
        try {
            const response = await authenticatedFetch(
                `${API_BASE_URL}/admin/users/${userId}/deactivate`,
                {
                    method: "POST",
                }
            );
            if (response.ok) {
                await fetchUsers();
                await fetchStats();
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || "Deactivation failed");
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("⚠️ WARNING: This will PERMANENTLY DELETE the user from the database. They will become un-registered and all their data will be lost. This action cannot be undone!\n\nAre you absolutely sure you want to permanently delete this user?")) {
            return;
        }
        try {
            const response = await authenticatedFetch(
                `${API_BASE_URL}/admin/users/${userId}`,
                {
                    method: "DELETE",
                }
            );
            if (response.ok) {
                await fetchUsers();
                await fetchStats();
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || "Deletion failed");
            }
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        // Check if user is admin
        const checkAdmin = async () => {
            try {
                const user = await getCurrentUser();
                if (!user || !user.is_admin) {
                    navigate("/account");
                    return;
                }
                // Fetch users and stats
                await fetchUsers();
                await fetchStats();
            } catch (err) {
                console.error("Admin check failed:", err);
                setError("Failed to load admin panel. Please try again.");
                navigate("/account");
            } finally {
                setLoading(false);
            }
        };
        
        // Fetch exams for sidebar
        const fetchExams = async () => {
            try {
                const res = await fetch("/filters");
                const data = await res.json();
                setExamsList(data.exams || []);
            } catch (err) {
                console.error("Failed to fetch exams:", err);
            }
        };
        
        checkAdmin();
        fetchExams();
    }, [page, search]); // eslint-disable-line react-hooks/exhaustive-deps

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar exam="" setExam={() => {}} examsList={examsList} onOpenSecondarySidebar={() => {}} />
            
            <main className="flex-1 ml-64">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                                    🔧 Admin Panel
                                </h1>
                                <p className="text-gray-600">
                                    Manage users, subscriptions, and system settings
                                </p>
                            </div>
                            <button
                                onClick={() => navigate("/admin/subscription-management")}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                💎 Manage Subscription Plans
                            </button>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                                {error}
                            </div>
                        )}

                        {/* Stats Cards */}
                        {stats && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                                    <div className="text-2xl font-bold text-gray-900">{stats.total_users}</div>
                                    <div className="text-sm text-gray-600">Total Users</div>
                                </div>
                                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                                    <div className="text-2xl font-bold text-green-600">{stats.active_users}</div>
                                    <div className="text-sm text-gray-600">Active Users</div>
                                </div>
                                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                                    <div className="text-2xl font-bold text-blue-600">{stats.premium_users}</div>
                                    <div className="text-sm text-gray-600">Premium Users</div>
                                </div>
                                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                                    <div className="text-2xl font-bold text-purple-600">{stats.admin_users}</div>
                                    <div className="text-sm text-gray-600">Admin Users</div>
                                </div>
                            </div>
                        )}

                        {/* User Management */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">ID</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Email</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Username</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Plan</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-4 text-sm">{user.id}</td>
                                                <td className="py-3 px-4 text-sm">{user.email}</td>
                                                <td className="py-3 px-4 text-sm">{user.username}</td>
                                                <td className="py-3 px-4 text-sm">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                        user.subscription_plan === "premium"
                                                            ? "bg-blue-100 text-blue-700"
                                                            : "bg-gray-100 text-gray-700"
                                                    }`}>
                                                        {user.subscription_plan}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                        user.is_active
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-red-100 text-red-700"
                                                    }`}>
                                                        {user.is_active ? "Active" : "Inactive"}
                                                    </span>
                                                    {user.is_admin && (
                                                        <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                                            Admin
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-sm">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setEditMode(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-700 mr-3"
                                                    >
                                                        Edit
                                                    </button>
                                                    {user.is_active ? (
                                                        <button
                                                            onClick={() => handleDeactivateUser(user.id)}
                                                            className="text-orange-600 hover:text-orange-700 mr-3"
                                                            title="Deactivate user (soft delete - user remains in database)"
                                                        >
                                                            Deactivate
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleDeactivateUser(user.id)}
                                                            className="text-green-600 hover:text-green-700 mr-3"
                                                            title="Reactivate user"
                                                        >
                                                            Reactivate
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="text-red-600 hover:text-red-700 font-semibold"
                                                        title="Permanently delete user (hard delete - user becomes un-registered)"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="mt-4 flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} users
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page * pageSize >= total}
                                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Edit User Modal */}
                        {editMode && selectedUser && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                                    <h3 className="text-xl font-semibold mb-4">Edit User</h3>
                                    <UserEditForm
                                        user={selectedUser}
                                        onSave={handleUpdateUser}
                                        onCancel={() => {
                                            setEditMode(false);
                                            setSelectedUser(null);
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            </main>
        </div>
    );
}

function UserEditForm({ user, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        email: user.email,
        username: user.username,
        full_name: user.full_name || "",
        is_active: user.is_active,
        is_admin: user.is_admin,
        subscription_plan: user.subscription_plan,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
                <select
                    value={formData.subscription_plan}
                    onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                </select>
            </div>
            <div className="flex items-center gap-4">
                <label className="flex items-center">
                    <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="mr-2"
                    />
                    Active
                </label>
                <label className="flex items-center">
                    <input
                        type="checkbox"
                        checked={formData.is_admin}
                        onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                        className="mr-2"
                    />
                    Admin
                </label>
            </div>
            <div className="flex gap-2">
                <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Save
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

