// components/conceptmap/visuals/ClockVisual.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ClockVisual({ topicData }) {
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [needleAngle, setNeedleAngle] = useState(0);

    if (!topicData || !topicData.data) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">No clock data available</p>
            </div>
        );
    }

    const { data } = topicData;
    const articles = data.articles || [];
    const categories = data.categories || [];
    const centerText = data.centerText || "Articles";

    const handleArticleClick = (article) => {
        setSelectedArticle(selectedArticle?.id === article.id ? null : article);
        setNeedleAngle(article.angle);
    };

    const handleNeedleClick = () => {
        setSelectedArticle(null);
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
                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">{topicData.title}</h2>
                    {topicData.description && (
                        <p className="text-gray-600 mb-4">{topicData.description}</p>
                    )}
                    {categories.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                            {categories.map((cat) => (
                                <div key={cat.id} className="flex items-center gap-2">
                                    <div 
                                        className="w-4 h-4 rounded-full" 
                                        style={{ backgroundColor: cat.color }}
                                    ></div>
                                    <span className="text-sm text-gray-700">{cat.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Main Layout: Clock + Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Clock Container */}
                    <div className="flex flex-col items-center">
                        <div className="relative w-full max-w-[500px] aspect-square overflow-visible p-4">
                            {/* Clock Circle Background */}
                            <div className="absolute inset-4 rounded-full bg-white shadow-2xl border-8 border-gray-200"></div>
                            
                            {/* Center Circle */}
                            <div className="absolute inset-4 flex items-center justify-center">
                                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg flex items-center justify-center z-20">
                                    <span className="text-white font-bold text-center text-sm leading-tight px-3">
                                        {centerText}
                                    </span>
                                </div>
                            </div>

                            {/* Needle */}
                            <motion.div
                                className="absolute inset-4 flex items-center justify-center pointer-events-none z-10"
                                animate={{ rotate: needleAngle }}
                                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                            >
                                <div className="w-1 h-1/2 origin-bottom">
                                    <div className="w-full h-full bg-gradient-to-t from-red-600 to-red-400 rounded-full shadow-lg relative">
                                        {/* Arrow tip */}
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] border-b-red-600"></div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Articles around the clock */}
                            {articles.map((article, idx) => {
                                const angle = article.angle;
                                const radian = (angle - 90) * (Math.PI / 180);
                                const radius = 42; // percentage from center within the inset area
                                const x = 50 + radius * Math.cos(radian);
                                const y = 50 + radius * Math.sin(radian);
                                const isSelected = selectedArticle?.id === article.id;

                                return (
                                    <div
                                        key={article.id}
                                        className="absolute z-30"
                                        style={{
                                            left: `calc(${x}% + 1rem)`,
                                            top: `calc(${y}% + 1rem)`,
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                    >
                                        <motion.button
                                            onClick={() => handleArticleClick(article)}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="relative"
                                            style={{ transformOrigin: 'center' }}
                                        >
                                            <div 
                                                className={`
                                                    w-10 h-10 rounded-full flex items-center justify-center
                                                    font-bold text-[9px] shadow-md border-2 transition-all cursor-pointer
                                                    ${isSelected 
                                                        ? 'border-yellow-400 ring-2 ring-yellow-200 scale-110' 
                                                        : 'border-white hover:border-gray-300 hover:shadow-lg'
                                                    }
                                                `}
                                                style={{ 
                                                    backgroundColor: article.color || '#6B7280',
                                                    color: 'white'
                                                }}
                                            >
                                                <span className="leading-none text-center">
                                                    {article.shortLabel || article.number.replace('Article ', '')}
                                                </span>
                                            </div>
                                        </motion.button>
                                    </div>
                                );
                            })}

                            {/* Center button to reset */}
                            <button
                                onClick={handleNeedleClick}
                                className="absolute inset-4 flex items-center justify-center z-25 pointer-events-none"
                            >
                                <div className="w-5 h-5 rounded-full bg-gray-800 shadow-md pointer-events-auto cursor-pointer hover:bg-gray-700 transition-colors"></div>
                            </button>
                        </div>

                        {/* Mobile instruction */}
                        <p className="mt-4 text-sm text-gray-600 text-center max-w-md">
                            Click on any article around the clock to view detailed smart notes
                        </p>
                    </div>

                    {/* Details Panel */}
                    <div className="flex flex-col">
                        <AnimatePresence mode="wait">
                            {selectedArticle ? (
                                <motion.div
                                    key={selectedArticle.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="bg-white rounded-xl shadow-xl border-2 border-gray-200 p-6 overflow-y-auto max-h-[600px]"
                                >
                                    {/* Article Header */}
                                    <div className="mb-4 pb-4 border-b-2 border-gray-200">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
                                                    style={{ backgroundColor: selectedArticle.color }}
                                                >
                                                    {selectedArticle.shortLabel || selectedArticle.number.replace('Article ', '')}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900">
                                                        {selectedArticle.number}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        {selectedArticle.category && categories.find(c => c.id === selectedArticle.category)?.label}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedArticle(null)}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <h4 className="text-lg font-semibold text-gray-800">
                                            {selectedArticle.title}
                                        </h4>
                                    </div>

                                    {/* Article Content */}
                                    <div className="space-y-4">
                                        {selectedArticle.content && Object.entries(selectedArticle.content).map(([key, value]) => {
                                            if (!value) return null;

                                            const sectionConfig = {
                                                provisions: { icon: '📋', label: 'Key Provisions', color: 'blue' },
                                                exceptions: { icon: '⚠️', label: 'Exceptions & Limitations', color: 'orange' },
                                                keyCase: { icon: '⚖️', label: 'Important Case Law', color: 'purple' },
                                                keyCases: { icon: '⚖️', label: 'Important Cases', color: 'purple' },
                                                examTips: { icon: '💡', label: 'Exam Tips', color: 'green' },
                                                scope: { icon: '🎯', label: 'Scope', color: 'indigo' },
                                                features: { icon: '✨', label: 'Key Features', color: 'cyan' },
                                                significance: { icon: '⭐', label: 'Significance', color: 'yellow' },
                                                amendments: { icon: '📝', label: 'Amendments', color: 'red' },
                                                notes: { icon: '📌', label: 'Important Notes', color: 'pink' },
                                                mnemonic: { icon: '🧠', label: 'Memory Trick', color: 'teal' },
                                            };

                                            const config = sectionConfig[key] || {
                                                icon: '📌',
                                                label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
                                                color: 'gray'
                                            };

                                            const colorClasses = {
                                                blue: 'bg-blue-50 border-blue-200 text-blue-800',
                                                orange: 'bg-orange-50 border-orange-200 text-orange-800',
                                                purple: 'bg-purple-50 border-purple-200 text-purple-800',
                                                green: 'bg-green-50 border-green-200 text-green-800',
                                                indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
                                                cyan: 'bg-cyan-50 border-cyan-200 text-cyan-800',
                                                yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                                                red: 'bg-red-50 border-red-200 text-red-800',
                                                pink: 'bg-pink-50 border-pink-200 text-pink-800',
                                                teal: 'bg-teal-50 border-teal-200 text-teal-800',
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
                                        <div className="text-6xl mb-4">⏰</div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                                            Select an Article
                                        </h3>
                                        <p className="text-gray-600">
                                            Click on any article number around the clock to view comprehensive smart notes with exam-focused content
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Summary section if available */}
                {data.summary && (
                    <div className="mt-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200">
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

