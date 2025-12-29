// src/pages/MyNotesPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getNotes, getNotesStats, deleteNote } from "../utils/notesApi";
import NoteCard from "../components/NoteCard";
import NotesFilterBar from "../components/NotesFilterBar";
import { getUserData } from "../utils/auth";
import { exportNotesToPDF } from "../utils/pdfExport";
import Sidebar from "../components/Sidebar";

export default function MyNotesPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("all"); // "all" | "questions" | "explanations"
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    
    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [total, setTotal] = useState(0);
    
    // Filters
    const [filters, setFilters] = useState({
        exam: null,
        subject: null,
        year: null,
        sort_by: "date",
        sort_order: "desc",
    });
    
    // View mode - Default: "grid" (can be changed in config.yaml: ui.default_notes_view)
    const [viewMode, setViewMode] = useState("grid"); // "grid" | "list" | "compact"
    
    // Selection for bulk actions
    const [selectedNotes, setSelectedNotes] = useState(new Set());
    
    // Sidebar collapse state
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);

    // Fetch UI config on mount to set default view mode
    useEffect(() => {
        const fetchUIConfig = async () => {
            try {
                const response = await fetch("/ui/config", {
                    credentials: "include",
                });
                if (response.ok) {
                    const config = await response.json();
                    if (config.default_notes_view && ["grid", "list", "compact"].includes(config.default_notes_view)) {
                        setViewMode(config.default_notes_view);
                    }
                }
            } catch (error) {
                console.log("Could not load UI config, using default view mode");
            }
        };
        fetchUIConfig();
    }, []);

    useEffect(() => {
        fetchNotes();
        fetchStats();
    }, [activeTab, page, filters]);

    const fetchNotes = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const params = {
                page,
                page_size: pageSize,
                sort_by: filters.sort_by,
                sort_order: filters.sort_order,
            };
            
            if (activeTab !== "all") {
                params.note_type = activeTab;
            }
            
            if (filters.exam) params.exam = filters.exam;
            if (filters.subject) params.subject = filters.subject;
            if (filters.year) params.year = filters.year;
            
            const response = await getNotes(params);
            setNotes(response.notes || []);
            setTotal(response.total || 0);
        } catch (err) {
            console.error("Error fetching notes:", err);
            if (err.message === "PREMIUM_REQUIRED") {
                navigate("/subscription");
            } else {
                // If it's an "Invalid response format" error, treat it as empty notes
                // This can happen when backend returns empty response or HTML error page
                if (err.message && (err.message.includes("Invalid response format") || err.message.includes("JSON"))) {
                    // Treat as empty notes - show empty state instead of error
                    setNotes([]);
                    setTotal(0);
                    setError(null); // Clear error to show empty state
                } else {
                    // Real error - show it
                    setError(err.message || "Failed to load notes");
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const statsData = await getNotesStats();
            setStats(statsData);
        } catch (err) {
            // Ignore stats errors - set empty stats
            console.error("Failed to fetch stats:", err);
            setStats({
                total_notes: 0,
                questions_count: 0,
                explanations_count: 0,
                by_exam: {},
                by_subject: {},
                by_year: {}
            });
        }
    };

    const handleDelete = async (noteId) => {
        if (!window.confirm("Are you sure you want to delete this note?")) {
            return;
        }
        
        try {
            await deleteNote(noteId);
            // Remove from local state
            setNotes(notes.filter(n => n.id !== noteId));
            setTotal(total - 1);
            // Refresh stats
            fetchStats();
        } catch (err) {
            alert("Failed to delete note: " + err.message);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedNotes.size === 0) return;
        
        if (!window.confirm(`Are you sure you want to delete ${selectedNotes.size} note(s)?`)) {
            return;
        }
        
        try {
            const deletePromises = Array.from(selectedNotes).map(id => deleteNote(id));
            await Promise.all(deletePromises);
            
            // Remove from local state
            setNotes(notes.filter(n => !selectedNotes.has(n.id)));
            setTotal(total - selectedNotes.size);
            setSelectedNotes(new Set());
            
            // Refresh stats
            fetchStats();
        } catch (err) {
            alert("Failed to delete notes: " + err.message);
        }
    };

    const handleExportPDF = () => {
        const notesToExport = selectedNotes.size > 0
            ? notes.filter(n => selectedNotes.has(n.id))
            : notes;
        
        if (notesToExport.length === 0) {
            alert("No notes to export");
            return;
        }

        const title = selectedNotes.size > 0
            ? `My Notes - ${selectedNotes.size} Selected Notes`
            : `My Notes - ${activeTab === "all" ? "All Notes" : activeTab === "question" ? "Questions" : "Explanations"}`;

        exportNotesToPDF(notesToExport, {
            title,
            includeQuestions: activeTab !== "explanation",
            includeExplanations: activeTab !== "question",
        });
    };

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        setPage(1); // Reset to first page when filters change
    };

    const toggleNoteSelection = (noteId) => {
        const newSelection = new Set(selectedNotes);
        if (newSelection.has(noteId)) {
            newSelection.delete(noteId);
        } else {
            newSelection.add(noteId);
        }
        setSelectedNotes(newSelection);
    };

    const selectAll = () => {
        if (selectedNotes.size === notes.length) {
            setSelectedNotes(new Set());
        } else {
            setSelectedNotes(new Set(notes.map(n => n.id)));
        }
    };

    const userData = getUserData();
    const isPremium = userData?.subscription_plan === "premium";

    if (!isPremium) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Premium Feature</h2>
                    <p className="text-gray-600 mb-6">You need a premium subscription to view your notes.</p>
                    <button
                        onClick={() => navigate("/subscription")}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Upgrade to Premium
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar 
                exam="" 
                setExam={() => {}} 
                examsList={[]} 
                onOpenSecondarySidebar={() => {}}
                onCollapseChange={(isCollapsed) => {
                    setPrimarySidebarCollapsed(isCollapsed);
                }}
            />
            
            {/* Main Content */}
            <div className={`flex-1 transition-all duration-300 ${primarySidebarCollapsed ? "ml-16" : "ml-64"}`}>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">My Notes</h1>
                            {stats && (
                                <p className="text-sm text-gray-600 mt-1">
                                    {stats.total_notes} total notes • {stats.questions_count} questions • {stats.explanations_count} explanations
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Export PDF Button */}
                            <button
                                onClick={handleExportPDF}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2"
                                title="Export notes to PDF"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export PDF
                            </button>
                            {/* View Mode Toggle */}
                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode("compact")}
                                    className={`px-3 py-1 rounded text-sm transition-colors ${
                                        viewMode === "compact"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-600 hover:text-gray-900"
                                    }`}
                                    title="Compact View"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`px-3 py-1 rounded text-sm transition-colors ${
                                        viewMode === "grid"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-600 hover:text-gray-900"
                                    }`}
                                    title="Grid View"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`px-3 py-1 rounded text-sm transition-colors ${
                                        viewMode === "list"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-600 hover:text-gray-900"
                                    }`}
                                    title="List View"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Tabs */}
                <div className="mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => {
                                    setActiveTab("all");
                                    setPage(1);
                                }}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === "all"
                                        ? "border-blue-500 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                            >
                                All Notes
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab("question");
                                    setPage(1);
                                }}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === "question"
                                        ? "border-blue-500 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                            >
                                Questions
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab("explanation");
                                    setPage(1);
                                }}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === "explanation"
                                        ? "border-blue-500 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                            >
                                Explanations
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Filter Bar */}
                <NotesFilterBar
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    stats={stats}
                />

                {/* Bulk Actions */}
                {selectedNotes.size > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                        <span className="text-sm text-blue-800">
                            {selectedNotes.size} note(s) selected
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={selectAll}
                                className="text-sm text-blue-700 hover:text-blue-900"
                            >
                                {selectedNotes.size === notes.length ? "Deselect All" : "Select All"}
                            </button>
                            <button
                                onClick={handleExportPDF}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                Export Selected
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Delete Selected
                            </button>
                        </div>
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-4 text-gray-600">Loading notes...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-red-600">{error}</p>
                        <button
                            onClick={fetchNotes}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Retry
                        </button>
                    </div>
                ) : notes.length === 0 ? (
                    <div className="text-center py-12">
                        <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        <h3 className="mt-4 text-lg font-semibold text-gray-900">No notes saved yet</h3>
                        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                            {activeTab === "all"
                                ? "You haven't saved any questions or explanations yet. Start saving content from search results or explanations to build your personal notes collection."
                                : activeTab === "question"
                                ? "You haven't saved any questions yet. Click the 'Save' button on any question card to add it to your notes."
                                : "You haven't saved any explanations yet. Open an explanation and click 'Save' to add it to your notes."}
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-3">
                            <button
                                onClick={() => navigate("/")}
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors"
                            >
                                Go to Search
                            </button>
                            <button
                                onClick={fetchNotes}
                                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Notes Grid/List/Compact */}
                        <div
                            className={
                                viewMode === "compact"
                                    ? "space-y-2"
                                    : viewMode === "grid"
                                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                                    : "space-y-4"
                            }
                        >
                            {notes.map((note) => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    viewMode={viewMode}
                                    compactMode={viewMode === "compact"}
                                    isSelected={selectedNotes.has(note.id)}
                                    onSelect={() => toggleNoteSelection(note.id)}
                                    onDelete={handleDelete}
                                    onUpdate={fetchNotes}
                                />
                            ))}
                        </div>

                        {/* Pagination */}
                        {total > pageSize && (
                            <div className="mt-6 flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} notes
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page * pageSize >= total}
                                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            </div>
        </div>
    );
}

