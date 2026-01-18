// components/conceptmap/visuals/PreambleVisual.jsx
import { useState } from "react";
import { motion } from "framer-motion";

export default function PreambleVisual({ topicData }) {
    const [selectedSection, setSelectedSection] = useState("keyTerms");

    if (!topicData || !topicData.data) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">No data available</p>
            </div>
        );
    }

    const { data } = topicData;
    const preambleText = data.preambleText || "";
    const keywords = data.keywords || [];
    const content = data.content || {};

    // Helper function to parse markdown bold
    const parseMarkdownBold = (text) => {
        if (!text || typeof text !== 'string') {
            return text;
        }
        
        const parts = [];
        const regex = /\*\*(.+?)\*\*/g;
        let match;
        let lastIndex = 0;

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
            }
            parts.push({ type: 'bold', content: match[1] });
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
            parts.push({ type: 'text', content: text.substring(lastIndex) });
        }

        if (parts.length === 0) {
            return <span>{text}</span>;
        }

        return (
            <>
                {parts.map((part, idx) => 
                    part.type === 'bold' ? (
                        <strong key={idx} className="font-bold text-gray-900">{part.content}</strong>
                    ) : (
                        <span key={idx}>{part.content}</span>
                    )
                )}
            </>
        );
    };

    const sections = {
        keyTerms: { label: "📖 Key Terms Explained", icon: "📖", color: "blue" },
        basicFacts: { label: "📋 Basic Facts", icon: "📋", color: "indigo" },
        "42ndAmendment": { label: "📝 42nd Amendment", icon: "📝", color: "green" },
        socialismExplained: { label: "🏭 Socialism Explained", icon: "🏭", color: "orange" },
        secularismExplained: { label: "🕉️ Secularism Explained", icon: "🕉️", color: "purple" },
        keyCases: { label: "⚖️ Important Cases", icon: "⚖️", color: "red" },
        sources: { label: "🌍 Sources", icon: "🌍", color: "teal" },
        examTips: { label: "💡 Exam Tips", icon: "💡", color: "yellow" }
    };

    return (
        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-blue-50 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-2.5 shadow-sm">
                <h2 className="text-lg md:text-xl font-bold text-gray-800">{topicData.title}</h2>
            </div>

            {/* Main Content Area - Split Layout */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* LEFT PANEL - Preamble Text (30% on desktop) */}
                <div className="lg:w-2/5 bg-gradient-to-br from-amber-50 to-orange-50 border-b lg:border-b-0 lg:border-r border-gray-300 overflow-y-auto p-4 md:p-6">
                    <div className="bg-white rounded-lg shadow-lg border-4 border-amber-600 p-6">
                        <h3 className="text-center font-bold text-xl mb-4 text-amber-900">THE PREAMBLE</h3>
                        <div className="text-sm leading-relaxed whitespace-pre-line text-gray-800 font-serif text-justify" style={{ fontFamily: "'Times New Roman', serif" }}>
                            {preambleText}
                        </div>
                    </div>

                    {/* Keywords Legend */}
                    {keywords.length > 0 && (
                        <div className="mt-4 bg-white rounded-lg shadow-md border border-gray-200 p-4">
                            <h4 className="text-sm font-bold text-gray-800 mb-3">🔑 Key Terms:</h4>
                            <div className="space-y-2">
                                {keywords.map((kw, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                        <div 
                                            className="w-3 h-3 rounded-full mt-1 flex-shrink-0" 
                                            style={{ backgroundColor: kw.color }}
                                        ></div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-gray-900">{kw.word}</p>
                                            <p className="text-xs text-gray-600">{kw.significance}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT PANEL - Smart Notes (70% on desktop) */}
                <div className="flex-1 overflow-y-auto p-4 md:p-5">
                    {/* Section Selector */}
                    <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                        <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Select Topic:</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {Object.entries(sections).map(([key, section]) => (
                                <button
                                    key={key}
                                    onClick={() => setSelectedSection(key)}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                        selectedSection === key
                                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    <span className="mr-1">{section.icon}</span>
                                    <span className="hidden md:inline">{section.label.replace(/^[^\s]+ /, '')}</span>
                                    <span className="md:hidden">{section.label.split(' ')[1] || section.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Display */}
                    <motion.div
                        key={selectedSection}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-5"
                    >
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="text-2xl">{sections[selectedSection]?.icon}</span>
                            <span>{sections[selectedSection]?.label}</span>
                        </h3>

                        <div className="space-y-3">
                            {content[selectedSection] && Array.isArray(content[selectedSection]) ? (
                                <ul className="space-y-2.5">
                                    {content[selectedSection].map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-blue-500 mt-0.5 flex-shrink-0 text-base">•</span>
                                            <span className="flex-1 text-base text-gray-700 leading-relaxed">
                                                {parseMarkdownBold(item)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : content[selectedSection] ? (
                                <p className="text-base text-gray-700 leading-relaxed">{parseMarkdownBold(content[selectedSection])}</p>
                            ) : (
                                <p className="text-gray-500 text-sm italic">No content available for this section.</p>
                            )}
                        </div>
                    </motion.div>

                    {/* Quick Summary Box */}
                    {selectedSection === "examTips" && content.examTips && (
                        <div className="mt-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg shadow-md border-2 border-yellow-300 p-4">
                            <h4 className="text-sm font-bold text-yellow-900 mb-2 flex items-center gap-2">
                                <span className="text-lg">🎯</span>
                                <span>Quick Revision Points</span>
                            </h4>
                            <div className="text-sm text-yellow-900 space-y-1">
                                <p>• <strong>Added by 42nd Amendment (1976):</strong> SOCIALIST, SECULAR, INTEGRITY</p>
                                <p>• <strong>5 key terms:</strong> SOVEREIGN, SOCIALIST, SECULAR, DEMOCRATIC, REPUBLIC</p>
                                <p>• <strong>4 objectives:</strong> JUSTICE, LIBERTY, EQUALITY, FRATERNITY</p>
                                <p>• <strong>Source:</strong> Objectives Resolution (Nehru, 1947)</p>
                                <p>• <strong>Amendable:</strong> Yes (Kesavananda Bharati 1973)</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

