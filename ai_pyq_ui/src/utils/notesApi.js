// src/utils/notesApi.js
/**
 * API helper functions for notes operations
 */
const API_BASE_URL = ""; // Use relative URLs with Vite proxy

/**
 * Save a note (question or explanation)
 */
export const saveNote = async (noteData) => {
    try {
        console.log("📝 Attempting to save note:", noteData.note_type);
        const url = `${API_BASE_URL}/notes/save`;
        console.log("   URL:", url);
        
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(noteData),
        });
        
        console.log("   Response status:", response.status, response.statusText);

        if (!response.ok) {
            // Check status code for specific error messages
            if (response.status === 401) {
                throw new Error("401: Please log in to save notes");
            } else if (response.status === 403) {
                throw new Error("403: Premium subscription required");
            }
            
            // Try to parse error response
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const error = await response.json().catch(() => ({ detail: "Failed to save note" }));
                throw new Error(error.detail || "Failed to save note");
            } else {
                // Non-JSON response
                const text = await response.text();
                console.error("Non-JSON error response:", text.substring(0, 200));
                throw new Error(`Server error (${response.status}): Failed to save note`);
            }
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error saving note:", error);
        // Re-throw with better error message if it's a network error
        if (error.message && !error.message.includes(":")) {
            if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
                throw new Error("Network error: Please check your connection and try again");
            }
        }
        throw error;
    }
};

/**
 * Get all notes with pagination and filters
 */
export const getNotes = async (params = {}) => {
    try {
        const {
            page = 1,
            page_size = 20,
            note_type = null,
            exam = null,
            subject = null,
            year = null,
            sort_by = "date",
            sort_order = "desc",
        } = params;

        const queryParams = new URLSearchParams({
            page: page.toString(),
            page_size: page_size.toString(),
            sort_by,
            sort_order,
        });

        if (note_type) queryParams.append("note_type", note_type);
        if (exam) queryParams.append("exam", exam);
        if (subject) queryParams.append("subject", subject);
        if (year) queryParams.append("year", year.toString());

        const response = await fetch(`${API_BASE_URL}/notes?${queryParams}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        });

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error("PREMIUM_REQUIRED");
            }
            // Check if response is JSON
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const error = await response.json().catch(() => ({ detail: "Failed to fetch notes" }));
                throw new Error(error.detail || "Failed to fetch notes");
            } else {
                // Response is HTML (likely an error page)
                const text = await response.text();
                console.error("Non-JSON response from server:", text.substring(0, 200));
                throw new Error(`Server error (${response.status}): Please check if the backend is running correctly.`);
            }
        }

        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            // If response is empty or not JSON, but status is OK, treat as empty notes
            if (response.status === 200) {
                return { notes: [], total: 0, page: page, page_size: page_size };
            }
            const text = await response.text();
            console.error("Expected JSON but got:", contentType, text.substring(0, 200));
            throw new Error("Invalid response format from server");
        }

        const data = await response.json();
        
        // Handle empty notes gracefully
        if (!data.notes) {
            return { notes: [], total: 0, page: page, page_size: page_size };
        }
        
        return data;
    } catch (error) {
        console.error("Error fetching notes:", error);
        throw error;
    }
};

/**
 * Get a single note by ID
 */
export const getNote = async (noteId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        });

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error("PREMIUM_REQUIRED");
            }
            const error = await response.json().catch(() => ({ detail: "Failed to fetch note" }));
            throw new Error(error.detail || "Failed to fetch note");
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching note:", error);
        throw error;
    }
};

/**
 * Delete a note
 */
export const deleteNote = async (noteId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: "Failed to delete note" }));
            throw new Error(error.detail || "Failed to delete note");
        }

        return await response.json();
    } catch (error) {
        console.error("Error deleting note:", error);
        throw error;
    }
};

/**
 * Update a note (tags and custom_notes)
 */
export const updateNote = async (noteId, updateData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(updateData),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: "Failed to update note" }));
            throw new Error(error.detail || "Failed to update note");
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating note:", error);
        throw error;
    }
};

/**
 * Get notes statistics
 */
export const getNotesStats = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/notes/stats/summary`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        });

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error("PREMIUM_REQUIRED");
            }
            // Check if response is JSON
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const error = await response.json().catch(() => ({ detail: "Failed to fetch stats" }));
                throw new Error(error.detail || "Failed to fetch stats");
            } else {
                // Response is HTML (likely an error page) - return empty stats
                console.warn("Non-JSON response for stats, returning empty stats");
                return {
                    total_notes: 0,
                    questions_count: 0,
                    explanations_count: 0,
                    by_exam: {},
                    by_subject: {},
                    by_year: {}
                };
            }
        }

        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            // Return empty stats if not JSON
            return {
                total_notes: 0,
                questions_count: 0,
                explanations_count: 0,
                by_exam: {},
                by_subject: {},
                by_year: {}
            };
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching notes stats:", error);
        throw error;
    }
};

/**
 * Check if a question/explanation is already saved
 */
export const checkSaved = async (questionId, explanationType = null, optionLetter = null) => {
    try {
        const queryParams = new URLSearchParams();
        if (explanationType) queryParams.append("explanation_type", explanationType);
        if (optionLetter) queryParams.append("option_letter", optionLetter);

        const url = `${API_BASE_URL}/notes/check-saved/${questionId}${queryParams.toString() ? `?${queryParams}` : ""}`;
        
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        });

        if (!response.ok) {
            // If not authenticated, return not saved
            if (response.status === 401) {
                return { is_saved: false, note_id: null };
            }
            const error = await response.json().catch(() => ({ detail: "Failed to check saved status" }));
            throw new Error(error.detail || "Failed to check saved status");
        }

        return await response.json();
    } catch (error) {
        console.error("Error checking saved status:", error);
        // Return not saved on error
        return { is_saved: false, note_id: null };
    }
};

