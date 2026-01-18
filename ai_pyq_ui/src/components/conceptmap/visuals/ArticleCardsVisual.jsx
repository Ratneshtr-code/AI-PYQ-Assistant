// components/conceptmap/visuals/ArticleCardsVisual.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ArticleCardsVisual({ topicData }) {
    const [expandedArticle, setExpandedArticle] = useState(null);
    const [filterCategory, setFilterCategory] = useState("all");

    if (!topicData || !topicData.data) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">No data available</p>
            </div>
        );
    }

    const { data } = topicData;
    const articles = data.articles || [];
    const categories = data.categories || [];

    // Filter articles by category
    const filteredArticles = filterCategory === "all" 
        ? articles 
        : articles.filter(article => article.category === filterCategory);

    const handleArticleClick = (article) => {
        setExpandedArticle(expandedArticle?.id === article.id ? null : article);
    };

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
        if (typeof content !== 'string') return content;

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
                            <div key={idx} className="flex items-start gap-2 text-gray-800">
                                <span className="text-gray-600 mt-0.5">•</span>
                                <span className="flex-1">{parseMarkdownBold(line.substring(1).trim())}</span>
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

    const getCategoryColor = (categoryId) => {
        const category = categories.find(cat => cat.id === categoryId);
        return category?.color || '#6B7280';
    };

    const getCategoryLabel = (categoryId) => {
        const category = categories.find(cat => cat.id === categoryId);
        return category?.label || categoryId;
    };

    return (
        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-blue-50 overflow-auto">
            <div className="max-w-6xl mx-auto p-4 md:p-6">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">{topicData.title}</h2>
                    {topicData.description && (
                        <p className="text-gray-600 mb-4">{topicData.description}</p>
                    )}
                </div>

                {/* Category Filter */}
                {categories.length > 0 && (
                    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter by Category</h3>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setFilterCategory("all")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    filterCategory === "all"
                                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                All Articles ({articles.length})
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setFilterCategory(cat.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        filterCategory === cat.id
                                            ? "text-white shadow-md"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                    style={filterCategory === cat.id ? { backgroundColor: cat.color } : {}}
                                >
                                    {cat.label} ({articles.filter(a => a.category === cat.id).length})
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Articles Grid */}
                <div className="space-y-4">
                    {filteredArticles.map((article, idx) => {
                        const isExpanded = expandedArticle?.id === article.id;
                        const categoryColor = getCategoryColor(article.category);

                        return (
                            <motion.div
                                key={article.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-gray-200 overflow-hidden"
                            >
                                {/* Card Header - Always Visible */}
                                <button
                                    onClick={() => handleArticleClick(article)}
                                    className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        {/* Article Number Badge */}
                                        <div 
                                            className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0"
                                            style={{ backgroundColor: categoryColor }}
                                        >
                                            {article.shortLabel || article.number.replace('Article ', '')}
                                        </div>
                                        
                                        {/* Title and Category */}
                                        <div className="flex-1 text-left">
                                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                                                {article.number}
                                            </h3>
                                            <p className="text-base text-gray-700 font-medium mb-2">
                                                {article.title}
                                            </p>
                                            <span 
                                                className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white"
                                                style={{ backgroundColor: categoryColor }}
                                            >
                                                {getCategoryLabel(article.category)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Expand/Collapse Icon */}
                                    <div className="ml-4">
                                        <svg 
                                            className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>

                                {/* Expanded Content */}
                                <AnimatePresence>
                                    {isExpanded && article.content && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="border-t-2 border-gray-200"
                                        >
                                            <div className="p-6 space-y-4 bg-gradient-to-br from-gray-50 to-white">
                                                {Object.entries(article.content).map(([key, value]) => {
                                                    if (!value) return null;

                                                    const sectionConfig = {
                                                        provisions: { icon: '📋', label: 'Key Provisions', color: 'blue' },
                                                        scope: { icon: '🎯', label: 'Scope', color: 'indigo' },
                                                        significance: { icon: '⭐', label: 'Significance', color: 'yellow' },
                                                        exceptions: { icon: '⚠️', label: 'Exceptions & Limitations', color: 'orange' },
                                                        examTips: { icon: '💡', label: 'Exam Tips', color: 'green' },
                                                        keyCases: { icon: '⚖️', label: 'Important Case Law', color: 'purple' },
                                                        notes: { icon: '📌', label: 'Important Notes', color: 'pink' },
                                                        restrictions: { icon: '🚫', label: 'Restrictions', color: 'red' },
                                                        judicialExpansion: { icon: '⚖️', label: 'Judicial Expansion', color: 'purple' },
                                                        preventiveDetention: { icon: '🔒', label: 'Preventive Detention', color: 'red' },
                                                        implementation: { icon: '✅', label: 'Implementation', color: 'teal' },
                                                    };

                                                    const config = sectionConfig[key] || {
                                                        icon: '📌',
                                                        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
                                                        color: 'gray'
                                                    };

                                                    const colorClasses = {
                                                        blue: 'bg-blue-50 border-blue-300 text-blue-900',
                                                        indigo: 'bg-indigo-50 border-indigo-300 text-indigo-900',
                                                        yellow: 'bg-yellow-50 border-yellow-300 text-yellow-900',
                                                        orange: 'bg-orange-50 border-orange-300 text-orange-900',
                                                        green: 'bg-green-50 border-green-300 text-green-900',
                                                        purple: 'bg-purple-50 border-purple-300 text-purple-900',
                                                        pink: 'bg-pink-50 border-pink-300 text-pink-900',
                                                        red: 'bg-red-50 border-red-300 text-red-900',
                                                        teal: 'bg-teal-50 border-teal-300 text-teal-900',
                                                        gray: 'bg-gray-50 border-gray-300 text-gray-900',
                                                    };

                                                    return (
                                                        <div 
                                                            key={key} 
                                                            className={`p-4 rounded-lg border-2 ${colorClasses[config.color]}`}
                                                        >
                                                            <p className="text-sm font-bold mb-3 flex items-center gap-2">
                                                                <span className="text-lg">{config.icon}</span>
                                                                <span>{config.label}</span>
                                                            </p>
                                                            {Array.isArray(value) ? (
                                                                <ul className="space-y-2">
                                                                    {value.map((item, idx) => (
                                                                        <li key={idx} className="flex items-start gap-2">
                                                                            <span className="text-gray-600 mt-1 flex-shrink-0">•</span>
                                                                            <span className="flex-1">{renderContent(item)}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <div>{renderContent(value)}</div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}

                    {filteredArticles.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-lg border-2 border-gray-200">
                            <p className="text-gray-500 text-lg">No articles found in this category</p>
                        </div>
                    )}
                </div>

                {/* Summary Section */}
                {data.summary && (
                    <div className="mt-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200 shadow-md">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="text-2xl">💡</span>
                            <span>Key Takeaways - Fundamental Rights</span>
                        </h3>
                        <div className="text-gray-800 text-base leading-relaxed">
                            {renderContent(data.summary)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

