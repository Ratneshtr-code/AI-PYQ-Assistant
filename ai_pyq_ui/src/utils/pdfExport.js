// src/utils/pdfExport.js
/**
 * PDF Export utility for notes
 * Uses browser's print functionality or jsPDF for client-side generation
 */
import { formatMarkdown } from "./formatMarkdown";

/**
 * Export notes to PDF using browser print
 * This is a simple implementation - for more advanced features, use jsPDF
 */
export const exportNotesToPDF = (notes, options = {}) => {
    const {
        title = "My Notes",
        includeQuestions = true,
        includeExplanations = true,
    } = options;

    // Create a temporary container for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        alert("Please allow popups to export PDF");
        return;
    }

    // Build HTML content
    let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 40px;
                    line-height: 1.6;
                    color: #333;
                }
                h1 {
                    color: #2563eb;
                    border-bottom: 2px solid #2563eb;
                    padding-bottom: 10px;
                    margin-bottom: 30px;
                }
                .note {
                    margin-bottom: 30px;
                    padding: 20px;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    page-break-inside: avoid;
                }
                .note-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #e5e7eb;
                }
                .note-type {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                }
                .note-type.question {
                    background: #dbeafe;
                    color: #1e40af;
                }
                .note-type.explanation {
                    background: #f3e8ff;
                    color: #6b21a8;
                }
                .note-meta {
                    font-size: 12px;
                    color: #6b7280;
                    margin-top: 10px;
                }
                .question-text {
                    font-size: 14px;
                    margin: 15px 0;
                    font-weight: 500;
                }
                .options {
                    margin: 15px 0;
                    padding-left: 20px;
                }
                .option {
                    margin: 5px 0;
                    font-size: 13px;
                }
                .explanation-text {
                    font-size: 14px;
                    line-height: 1.7;
                    margin: 15px 0;
                    color: #374151;
                }
                .explanation-text strong {
                    font-weight: 600;
                    color: #111827;
                }
                .explanation-text p {
                    margin-bottom: 12px;
                }
                .explanation-section-header {
                    padding: 12px 0;
                    margin: 20px 0 12px 0;
                    font-weight: 700;
                    font-size: 15px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #2563eb;
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 8px;
                }
                .explanation-section-header .section-icon {
                    font-size: 18px;
                }
                .explanation-list {
                    margin: 10px 0;
                    padding-left: 20px;
                }
                .explanation-nested-list {
                    margin-top: 5px;
                    margin-bottom: 5px;
                }
                .explanation-list-item {
                    margin: 5px 0;
                    line-height: 1.6;
                }
                .explanation-h1, .explanation-h2, .explanation-h3 {
                    font-weight: 700;
                    color: #2563eb;
                    margin: 15px 0 10px 0;
                }
                .explanation-h1 { font-size: 18px; }
                .explanation-h2 { font-size: 16px; }
                .explanation-h3 { font-size: 15px; }
                .tags {
                    margin-top: 10px;
                }
                .tag {
                    display: inline-block;
                    padding: 2px 8px;
                    background: #f3f4f6;
                    border-radius: 4px;
                    font-size: 11px;
                    margin-right: 5px;
                }
                @media print {
                    body {
                        padding: 20px;
                    }
                    .note {
                        page-break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <p style="color: #6b7280; margin-bottom: 30px;">
                Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
            </p>
    `;

    notes.forEach((note, index) => {
        // Filter by type if needed
        if (note.note_type === "question" && !includeQuestions) return;
        if (note.note_type === "explanation" && !includeExplanations) return;

        htmlContent += `<div class="note">`;
        htmlContent += `<div class="note-header">`;
        htmlContent += `<span class="note-type ${note.note_type}">${note.note_type === "question" ? "Question" : "Explanation"}</span>`;
        htmlContent += `<span style="font-size: 12px; color: #6b7280;">${formatDate(note.created_at)}</span>`;
        htmlContent += `</div>`;

        if (note.exam || note.subject || note.year) {
            htmlContent += `<div class="note-meta">`;
            if (note.exam) htmlContent += `<strong>Exam:</strong> ${note.exam} `;
            if (note.subject) htmlContent += `<strong>Subject:</strong> ${note.subject} `;
            if (note.year) htmlContent += `<strong>Year:</strong> ${note.year}`;
            htmlContent += `</div>`;
        }

        if (note.note_type === "question" && note.question_data) {
            const q = note.question_data;
            htmlContent += `<div class="question-text">${escapeHtml(q.question_text || "")}</div>`;
            
            if (q.option_a || q.option_b || q.option_c || q.option_d) {
                htmlContent += `<div class="options">`;
                if (q.option_a) htmlContent += `<div class="option"><strong>A.</strong> ${escapeHtml(q.option_a)}</div>`;
                if (q.option_b) htmlContent += `<div class="option"><strong>B.</strong> ${escapeHtml(q.option_b)}</div>`;
                if (q.option_c) htmlContent += `<div class="option"><strong>C.</strong> ${escapeHtml(q.option_c)}</div>`;
                if (q.option_d) htmlContent += `<div class="option"><strong>D.</strong> ${escapeHtml(q.option_d)}</div>`;
                htmlContent += `</div>`;
            }
            
            if (q.correct_option) {
                htmlContent += `<div style="margin-top: 10px; color: #059669; font-weight: 600;">Correct Answer: ${escapeHtml(q.correct_option)}</div>`;
            }
        } else if (note.note_type === "explanation" && note.explanation_text) {
            // Format markdown to HTML (same as ExplanationWindow and NoteCard)
            // Note: formatMarkdown already escapes HTML, so we don't need escapeHtml here
            const formattedExplanation = formatMarkdown(note.explanation_text);
            htmlContent += `<div class="explanation-text">${formattedExplanation}</div>`;
        }

        if (note.tags && note.tags.length > 0) {
            htmlContent += `<div class="tags">`;
            note.tags.forEach(tag => {
                htmlContent += `<span class="tag">#${escapeHtml(tag)}</span>`;
            });
            htmlContent += `</div>`;
        }

        if (note.custom_notes) {
            htmlContent += `<div style="margin-top: 10px; padding: 10px; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px;">`;
            htmlContent += `<strong>My Notes:</strong> ${escapeHtml(note.custom_notes)}`;
            htmlContent += `</div>`;
        }

        htmlContent += `</div>`;
    });

    htmlContent += `
        </body>
        </html>
    `;

    // Write and print
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
        printWindow.print();
    }, 250);
};

const escapeHtml = (text) => {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
};

const formatDate = (dateString) => {
    try {
        const date = new Date(dateString);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    } catch {
        return dateString;
    }
};

