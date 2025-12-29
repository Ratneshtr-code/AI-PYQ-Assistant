// src/utils/readingMode.js
/**
 * Reading Mode utility for notes
 * Opens a single note in a new tab with a clean, full-screen reading interface
 */
import { formatMarkdown } from "./formatMarkdown";

/**
 * Escape HTML to prevent XSS
 */
const escapeHtml = (text) => {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
};

/**
 * Open a note in reading mode (new tab)
 */
export const openNoteInReadingMode = (note) => {
    const readingWindow = window.open("", "_blank");
    if (!readingWindow) {
        alert("Please allow popups to open reading mode");
        return;
    }

    // Format dates
    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        } catch {
            return dateString;
        }
    };

    // Get note heading
    const getNoteHeading = () => {
        if (note.custom_heading && note.custom_heading.trim()) {
            return note.custom_heading.trim();
        }
        if (note.explanation_text) {
            const lines = note.explanation_text.split('\n');
            for (const line of lines) {
                if (line.includes('**Core Concept') || line.includes('**Core Concept:')) {
                    const match = line.match(/\*\*Core Concept[:\s]*(.*?)\*\*/);
                    if (match && match[1]) {
                        return match[1].trim();
                    }
                }
                if (line.startsWith('**') && line.endsWith('**') && line.length < 100) {
                    return line.replace(/\*\*/g, '').trim();
                }
            }
        }
        if (note.question_data?.question_text) {
            return note.question_data.question_text.substring(0, 80) + (note.question_data.question_text.length > 80 ? '...' : '');
        }
        return note.note_type === "question" ? "Question" : "Explanation";
    };

    const noteHeading = getNoteHeading();
    const noteType = note.note_type === "question" ? "Question" : "Explanation";
    const noteTypeClass = note.note_type === "question" ? "question" : "explanation";

    // Build question content if it's a question note
    let questionContent = "";
    if (note.note_type === "question" && note.question_data) {
        const q = note.question_data;
        questionContent = `
            <div class="question-section">
                <div class="question-text">${escapeHtml(q.question_text || "")}</div>
                ${q.option_a || q.option_b || q.option_c || q.option_d ? `
                    <div class="options">
                        ${q.option_a ? `<div class="option"><strong>A.</strong> ${escapeHtml(q.option_a)}</div>` : ""}
                        ${q.option_b ? `<div class="option"><strong>B.</strong> ${escapeHtml(q.option_b)}</div>` : ""}
                        ${q.option_c ? `<div class="option"><strong>C.</strong> ${escapeHtml(q.option_c)}</div>` : ""}
                        ${q.option_d ? `<div class="option"><strong>D.</strong> ${escapeHtml(q.option_d)}</div>` : ""}
                    </div>
                ` : ""}
                ${q.correct_option ? `<div class="correct-answer"><strong>Correct Answer:</strong> ${escapeHtml(q.correct_option)}</div>` : ""}
            </div>
        `;
    }

    // Build explanation content
    let explanationContent = "";
    if (note.explanation_text) {
        const formattedExplanation = formatMarkdown(note.explanation_text);
        explanationContent = `
            <div class="explanation-section">
                <div class="explanation-text">${formattedExplanation}</div>
            </div>
        `;
    }

    // Build custom notes
    let customNotesContent = "";
    if (note.custom_notes) {
        customNotesContent = `
            <div class="custom-notes-section">
                <h3>My Notes</h3>
                <div class="custom-notes-text">${escapeHtml(note.custom_notes)}</div>
            </div>
        `;
    }

    // Build tags
    let tagsContent = "";
    if (note.tags && note.tags.length > 0) {
        tagsContent = `
            <div class="tags-section">
                ${note.tags.map(tag => `<span class="tag">#${tag}</span>`).join("")}
            </div>
        `;
    }

    // Build HTML content
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${noteHeading} - Reading Mode</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                    line-height: 1.7;
                    color: #1f2937;
                    background: #ffffff;
                    padding: 0;
                }
                .container {
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 40px 20px;
                }
                .header {
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .note-type-badge {
                    display: inline-block;
                    padding: 6px 14px;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 600;
                    margin-bottom: 15px;
                }
                .note-type-badge.question {
                    background: #dbeafe;
                    color: #1e40af;
                }
                .note-type-badge.explanation {
                    background: #f3e8ff;
                    color: #6b21a8;
                }
                h1 {
                    font-size: 28px;
                    font-weight: 700;
                    color: #111827;
                    margin-bottom: 15px;
                    line-height: 1.3;
                }
                .meta-info {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 15px;
                    font-size: 14px;
                    color: #6b7280;
                    margin-top: 15px;
                }
                .meta-item {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .content {
                    margin-top: 30px;
                }
                .question-section {
                    margin-bottom: 30px;
                    padding: 25px;
                    background: #f9fafb;
                    border-radius: 8px;
                    border-left: 4px solid #3b82f6;
                }
                .question-text {
                    font-size: 16px;
                    font-weight: 500;
                    margin-bottom: 20px;
                    color: #111827;
                    line-height: 1.6;
                }
                .options {
                    margin: 20px 0;
                    padding-left: 10px;
                }
                .option {
                    margin: 12px 0;
                    font-size: 15px;
                    padding: 10px;
                    background: white;
                    border-radius: 6px;
                    border: 1px solid #e5e7eb;
                }
                .option strong {
                    color: #3b82f6;
                    margin-right: 8px;
                }
                .correct-answer {
                    margin-top: 20px;
                    padding: 12px;
                    background: #d1fae5;
                    border-radius: 6px;
                    color: #065f46;
                    font-weight: 500;
                }
                .explanation-section {
                    margin-bottom: 30px;
                }
                .explanation-text {
                    font-size: 16px;
                    line-height: 1.8;
                    color: #374151;
                }
                .explanation-text h2,
                .explanation-text h3 {
                    color: #111827;
                    margin-top: 25px;
                    margin-bottom: 15px;
                    font-weight: 600;
                }
                .explanation-text h2 {
                    font-size: 22px;
                }
                .explanation-text h3 {
                    font-size: 18px;
                }
                .explanation-text p {
                    margin-bottom: 15px;
                }
                .explanation-text ul,
                .explanation-text ol {
                    margin: 15px 0;
                    padding-left: 25px;
                }
                .explanation-text li {
                    margin: 8px 0;
                }
                .explanation-text strong {
                    font-weight: 600;
                    color: #111827;
                }
                .explanation-text em {
                    font-style: italic;
                }
                .custom-notes-section {
                    margin-top: 30px;
                    padding: 20px;
                    background: #fef3c7;
                    border-radius: 8px;
                    border-left: 4px solid #f59e0b;
                }
                .custom-notes-section h3 {
                    font-size: 18px;
                    color: #92400e;
                    margin-bottom: 10px;
                }
                .custom-notes-text {
                    font-size: 15px;
                    color: #78350f;
                    line-height: 1.6;
                }
                .tags-section {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                }
                .tag {
                    display: inline-block;
                    padding: 6px 12px;
                    background: #f3f4f6;
                    color: #4b5563;
                    border-radius: 6px;
                    font-size: 13px;
                    margin-right: 8px;
                    margin-bottom: 8px;
                }
                .footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    font-size: 14px;
                    color: #6b7280;
                    text-align: center;
                }
                @media print {
                    body {
                        padding: 20px;
                    }
                    .container {
                        max-width: 100%;
                        padding: 0;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="note-type-badge ${noteTypeClass}">${escapeHtml(noteType)}</div>
                    <h1>${escapeHtml(noteHeading)}</h1>
                    <div class="meta-info">
                        ${note.exam ? `<div class="meta-item"><strong>Exam:</strong> ${escapeHtml(note.exam)}</div>` : ""}
                        ${note.subject ? `<div class="meta-item"><strong>Subject:</strong> ${escapeHtml(note.subject)}</div>` : ""}
                        ${note.topic ? `<div class="meta-item"><strong>Topic:</strong> ${escapeHtml(note.topic)}</div>` : ""}
                        ${note.year ? `<div class="meta-item"><strong>Year:</strong> ${escapeHtml(String(note.year))}</div>` : ""}
                        ${note.explanation_type ? `<div class="meta-item"><strong>Type:</strong> ${escapeHtml(note.explanation_type)}</div>` : ""}
                        ${note.created_at ? `<div class="meta-item"><strong>Saved:</strong> ${formatDate(note.created_at)}</div>` : ""}
                    </div>
                </div>
                <div class="content">
                    ${questionContent}
                    ${explanationContent}
                    ${customNotesContent}
                    ${tagsContent}
                </div>
                <div class="footer">
                    <p>Reading Mode - AI PYQ Assistant</p>
                </div>
            </div>
        </body>
        </html>
    `;

    // Write content to new window
    readingWindow.document.write(htmlContent);
    readingWindow.document.close();
    
    // Focus the new window
    readingWindow.focus();
};

