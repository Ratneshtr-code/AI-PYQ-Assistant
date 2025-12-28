// src/components/NoteCard.jsx
import { useState } from "react";
import { formatMarkdown } from "../utils/formatMarkdown";

export default function NoteCard({ note, viewMode = "grid", isSelected = false, onSelect, onDelete }) {
    const [showFullContent, setShowFullContent] = useState(false);

    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        } catch {
            return dateString;
        }
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

        return (
            <div className="space-y-3">
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {questionText.length > 200 && !showFullContent
                        ? `${questionText.substring(0, 200)}...`
                        : questionText}
                </div>
                {questionText.length > 200 && (
                    <button
                        onClick={() => setShowFullContent(!showFullContent)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                    >
                        {showFullContent ? "Show Less" : "Show More"}
                    </button>
                )}
                <div className="space-y-1 text-xs">
                    {Object.entries(options).map(([letter, text]) => (
                        text && (
                            <div key={letter} className="flex items-start gap-2">
                                <span className="font-medium text-gray-600">{letter}.</span>
                                <span className="text-gray-700">{text}</span>
                            </div>
                        )
                    ))}
                </div>
                {note.question_data.correct_option && (
                    <div className="text-xs text-green-700 font-medium">
                        Correct Answer: {note.question_data.correct_option}
                    </div>
                )}
            </div>
        );
    };

    const renderExplanationContent = () => {
        if (!note.explanation_text) return null;
        
        const explanation = note.explanation_text;
        const shouldTruncate = explanation.length > 500;
        
        // Format markdown to HTML (same as ExplanationWindow)
        // Format full text, then truncate the HTML if needed
        const fullFormattedHtml = formatMarkdown(explanation);
        let displayHtml = fullFormattedHtml;
        
        if (shouldTruncate && !showFullContent) {
            // Simple truncation: find a good breaking point in the HTML
            const maxLength = 800; // Characters in HTML
            if (fullFormattedHtml.length > maxLength) {
                // Find the last closing tag before maxLength
                let truncateAt = maxLength;
                const lastTag = fullFormattedHtml.lastIndexOf('</', maxLength);
                if (lastTag > maxLength * 0.7) {
                    truncateAt = lastTag;
                }
                displayHtml = fullFormattedHtml.substring(0, truncateAt) + '...';
            }
        }

        return (
            <div className="space-y-2">
                <div 
                    className={`explanation-text prose prose-sm max-w-none ${shouldTruncate && !showFullContent ? 'line-clamp-6' : ''}`}
                    dangerouslySetInnerHTML={{ __html: displayHtml }}
                />
                {shouldTruncate && (
                    <button
                        onClick={() => setShowFullContent(!showFullContent)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                        {showFullContent ? "Show Less" : "Show More"}
                    </button>
                )}
            </div>
        );
    };

    const cardClass = `
        bg-white rounded-lg border-2 shadow-sm transition-all relative
        ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}
        ${viewMode === "list" ? "flex gap-4" : ""}
    `.trim().replace(/\s+/g, " ");

    return (
        <div className={cardClass}>
            {/* Selection Checkbox */}
            <div className={`${viewMode === "grid" ? "absolute top-2 left-2 z-10" : "flex-shrink-0 pt-4 pl-4"}`}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onSelect}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
            </div>

            <div className={`${viewMode === "grid" ? "p-4 pt-8" : "flex-1 p-4"}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                note.note_type === "question"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-purple-100 text-purple-700"
                            }`}>
                                {note.note_type === "question" ? "Question" : "Explanation"}
                            </span>
                            {note.explanation_type && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
                                    {note.explanation_type === "concept" ? "Concept" : "Option"}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                            {note.exam && (
                                <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                    {note.exam}
                                </span>
                            )}
                            {note.year && <span>📅 {note.year}</span>}
                            {note.subject && <span>📚 {note.subject}</span>}
                        </div>
                    </div>
                    <button
                        onClick={() => onDelete(note.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete note"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="mb-3">
                    {note.note_type === "question" ? renderQuestionContent() : renderExplanationContent()}
                </div>

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
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

                {/* Custom Notes */}
                {note.custom_notes && (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-gray-700">
                        <strong>My Notes:</strong> {note.custom_notes}
                    </div>
                )}

                {/* Footer */}
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                    Saved on {formatDate(note.created_at)}
                </div>
            </div>
        </div>
    );
}

