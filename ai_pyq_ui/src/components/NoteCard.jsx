// src/components/NoteCard.jsx
import { useState, useEffect } from "react";
import { formatMarkdown } from "../utils/formatMarkdown";
import { updateNote } from "../utils/notesApi";
import { openNoteInReadingMode } from "../utils/readingMode";

export default function NoteCard({ note, viewMode = "grid", isSelected = false, onSelect, onDelete, compactMode = false, onUpdate }) {
    const [showFullContent, setShowFullContent] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditingHeading, setIsEditingHeading] = useState(false);
    const [editedHeading, setEditedHeading] = useState(note.custom_heading || "");
    const [isSaving, setIsSaving] = useState(false);

    // Update state when note changes
    useEffect(() => {
        setEditedHeading(note.custom_heading || "");
    }, [note.custom_heading]);

    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        } catch {
            return dateString;
        }
    };

    // Extract heading/title from content
    const getNoteHeading = () => {
        // Priority: Custom heading > Core Concept > First line of content
        if (note.custom_heading && note.custom_heading.trim()) {
            return note.custom_heading.trim();
        }
        
        if (note.custom_notes && note.custom_notes.trim()) {
            // Check if custom_notes starts with a heading pattern
            const customHeading = note.custom_notes.split('\n')[0].trim();
            if (customHeading.length < 100) {
                return customHeading;
            }
        }

        if (note.explanation_text) {
            // Try to extract "Core Concept" or first heading
            const lines = note.explanation_text.split('\n');
            for (const line of lines) {
                // Look for "Core Concept" or heading patterns
                if (line.includes('**Core Concept') || line.includes('**Core Concept:')) {
                    const match = line.match(/\*\*Core Concept[:\s]*(.*?)\*\*/);
                    if (match && match[1]) {
                        return match[1].trim();
                    }
                }
                // Look for any bold heading
                if (line.startsWith('**') && line.endsWith('**') && line.length < 100) {
                    return line.replace(/\*\*/g, '').trim();
                }
            }
            // Fallback: first non-empty line (truncated)
            const firstLine = lines.find(l => l.trim().length > 0);
            if (firstLine) {
                return firstLine.replace(/\*\*/g, '').replace(/^#+\s*/, '').trim().substring(0, 80);
            }
        }

        if (note.question_data?.question_text) {
            const qText = note.question_data.question_text;
            return qText.substring(0, 80) + (qText.length > 80 ? '...' : '');
        }

        return note.note_type === "question" ? "Question" : "Explanation";
    };

    const noteHeading = getNoteHeading();

    // Handle heading save
    const handleSaveHeading = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const trimmedHeading = editedHeading.trim();
            // If empty, set to null to clear custom heading and use auto-generated one
            await updateNote(note.id, { custom_heading: trimmedHeading || null });
            // Update local state to reflect the change
            if (trimmedHeading) {
                setEditedHeading(trimmedHeading);
            } else {
                // Clear the edited heading so it falls back to auto-generated
                setEditedHeading("");
            }
            if (onUpdate) onUpdate();
            setIsEditingHeading(false);
        } catch (error) {
            console.error("Error saving heading:", error);
            alert("Failed to save heading: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Cancel editing
    const handleCancelHeading = () => {
        setEditedHeading(note.custom_heading || "");
        setIsEditingHeading(false);
    };

    const renderQuestionContent = () => {
        if (!note.question_data) return null;
        
        const questionText = note.question_data.question_text || "";
        const options = {
            A: note.question_data.option_a,
            B: note.question_data.option_b,
            C: note.question_data.option_c,
            D: note.question_data.option_d,
        };

        if (compactMode && !isExpanded) {
            return (
                <div className="text-xs text-gray-600 line-clamp-2">
                    {questionText.substring(0, 120)}...
                </div>
            );
        }

        return (
            <div className="space-y-2">
                <div className="text-xs text-gray-700 whitespace-pre-wrap">
                    {questionText.length > 150 && !showFullContent
                        ? `${questionText.substring(0, 150)}...`
                        : questionText}
                </div>
                {questionText.length > 150 && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowFullContent(!showFullContent);
                        }}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-medium"
                    >
                        {showFullContent ? "Show Less" : "Show More"}
                    </button>
                )}
                <div className="space-y-0.5 text-[10px]">
                    {Object.entries(options).map(([letter, text]) => (
                        text && (
                            <div key={letter} className="flex items-start gap-1.5">
                                <span className="font-medium text-gray-600 flex-shrink-0">{letter}.</span>
                                <span className="text-gray-700">{text}</span>
                            </div>
                        )
                    ))}
                </div>
                {note.question_data.correct_option && (
                    <div className="text-[10px] text-green-700 font-medium">
                        Correct: {note.question_data.correct_option}
                    </div>
                )}
            </div>
        );
    };

    const renderExplanationContent = () => {
        if (!note.explanation_text) return null;
        
        const explanation = note.explanation_text;
        const shouldTruncate = explanation.length > 500;
        
        if (compactMode && !isExpanded) {
            // Show first paragraph or first few lines
            const lines = explanation.split('\n').filter(l => l.trim());
            const preview = lines.slice(0, 2).join(' ').replace(/\*\*/g, '').substring(0, 150);
            return (
                <div className="text-xs text-gray-600 line-clamp-2">
                    {preview}...
                </div>
            );
        }

        // Format markdown to HTML (same as ExplanationWindow)
        const fullFormattedHtml = formatMarkdown(explanation);
        let displayHtml = fullFormattedHtml;
        
        if (shouldTruncate && !showFullContent) {
            const maxLength = 800;
            if (fullFormattedHtml.length > maxLength) {
                let truncateAt = maxLength;
                const lastTag = fullFormattedHtml.lastIndexOf('</', maxLength);
                if (lastTag > maxLength * 0.7) {
                    truncateAt = lastTag;
                }
                displayHtml = fullFormattedHtml.substring(0, truncateAt) + '...';
            }
        }

        return (
            <div className="space-y-1.5">
                <div 
                    className={`explanation-text prose prose-xs max-w-none text-xs ${shouldTruncate && !showFullContent ? 'line-clamp-4' : ''}`}
                    dangerouslySetInnerHTML={{ __html: displayHtml }}
                />
                {shouldTruncate && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowFullContent(!showFullContent);
                        }}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-medium"
                    >
                        {showFullContent ? "Show Less" : "Show More"}
                    </button>
                )}
            </div>
        );
    };

    // Compact card design
    if (compactMode) {
        return (
            <div 
                className={`
                    bg-white rounded-lg border transition-all relative cursor-pointer
                    ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-200 hover:shadow-md"}
                    ${isExpanded ? "shadow-md" : ""}
                `.trim().replace(/\s+/g, " ")}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="p-3">
                    {/* Compact Header Row */}
                    <div className="flex items-start gap-2 mb-2">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                                e.stopPropagation();
                                onSelect();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer mt-0.5 flex-shrink-0"
                        />
                        
                        {/* Heading - Prominent */}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
                                {noteHeading}
                            </h3>
                            
                            {/* Metadata - Compact */}
                            <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    note.note_type === "question"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-purple-100 text-purple-700"
                                }`}>
                                    {note.note_type === "question" ? "Q" : "E"}
                                </span>
                                {note.exam && <span>{note.exam}</span>}
                                {note.subject && <span>• {note.subject}</span>}
                                {note.year && <span>• {note.year}</span>}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Reading Mode Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openNoteInReadingMode(note);
                                }}
                                className="text-green-600 hover:text-green-800 p-1"
                                title="Open in reading mode"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </button>
                            {/* Edit Heading Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditedHeading(note.custom_heading || noteHeading);
                                    setIsEditingHeading(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 p-1"
                                title="Edit heading"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(note.id);
                                }}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Delete note"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                            <svg 
                                className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    {/* Edit Heading Modal - Compact */}
                    {isEditingHeading && (
                        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded ml-6" onClick={(e) => e.stopPropagation()}>
                            <input
                                type="text"
                                value={editedHeading}
                                onChange={(e) => setEditedHeading(e.target.value)}
                                placeholder="Enter custom heading..."
                                className="w-full px-2 py-1 text-xs border border-blue-300 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSaveHeading();
                                    } else if (e.key === 'Escape') {
                                        handleCancelHeading();
                                    }
                                }}
                            />
                            <div className="flex gap-1">
                                <button
                                    onClick={handleSaveHeading}
                                    disabled={isSaving}
                                    className="px-2 py-0.5 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isSaving ? "Saving..." : "Save"}
                                </button>
                                <button
                                    onClick={handleCancelHeading}
                                    disabled={isSaving}
                                    className="px-2 py-0.5 text-[10px] bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Compact Content Preview */}
                    {!isExpanded && (
                        <div className="text-xs text-gray-600 line-clamp-2 ml-6">
                            {note.note_type === "question" 
                                ? (note.question_data?.question_text?.substring(0, 100) || '') + '...'
                                : (note.explanation_text?.replace(/\*\*/g, '').substring(0, 100) || '') + '...'
                            }
                        </div>
                    )}

                    {/* Expanded Content */}
                    {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-100 ml-6">
                            {note.note_type === "question" ? renderQuestionContent() : renderExplanationContent()}
                            
                            {/* Custom Notes */}
                            {note.custom_notes && (
                                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-gray-700">
                                    <strong>My Notes:</strong> {note.custom_notes}
                                </div>
                            )}

                            {/* Tags */}
                            {note.tags && note.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                    {note.tags.map((tag, idx) => (
                                        <span
                                            key={idx}
                                            className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Footer */}
                            <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100">
                                Saved on {formatDate(note.created_at)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Original card design (for grid/list view)
    const cardClass = `
        bg-white rounded-lg border-2 shadow-sm transition-all relative
        ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}
        ${viewMode === "list" ? "flex gap-4" : ""}
    `.trim().replace(/\s+/g, " ");

    return (
        <div className={cardClass}>
            {/* Selection Checkbox */}
            <div className={`${viewMode === "grid" ? "absolute top-1.5 left-1.5 z-10" : "flex-shrink-0 pt-4 pl-4"}`}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                        e.stopPropagation();
                        onSelect();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
            </div>

            <div className={`${viewMode === "grid" ? "p-3 pt-7" : "flex-1 p-4"}`}>
                {/* Header with Heading */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        {/* Prominent Heading */}
                        <h3 className="text-sm font-semibold text-gray-900 mb-1.5 line-clamp-2">
                            {noteHeading}
                        </h3>
                        
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                                note.note_type === "question"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-purple-100 text-purple-700"
                            }`}>
                                {note.note_type === "question" ? "Q" : "E"}
                            </span>
                            {note.explanation_type && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-700">
                                    {note.explanation_type === "concept" ? "Concept" : "Option"}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-600">
                            {note.exam && (
                                <span className="flex items-center gap-0.5">
                                    <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                                    {note.exam}
                                </span>
                            )}
                            {note.year && <span>{note.year}</span>}
                            {note.subject && <span>• {note.subject}</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Reading Mode Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openNoteInReadingMode(note);
                            }}
                            className="text-green-600 hover:text-green-800 p-0.5"
                            title="Open in reading mode"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </button>
                        {/* Edit Heading Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditedHeading(note.custom_heading || noteHeading);
                                setIsEditingHeading(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 p-0.5"
                            title="Edit heading"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        {/* Delete Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(note.id);
                            }}
                            className="text-red-600 hover:text-red-800 p-0.5"
                            title="Delete note"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Edit Heading Modal */}
                {isEditingHeading && (
                    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="text"
                            value={editedHeading}
                            onChange={(e) => setEditedHeading(e.target.value)}
                            placeholder="Enter custom heading..."
                            className="w-full px-2 py-1 text-xs border border-blue-300 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSaveHeading();
                                } else if (e.key === 'Escape') {
                                    handleCancelHeading();
                                }
                            }}
                        />
                        <div className="flex gap-1">
                            <button
                                onClick={handleSaveHeading}
                                disabled={isSaving}
                                className="px-2 py-0.5 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSaving ? "Saving..." : "Save"}
                            </button>
                            <button
                                onClick={handleCancelHeading}
                                disabled={isSaving}
                                className="px-2 py-0.5 text-[10px] bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="mb-2">
                    {note.note_type === "question" ? renderQuestionContent() : renderExplanationContent()}
                </div>

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {note.tags.map((tag, idx) => (
                            <span
                                key={idx}
                                className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-700 rounded"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Custom Notes */}
                {note.custom_notes && (
                    <div className="mb-2 p-1.5 bg-yellow-50 border border-yellow-200 rounded text-[10px] text-gray-700">
                        <strong>My Notes:</strong> {note.custom_notes}
                    </div>
                )}

                {/* Footer */}
                <div className="text-[10px] text-gray-500 pt-1.5 border-t border-gray-100">
                    Saved on {formatDate(note.created_at)}
                </div>
            </div>
        </div>
    );
}
