import { useState, useEffect } from "react";
import { getUserData } from "../utils/auth";
import ExplanationWindow from "./ExplanationWindow";
import SaveNoteButton from "./SaveNoteButton";

export default function ResultsList({ results, onExplanationWindowChange, hideExploreTopicGraph = false }) {
    const [visibleAnswers, setVisibleAnswers] = useState({});
    const [loadingExplain, setLoadingExplain] = useState({});
    const [isAdmin, setIsAdmin] = useState(false);
    
    // Explanation Window State
    const [explanationWindowOpen, setExplanationWindowOpen] = useState(false);
    const [explanationWindowMinimized, setExplanationWindowMinimized] = useState(false);
    const [selectedOptionForExplanation, setSelectedOptionForExplanation] = useState(null);
    const [explanationType, setExplanationType] = useState(null); // "option" | "concept"
    const [currentQuestionData, setCurrentQuestionData] = useState(null);
    const [isOptionCorrect, setIsOptionCorrect] = useState(false);
    
    // Track clicked options for styling
    const [clickedOptions, setClickedOptions] = useState({}); // { questionId: { optionKey: true/false } }

    // Check if user is admin (database admin only)
    useEffect(() => {
        const checkAdmin = () => {
            const userData = getUserData();
            setIsAdmin(userData?.is_admin || false);
        };
        
        // Check on mount
        checkAdmin();
        
        // Listen for user login/logout events
        const handleUserChange = () => {
            checkAdmin();
        };
        
        window.addEventListener('userLoggedIn', handleUserChange);
        window.addEventListener('userLoggedOut', handleUserChange);
        window.addEventListener('premiumStatusChanged', handleUserChange);

        return () => {
            window.removeEventListener('userLoggedIn', handleUserChange);
            window.removeEventListener('userLoggedOut', handleUserChange);
            window.removeEventListener('premiumStatusChanged', handleUserChange);
        };
    }, []);

    const toggleAnswer = (id) => {
        const newShowAns = !visibleAnswers[id];
        setVisibleAnswers((prev) => ({ ...prev, [id]: newShowAns }));
        
        // When showing answer, automatically expand the correct option to show Explain button
        if (newShowAns) {
            const currentItem = results.find(r => {
                const itemId = r.id || r.json_question_id || r.question_id;
                return itemId === id;
            });
            
            if (currentItem) {
                // Find the correct option key
                const optionKeys = ["option_a", "option_b", "option_c", "option_d"];
                
                for (const optKey of optionKeys) {
                    const text = currentItem[optKey];
                    const displayText = (text != null && String(text).trim() !== "") 
                        ? String(text).trim() 
                        : "(No option provided)";
                    
                    if (checkIfOptionIsCorrect(currentItem, optKey, text, displayText)) {
                        // Automatically expand the correct option
                        setClickedOptions((prev) => {
                            const newState = { ...prev };
                            if (!newState[id]) {
                                newState[id] = {};
                            }
                            // Collapse all options first
                            newState[id] = {
                                option_a: false,
                                option_b: false,
                                option_c: false,
                                option_d: false,
                            };
                            // Then expand the correct one
                            newState[id][optKey] = true;
                            return newState;
                        });
                        break;
                    }
                }
            }
        } else {
            // When hiding answer, collapse all options
            setClickedOptions((prev) => {
                const newState = { ...prev };
                if (newState[id]) {
                    newState[id] = {
                        option_a: false,
                        option_b: false,
                        option_c: false,
                        option_d: false,
                    };
                }
                return newState;
            });
        }
    };

    // Helper function to check if an option is correct
    // Handles both cases: correct_option as letter (A, B, C, D) or as full text
    const checkIfOptionIsCorrect = (item, optKey, optionText, displayText) => {
        const correctOption = item.correct_option || "";
        const correctOptionUpper = correctOption.toUpperCase().trim();
        
        // Check if correct_option is a letter (A, B, C, D)
        const optionLetter = optKey.replace("option_", "").toUpperCase();
        if (correctOptionUpper === optionLetter || correctOptionUpper === optionLetter + ".") {
            return true;
        }
        
        // Check if correct_option matches the text (various formats)
        const normalizedCorrect = String(correctOption).trim();
        const normalizedText = String(optionText || "").trim();
        const normalizedDisplay = String(displayText || "").trim();
        
        return (
            optionText === correctOption ||
            displayText === correctOption ||
            normalizedText === normalizedCorrect ||
            normalizedDisplay === normalizedCorrect ||
            String(optionText).trim() === String(correctOption).trim() ||
            String(displayText).trim() === String(correctOption).trim()
        );
    };

    const handleOptionClick = (item, optKey) => {
        const id = item.id || item.json_question_id || item.question_id;
        const currentState = clickedOptions[id]?.[optKey];
        
        // Get the text and check if this option is correct
        const text = item[optKey];
        const displayText = (text != null && String(text).trim() !== "") 
            ? String(text).trim() 
            : "(No option provided)";
        const isCorrect = checkIfOptionIsCorrect(item, optKey, text, displayText);
        
        // If clicking an incorrect option and "Show Answer" is currently visible,
        // hide the answer to collapse the correct answer display
        if (!isCorrect && visibleAnswers[id]) {
            setVisibleAnswers((prev) => ({ ...prev, [id]: false }));
        }
        
        // Toggle the clicked state and collapse other options
        setClickedOptions((prev) => {
            const newState = { ...prev };
            if (!newState[id]) {
                newState[id] = {};
            }
            
            // If clicking the same option, toggle it
            // If clicking a different option, collapse all and expand the new one
            if (currentState) {
                // Collapse this option
                newState[id][optKey] = false;
            } else {
                // Collapse all options for this question first
                newState[id] = {
                    option_a: false,
                    option_b: false,
                    option_c: false,
                    option_d: false,
                };
                // Then expand the clicked one
                newState[id][optKey] = true;
            }
            
            return newState;
        });
    };

    const handleExplainOption = (item, optKey) => {
        const id = item.id || item.json_question_id || item.question_id;
        const text = item[optKey];
        const displayText = (text != null && String(text).trim() !== "") 
            ? String(text).trim() 
            : "(No option provided)";
        
        // Use the same thorough comparison logic as in option rendering
        const isCorrect = checkIfOptionIsCorrect(item, optKey, text, displayText);

        setCurrentQuestionData(item);
        setSelectedOptionForExplanation(displayText);
        setIsOptionCorrect(isCorrect);
        setExplanationType("option");
        setExplanationWindowOpen(true);
    };

    const handleExplainConcept = (item) => {
        setCurrentQuestionData(item);
        setSelectedOptionForExplanation(null);
        setExplanationType("concept");
        setExplanationWindowOpen(true);
    };

    const handleCloseExplanationWindow = () => {
        setExplanationWindowOpen(false);
        setExplanationWindowMinimized(false);
        setCurrentQuestionData(null);
        setSelectedOptionForExplanation(null);
        setExplanationType(null);
        setIsOptionCorrect(false);
    };

    const handleMinimizeExplanationWindow = () => {
        setExplanationWindowMinimized(!explanationWindowMinimized);
    };

    // --- Question text renderer ---
    const renderQuestionText = (item) => {
        const raw = item.question_text || "";
        const format = item.question_format?.toLowerCase?.() || "auto";
        const hasPipes = raw.includes("|");
        const hasDashes = raw.includes("–") || raw.includes("—");

        // Escape HTML helper
        const escapeHtml = (text) => {
            return String(text)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        // 🎯 Table Handling - with "|" separators
        if ((format === "table" || hasPipes) && hasPipes) {
            const lines = raw.split("\n").filter((l) => l.trim() !== "");
            const headerLines = [];
            const tableLines = [];
            const questionLines = [];

            // Smartly group lines
            lines.forEach((line) => {
                if (line.includes("|")) {
                    tableLines.push(line);
                } else if (tableLines.length === 0) {
                    headerLines.push(line);
                } else {
                    questionLines.push(line);
                }
            });

            // Build table HTML with proper escaping
            const rows = tableLines
                .map((line) => {
                    const cells = line.split("|").map((c) => escapeHtml(c.trim()));
                    return `<tr>${cells
                        .map((cell) => `<td class='border border-gray-300 px-3 py-1.5 text-sm'>${cell || "&nbsp;"}</td>`)
                        .join("")}</tr>`;
                })
                .join("");

            const html = `
                <div class='question-text'>
                    ${headerLines.map(h => escapeHtml(h)).join("<br/>")}
                    ${headerLines.length > 0 ? "<br/>" : ""}
                    <table class='border-collapse border border-gray-400 text-sm w-full my-3 bg-white'>
                        <tbody>${rows}</tbody>
                    </table>
                    ${questionLines.length > 0 ? "<br/>" : ""}
                    ${questionLines.map(q => escapeHtml(q)).join("<br/>")}
                </div>
            `;

            return (
                <div
                    className="question-text"
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            );
        }

        // 🎯 Match Format Handling - with "–" separators or structured pairs
        if (format === "match") {
            const lines = raw.split("\n").filter((l) => l.trim() !== "");
            const headerLines = [];
            const dataLines = [];
            const questionLines = [];

            // Check if it has dash-separated structured data (table-like but flattened)
            if (hasDashes) {
                lines.forEach((line) => {
                    if (line.includes("–") || line.includes("—")) {
                        dataLines.push(line);
                    } else if (dataLines.length === 0) {
                        headerLines.push(line);
                    } else {
                        questionLines.push(line);
                    }
                });

                // Render as structured list with dashes
                if (dataLines.length >= 2) {
                    const structuredRows = dataLines.map((line) => {
                        const parts = line.split(/[–—]/).map(p => escapeHtml(p.trim()));
                        return `<tr>${parts
                            .map((part) => `<td class='border border-gray-300 px-3 py-1.5 text-sm'>${part || "&nbsp;"}</td>`)
                            .join("")}</tr>`;
                    }).join("");

                    const html = `
                        <div class='question-text'>
                            ${headerLines.map(h => escapeHtml(h)).join("<br/>")}
                            ${headerLines.length > 0 ? "<br/>" : ""}
                            <table class='border-collapse border border-gray-400 text-sm w-full my-3 bg-white'>
                                <tbody>${structuredRows}</tbody>
                            </table>
                            ${questionLines.length > 0 ? "<br/>" : ""}
                            ${questionLines.map(q => escapeHtml(q)).join("<br/>")}
                        </div>
                    `;

                    return (
                        <div
                            className="question-text"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    );
                }
            }

            // Handle match pairs (I. X : Y format) with proper line breaks
            const pairPattern = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|1|2|3|4|5|6|7|8|9|10)\.\s+/i;
            lines.forEach((line) => {
                if (pairPattern.test(line.trim())) {
                    dataLines.push(line);
                } else if (dataLines.length === 0) {
                    headerLines.push(line);
                } else {
                    questionLines.push(line);
                }
            });

            if (dataLines.length >= 2) {
                const html = `
                    <div class='question-text'>
                        ${headerLines.map(h => escapeHtml(h)).join("<br/>")}
                        ${headerLines.length > 0 ? "<br/>" : ""}
                        <div class='match-pairs my-3 space-y-1 pl-4 border-l-2 border-blue-200'>
                            ${dataLines.map(pair => {
                                const formatted = escapeHtml(pair)
                                    .replace(/\s+/g, " ")
                                    .replace(/([:\-–—])/g, "$1 ");
                                return `<div class='text-sm py-1'>${formatted}</div>`;
                            }).join("")}
                        </div>
                        ${questionLines.length > 0 ? "<br/>" : ""}
                        ${questionLines.map(q => escapeHtml(q)).join("<br/>")}
                    </div>
                `;

                return (
                    <div
                        className="question-text"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                );
            }
        }

        // 🎯 Default: Standard text with line breaks
        const html = raw
            .split("\n")
            .map(line => escapeHtml(line))
            .join("<br/>");

        return (
            <div
                className="question-text"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    };


    if (!results?.length) return null;

    // Add class to body when explanation window is open and not minimized for CSS targeting
    // Also notify parent component about state changes
    useEffect(() => {
        if (explanationWindowOpen && !explanationWindowMinimized) {
            document.body.classList.add('explanation-window-open');
        } else {
            document.body.classList.remove('explanation-window-open');
        }
        
        // Notify parent component
        if (onExplanationWindowChange) {
            onExplanationWindowChange(explanationWindowOpen, explanationWindowMinimized);
        }
        
        return () => {
            document.body.classList.remove('explanation-window-open');
        };
    }, [explanationWindowOpen, explanationWindowMinimized, onExplanationWindowChange]);

    return (
        <>
            <div className={`results-container ${explanationWindowOpen && !explanationWindowMinimized ? 'results-container-shifted' : ''}`}>
                {results.map((item) => {
                    // Use id (CSV auto-increment) or json_question_id (original JSON ID) or question_id (legacy)
                    const id = item.id || item.json_question_id || item.question_id || `q-${Math.random()}`;
                    const showAns = !!visibleAnswers[id];

                    return (
                        <div key={id} className={`question-card ${explanationWindowOpen && !explanationWindowMinimized ? 'question-card-shifted' : ''}`}>
                            {/* Question */}
                            {renderQuestionText(item)}

                            {/* Meta Info */}
                            <div className="question-meta">
                                {item.exam && (
                                    <span className="flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                                        {item.exam}
                                    </span>
                                )}
                                {item.year && (
                                    <span className="flex items-center gap-1">
                                        📅 {item.year}
                                    </span>
                                )}
                                {/* Developer/Admin: Question ID for debugging - only visible for admin users */}
                                {isAdmin && item.id && (
                                    <span 
                                        className="flex items-center gap-1 text-[11px] text-gray-400 font-mono cursor-help opacity-70 hover:opacity-100 transition-opacity" 
                                        title={`Question ID (Admin)\nCSV ID: ${item.id}`}
                                    >
                                        <span className="text-gray-500">🔍</span>
                                        <span>ID: {item.id}</span>
                                    </span>
                                )}
                                
                                {/* Show/Hide Answer Button */}
                                <button
                                    onClick={() => toggleAnswer(id)}
                                    className="info-layer-btn info-layer-btn-answer"
                                    title={showAns ? "Hide the correct answer" : "Show the correct answer"}
                                >
                                    <span className="info-layer-icon">{showAns ? "👁️" : "👁️‍🗨️"}</span>
                                    <span>{showAns ? "Hide Answer" : "Show Answer"}</span>
                                </button>

                                {/* Explain Concept Button */}
                                <button
                                    onClick={() => handleExplainConcept(item)}
                                    className="info-layer-btn info-layer-btn-active"
                                    title="Get detailed explanation of the question and related concepts"
                                >
                                    <span className="info-layer-icon">💡</span>
                                    <span>Explain Concept</span>
                                </button>

                                {/* Save Question Button */}
                                <SaveNoteButton
                                    noteType="question"
                                    questionData={item}
                                    size="small"
                                    showLabel={true}
                                    className="info-layer-btn"
                                    onSaveSuccess={() => {
                                        // Optional: Show toast notification
                                        console.log("Question saved successfully");
                                    }}
                                    onSaveError={(error) => {
                                        console.error("Failed to save question:", error);
                                    }}
                                />
                                
                                {/* Explore Topic Graph Button (Placeholder) - Hidden in Topic-wise PYQ page */}
                                {!hideExploreTopicGraph && (
                                    <button
                                        disabled
                                        className="info-layer-btn info-layer-btn-disabled"
                                        title="Coming soon: Explore related topics in a graph view"
                                    >
                                        <span className="info-layer-icon">🗺️</span>
                                        <span>Explore Topic Graph</span>
                                    </button>
                                )}
                            </div>

                            {/* Options */}
                            <div className="option-list">
                                {["option_a", "option_b", "option_c", "option_d"].map((optKey) => {
                                    const text = item[optKey];
                                    // Normalize text - handle null, undefined, empty string
                                    const displayText = (text != null && String(text).trim() !== "") 
                                        ? String(text).trim() 
                                        : "(No option provided)";
                                    
                                    // Use helper function to check if option is correct
                                    const isCorrect = checkIfOptionIsCorrect(item, optKey, text, displayText);
                                    
                                    const isClicked = clickedOptions[id]?.[optKey] === true;
                                    const correctVisible = isCorrect && showAns;

                                    // Determine option styling
                                    let optionClass = "option-item";
                                    if (isClicked) {
                                        // When clicked, show green for correct, light red for incorrect
                                        optionClass += isCorrect 
                                            ? " option-clicked-correct" 
                                            : " option-clicked-incorrect";
                                    } else if (correctVisible) {
                                        // Show green when answer is visible and option is correct
                                        optionClass += " option-correct";
                                    }

                                    return (
                                        <div key={optKey} className="option-wrapper">
                                            <div
                                                onClick={() => handleOptionClick(item, optKey)}
                                                className={optionClass}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">
                                                        {optKey
                                                            .replace("option_", "")
                                                            .toUpperCase()}
                                                        .
                                                    </span>
                                                    <span>{displayText}</span>
                                                </div>
                                                {(correctVisible || (isClicked && isCorrect)) && <span>✅</span>}
                                            </div>

                                            {/* Explain Button - appears when option is clicked or when correct answer is shown */}
                                            {(isClicked || correctVisible) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleExplainOption(item, optKey);
                                                    }}
                                                    className="explain-button"
                                                    title="Get explanation for this option"
                                                >
                                                    Explain
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Explanation Window */}
            <ExplanationWindow
                isOpen={explanationWindowOpen}
                onClose={handleCloseExplanationWindow}
                onMinimize={handleMinimizeExplanationWindow}
                isMinimized={explanationWindowMinimized}
                questionData={currentQuestionData}
                selectedOption={selectedOptionForExplanation}
                explanationType={explanationType}
                isCorrect={isOptionCorrect}
            />
        </>
    );
}
