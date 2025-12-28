// src/components/SaveNoteButton.jsx
import { useState, useEffect } from "react";
import { saveNote, checkSaved } from "../utils/notesApi";
import { isAuthenticated } from "../utils/auth";
import { showToast } from "../App";

export default function SaveNoteButton({
    noteType, // "question" | "explanation"
    questionData,
    explanationText = null,
    explanationType = null, // "concept" | "option"
    optionLetter = null,
    isCorrect = null,
    onSaveSuccess = null,
    onSaveError = null,
    className = "",
    size = "default", // "default" | "small" | "large"
    showLabel = true,
}) {
    const [isSaved, setIsSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Check if user is logged in
    useEffect(() => {
        setIsLoggedIn(isAuthenticated());
    }, []);

    // Check if already saved on mount
    useEffect(() => {
        if (!isLoggedIn || !questionData) {
            setIsChecking(false);
            return;
        }

        const checkIfSaved = async () => {
            try {
                const questionId = questionData.id || questionData.question_id || questionData.json_question_id;
                if (!questionId) {
                    setIsChecking(false);
                    return;
                }

                const result = await checkSaved(questionId, explanationType, optionLetter);
                setIsSaved(result.is_saved);
            } catch (error) {
                console.error("Error checking saved status:", error);
            } finally {
                setIsChecking(false);
            }
        };

        checkIfSaved();
    }, [isLoggedIn, questionData, explanationType, optionLetter]);

    const handleSave = async () => {
        if (!isLoggedIn) {
            // Redirect to login or show message
            window.location.href = "/login";
            return;
        }

        if (isSaved) {
            // Already saved - could implement unsave functionality here
            return;
        }

        setIsSaving(true);
        try {
            const noteData = {
                note_type: noteType,
                question_data: questionData,
            };

            if (noteType === "explanation") {
                noteData.explanation_text = explanationText;
                noteData.explanation_type = explanationType;
                if (optionLetter) noteData.option_letter = optionLetter;
                if (isCorrect !== null) noteData.is_correct = isCorrect;
            }

            const result = await saveNote(noteData);
            
            if (result.success) {
                setIsSaved(true);
                showToast(
                    noteType === "question" 
                        ? "Question saved to My Notes!" 
                        : "Explanation saved to My Notes!",
                    "success",
                    3000
                );
                if (onSaveSuccess) {
                    onSaveSuccess(result);
                }
            } else {
                showToast("Failed to save. Please try again.", "error", 3000);
            }
        } catch (error) {
            console.error("Error saving note:", error);
            
            // Show user-friendly error message
            let errorMessage = "Failed to save. Please try again.";
            if (error.message && error.message.includes("401")) {
                errorMessage = "Please log in to save notes.";
            } else if (error.message && error.message.includes("403")) {
                errorMessage = "Premium subscription required to save notes.";
            }
            
            showToast(errorMessage, "error", 4000);
            
            if (onSaveError) {
                onSaveError(error);
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Don't show button if user is not logged in
    if (!isLoggedIn) {
        return null;
    }

    // Size classes
    const sizeClasses = {
        small: "text-xs px-2 py-1",
        default: "text-sm px-3 py-1.5",
        large: "text-base px-4 py-2",
    };

    const iconSizes = {
        small: "w-3 h-3",
        default: "w-4 h-4",
        large: "w-5 h-5",
    };

    // Check if className contains custom styling (like for explanation window)
    const hasCustomStyling = className.includes("!text-white") || className.includes("explanation-save-btn");
    
    const buttonClass = hasCustomStyling
        ? `${className} ${sizeClasses[size]} flex items-center gap-1.5 rounded-md font-medium transition-all duration-200 ${isSaving || isChecking ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} disabled:opacity-50 disabled:cursor-not-allowed`
        : `
            ${className}
            ${sizeClasses[size]}
            flex items-center gap-1.5
            rounded-md font-medium
            transition-all duration-200
            ${isSaved
                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
            }
            ${isSaving || isChecking ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            disabled:opacity-50 disabled:cursor-not-allowed
        `.trim().replace(/\s+/g, " ");

    return (
        <button
            onClick={handleSave}
            disabled={isSaving || isChecking || isSaved}
            className={buttonClass}
            title={isSaved ? "Already saved to My Notes" : "Save to My Notes"}
        >
            {isChecking ? (
                <>
                    <svg className={`${iconSizes[size]} animate-spin`} fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {showLabel && <span>Checking...</span>}
                </>
            ) : isSaving ? (
                <>
                    <svg className={`${iconSizes[size]} animate-spin`} fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {showLabel && <span>Saving...</span>}
                </>
            ) : isSaved ? (
                <>
                    <svg className={iconSizes[size]} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                    </svg>
                    {showLabel && <span>Saved</span>}
                </>
            ) : (
                <>
                    <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    {showLabel && <span>Save</span>}
                </>
            )}
        </button>
    );
}

