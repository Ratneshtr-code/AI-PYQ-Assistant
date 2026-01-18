// components/conceptmap/visuals/StaircaseVisual.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function StaircaseVisual({ topicData }) {
    const [selectedStep, setSelectedStep] = useState(null);

    if (!topicData || !topicData.data) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">No staircase data available</p>
            </div>
        );
    }

    const { data } = topicData;
    const steps = data.steps || [];

    const handleStepClick = (step) => {
        setSelectedStep(selectedStep?.id === step.id ? null : step);
    };

    // Helper function to parse markdown bold (**text**) and render as bold
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
                        <strong key={idx} className="font-bold">{part.content}</strong>
                    ) : (
                        <span key={idx}>{part.content}</span>
                    )
                )}
            </>
        );
    };

    const renderContent = (content) => {
        if (!content) return null;

        const lines = content.split('\n');
        return (
            <div className="space-y-1">
                {lines.map((line, idx) => {
                    const trimmedLine = line.trim();
                    if (trimmedLine === '') {
                        return <div key={idx} className="h-1"></div>;
                    }
                    if (trimmedLine.startsWith('•')) {
                        return (
                            <div key={idx} className="text-gray-800 pl-2">
                                {parseMarkdownBold(line)}
                            </div>
                        );
                    }
                    return (
                        <div key={idx} className="text-gray-800">
                            {parseMarkdownBold(line)}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-blue-50 overflow-auto">
            <div className="p-4 md:p-8">
                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">{topicData.title}</h2>
                    {topicData.description && (
                        <p className="text-gray-600 mb-4">{topicData.description}</p>
                    )}
                    <p className="text-sm text-gray-600">
                        Click on any step to view detailed information about each DPSP category
                    </p>
                </div>

                {/* Main Layout: Staircase + Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Staircase Container */}
                    <div className="flex flex-col justify-end min-h-[500px] lg:min-h-[600px]">
                        <div className="relative">
                            {steps.map((step, idx) => {
                                const isSelected = selectedStep?.id === step.id;
                                const stepHeight = 80;
                                const stepWidth = 90;
                                const bottom = idx * stepHeight;
                                const left = idx * 50;

                                return (
                                    <motion.div
                                        key={step.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="absolute"
                                        style={{
                                            bottom: `${bottom}px`,
                                            left: `${left}px`,
                                            width: `${stepWidth}%`,
                                            height: `${stepHeight}px`,
                                            zIndex: steps.length - idx
                                        }}
                                    >
                                        {/* Step */}
                                        <motion.button
                                            onClick={() => handleStepClick(step)}
                                            whileHover={{ scale: 1.02, y: -5 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={`
                                                w-full h-full rounded-t-lg shadow-lg border-4 transition-all
                                                flex flex-col items-center justify-center cursor-pointer
                                                ${isSelected 
                                                    ? 'border-yellow-400 ring-4 ring-yellow-200' 
                                                    : 'border-white hover:border-gray-300'
                                                }
                                            `}
                                            style={{
                                                background: step.gradient || `linear-gradient(135deg, ${step.color || '#6B7280'}, ${step.colorLight || step.color || '#9CA3AF'})`,
                                            }}
                                        >
                                            <div className="text-white">
                                                {/* Step Number Badge */}
                                                <div className="mb-2 w-10 h-10 rounded-full bg-white bg-opacity-30 flex items-center justify-center backdrop-blur-sm">
                                                    <span className="text-xl font-bold">{step.order}</span>
                                                </div>
                                                
                                                {/* Step Title */}
                                                <div className="text-center px-3">
                                                    <p className="font-bold text-sm md:text-base leading-tight mb-1">
                                                        {step.title}
                                                    </p>
                                                    {step.subtitle && (
                                                        <p className="text-xs opacity-90">
                                                            {step.subtitle}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Article count badge */}
                                                {step.articles && (
                                                    <div className="mt-2 px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs backdrop-blur-sm">
                                                        {step.articles.length} Articles
                                                    </div>
                                                )}
                                            </div>
                                        </motion.button>

                                        {/* Step base/shadow */}
                                        <div 
                                            className="absolute top-full w-full h-2 rounded-b opacity-30"
                                            style={{ backgroundColor: step.color || '#6B7280' }}
                                        ></div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Details Panel */}
                    <div className="flex flex-col">
                        <AnimatePresence mode="wait">
                            {selectedStep ? (
                                <motion.div
                                    key={selectedStep.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="bg-white rounded-xl shadow-xl border-2 border-gray-200 p-6 overflow-y-auto max-h-[700px]"
                                >
                                    {/* Step Header */}
                                    <div className="mb-4 pb-4 border-b-2 border-gray-200">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-2xl shadow-md"
                                                    style={{ 
                                                        background: selectedStep.gradient || `linear-gradient(135deg, ${selectedStep.color}, ${selectedStep.colorLight || selectedStep.color})`
                                                    }}
                                                >
                                                    {selectedStep.order}
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-bold text-gray-900">
                                                        {selectedStep.title}
                                                    </h3>
                                                    {selectedStep.subtitle && (
                                                        <p className="text-sm text-gray-600">
                                                            {selectedStep.subtitle}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedStep(null)}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Articles List */}
                                    {selectedStep.articles && selectedStep.articles.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                                <span>📜</span>
                                                <span>Articles Covered</span>
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedStep.articles.map((article, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                                                        style={{ backgroundColor: selectedStep.color }}
                                                    >
                                                        {article}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Step Content */}
                                    {selectedStep.content && (
                                        <div className="space-y-4">
                                            {Object.entries(selectedStep.content).map(([key, value]) => {
                                                if (!value) return null;

                                                const sectionConfig = {
                                                    keyPoints: { icon: '🎯', label: 'Key Points', color: 'blue' },
                                                    provisions: { icon: '📋', label: 'Key Provisions', color: 'indigo' },
                                                    examTips: { icon: '💡', label: 'Exam Tips', color: 'green' },
                                                    distinction: { icon: '⚖️', label: 'Distinction from Fundamental Rights', color: 'purple' },
                                                    significance: { icon: '⭐', label: 'Significance', color: 'yellow' },
                                                    examples: { icon: '📌', label: 'Examples', color: 'cyan' },
                                                    amendments: { icon: '📝', label: 'Related Amendments', color: 'orange' },
                                                    caDebates: { icon: '🗣️', label: 'Constitutional Assembly Insights', color: 'pink' },
                                                    implementation: { icon: '✅', label: 'Implementation', color: 'teal' },
                                                    challenges: { icon: '⚠️', label: 'Challenges', color: 'red' },
                                                    mnemonic: { icon: '🧠', label: 'Memory Trick', color: 'teal' },
                                                };

                                                const config = sectionConfig[key] || {
                                                    icon: '📌',
                                                    label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
                                                    color: 'gray'
                                                };

                                                const colorClasses = {
                                                    blue: 'bg-blue-50 border-blue-200 text-blue-800',
                                                    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
                                                    green: 'bg-green-50 border-green-200 text-green-800',
                                                    purple: 'bg-purple-50 border-purple-200 text-purple-800',
                                                    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                                                    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-800',
                                                    orange: 'bg-orange-50 border-orange-200 text-orange-800',
                                                    pink: 'bg-pink-50 border-pink-200 text-pink-800',
                                                    teal: 'bg-teal-50 border-teal-200 text-teal-800',
                                                    red: 'bg-red-50 border-red-200 text-red-800',
                                                    gray: 'bg-gray-50 border-gray-200 text-gray-800',
                                                };

                                                return (
                                                    <div 
                                                        key={key} 
                                                        className={`p-4 rounded-lg border-2 ${colorClasses[config.color]}`}
                                                    >
                                                        <p className="text-sm font-bold mb-2">
                                                            {config.icon} {config.label}
                                                        </p>
                                                        {Array.isArray(value) ? (
                                                            <ul className="space-y-2">
                                                                {value.map((item, idx) => (
                                                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                                                        <span className="text-gray-600 mt-1">•</span>
                                                                        <span className="flex-1">{renderContent(item)}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <div className="text-sm">
                                                                {renderContent(value)}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="placeholder"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="bg-white rounded-xl shadow-xl border-2 border-gray-200 p-8 flex items-center justify-center min-h-[400px]"
                                >
                                    <div className="text-center max-w-md">
                                        <div className="text-6xl mb-4">📈</div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                                            Climb the Staircase
                                        </h3>
                                        <p className="text-gray-600">
                                            Click on any step to explore that category of Directive Principles with comprehensive exam-focused notes
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Legend or Additional Info */}
                {data.legend && (
                    <div className="mt-8 p-6 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-3">
                            📚 DPSP Categories Overview
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {steps.map((step) => (
                                <div key={step.id} className="flex items-center gap-3">
                                    <div 
                                        className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm"
                                        style={{ backgroundColor: step.color }}
                                    >
                                        {step.order}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-800">{step.title}</p>
                                        {step.articles && (
                                            <p className="text-xs text-gray-600">{step.articles.length} articles</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Summary section if available */}
                {data.summary && (
                    <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <span>💡</span>
                            <span>Key Takeaways</span>
                        </h3>
                        <div className="text-gray-800">
                            {renderContent(data.summary)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

