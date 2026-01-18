// components/conceptmap/visuals/SplitPanelVisual.jsx
import { useState } from "react";
import { motion } from "framer-motion";

export default function SplitPanelVisual({ topicData }) {
    const [selectedArticle, setSelectedArticle] = useState(null);

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

    // Set default selected article if not set
    if (!selectedArticle && articles.length > 0) {
        setSelectedArticle(articles.find(a => a.id === "art-14") || articles[0]);
    }

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

    const renderContent = (content) => {
        if (!content) return null;
        if (typeof content !== 'string') return content;

        const lines = content.split('\n');
        return (
            <div className="space-y-2">
                {lines.map((line, idx) => {
                    const trimmedLine = line.trim();
                    if (trimmedLine === '') {
                        return <div key={idx} className="h-1"></div>;
                    }
                    if (trimmedLine.startsWith('•')) {
                        return (
                            <div key={idx} className="flex items-start gap-2 text-gray-700 text-base">
                                <span className="text-gray-500 mt-0.5 flex-shrink-0">•</span>
                                <span className="flex-1">{parseMarkdownBold(line.substring(1).trim())}</span>
                            </div>
                        );
                    }
                    return (
                        <div key={idx} className="text-gray-700 text-base">
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

    // Group articles by category for better organization
    const groupedArticles = categories.reduce((acc, category) => {
        const categoryArticles = articles.filter(a => a.category === category.id);
        if (categoryArticles.length > 0) {
            acc.push({
                category: category,
                articles: categoryArticles
            });
        }
        return acc;
    }, []);

    // Section configuration for content boxes
    const sectionConfig = {
        provisions: { icon: '📋', label: 'Key Provisions', color: 'from-blue-50 to-blue-100', borderColor: 'border-blue-300', textColor: 'text-blue-900' },
        scope: { icon: '🎯', label: 'Scope', color: 'from-indigo-50 to-indigo-100', borderColor: 'border-indigo-300', textColor: 'text-indigo-900' },
        significance: { icon: '⭐', label: 'Significance', color: 'from-yellow-50 to-yellow-100', borderColor: 'border-yellow-300', textColor: 'text-yellow-900' },
        exceptions: { icon: '⚠️', label: 'Exceptions & Limitations', color: 'from-orange-50 to-orange-100', borderColor: 'border-orange-300', textColor: 'text-orange-900' },
        examTips: { icon: '💡', label: 'Exam Tips', color: 'from-green-50 to-green-100', borderColor: 'border-green-300', textColor: 'text-green-900' },
        keyCases: { icon: '⚖️', label: 'Important Case Law', color: 'from-purple-50 to-purple-100', borderColor: 'border-purple-300', textColor: 'text-purple-900' },
        notes: { icon: '📌', label: 'Important Notes', color: 'from-pink-50 to-pink-100', borderColor: 'border-pink-300', textColor: 'text-pink-900' },
        restrictions: { icon: '🚫', label: 'Restrictions', color: 'from-red-50 to-red-100', borderColor: 'border-red-300', textColor: 'text-red-900' },
        judicialExpansion: { icon: '⚖️', label: 'Judicial Expansion', color: 'from-purple-50 to-purple-100', borderColor: 'border-purple-300', textColor: 'text-purple-900' },
        preventiveDetention: { icon: '🔒', label: 'Preventive Detention', color: 'from-red-50 to-red-100', borderColor: 'border-red-300', textColor: 'text-red-900' },
        implementation: { icon: '✅', label: 'Implementation', color: 'from-teal-50 to-teal-100', borderColor: 'border-teal-300', textColor: 'text-teal-900' },
    };

    const renderContentBox = (key, value, config) => {
        if (!value) return null;

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`bg-gradient-to-br ${config.color} border-2 ${config.borderColor} rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}
            >
                <h4 className={`text-base font-bold mb-3 flex items-center gap-2 ${config.textColor}`}>
                    <span className="text-xl">{config.icon}</span>
                    <span>{config.label}</span>
                </h4>
                {Array.isArray(value) ? (
                    <ul className="space-y-2">
                        {value.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <span className="text-gray-500 mt-0.5 flex-shrink-0 text-base">•</span>
                                <span className="flex-1 text-base leading-relaxed">{renderContent(item)}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-base leading-relaxed">{renderContent(value)}</div>
                )}
            </motion.div>
        );
    };

    // Organize content sections into grid layout
    const getContentLayout = (content) => {
        if (!content) return { fullWidth: [], grid: [] };

        const fullWidthSections = ['provisions', 'judicialExpansion', 'significance', 'exceptions'];
        const fullWidth = [];
        const grid = [];

        Object.entries(content).forEach(([key, value]) => {
            if (!value) return;
            
            const config = sectionConfig[key] || {
                icon: '📌',
                label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
                color: 'from-gray-50 to-gray-100',
                borderColor: 'border-gray-300',
                textColor: 'text-gray-900'
            };

            const box = { key, value, config };

            if (fullWidthSections.includes(key)) {
                fullWidth.push(box);
            } else {
                grid.push(box);
            }
        });

        return { fullWidth, grid };
    };

    const contentLayout = selectedArticle ? getContentLayout(selectedArticle.content) : { fullWidth: [], grid: [] };

    return (
        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-blue-50 overflow-hidden flex flex-col">
            {/* Compact Header */}
            <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-2.5 shadow-sm">
                <h2 className="text-lg md:text-xl font-bold text-gray-800">{topicData.title}</h2>
            </div>

            {/* Main Content Area - Split Layout */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* LEFT PANEL - Article List (20% on desktop, full width on mobile) */}
                <div className="lg:w-1/5 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto">
                    {/* Mobile: Horizontal Scroll Pills */}
                    <div className="lg:hidden flex gap-2 p-3 overflow-x-auto">
                        {articles.map((article) => (
                            <button
                                key={article.id}
                                onClick={() => setSelectedArticle(article)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full text-base font-semibold transition-all ${
                                    selectedArticle?.id === article.id
                                        ? 'text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                style={selectedArticle?.id === article.id ? { backgroundColor: getCategoryColor(article.category) } : {}}
                            >
                                {article.shortLabel || article.number.replace('Article ', '')}
                            </button>
                        ))}
                    </div>

                    {/* Desktop: Grouped Article List */}
                    <div className="hidden lg:block p-2 space-y-2">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">Articles</h3>
                        {groupedArticles.map((group) => (
                            <div key={group.category.id} className="space-y-0.5">
                                <div 
                                    className="text-xs font-semibold px-2 py-0.5 rounded"
                                    style={{ 
                                        backgroundColor: `${group.category.color}20`,
                                        color: group.category.color 
                                    }}
                                >
                                    {group.category.label}
                                </div>
                                {group.articles.map((article) => (
                                    <button
                                        key={article.id}
                                        onClick={() => setSelectedArticle(article)}
                                        className={`w-full text-left px-2 py-1.5 rounded-md text-sm font-medium transition-all ${
                                            selectedArticle?.id === article.id
                                                ? 'text-white shadow-sm'
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                        style={selectedArticle?.id === article.id ? { 
                                            backgroundColor: getCategoryColor(article.category),
                                        } : {}}
                                    >
                                        <div className="font-bold">
                                            {article.shortLabel ? `Art ${article.shortLabel}` : article.number.replace('Article ', 'Art ')}
                                        </div>
                                        <div className={`text-xs mt-0.5 leading-snug ${selectedArticle?.id === article.id ? 'text-white/90' : 'text-gray-500'}`}>
                                            {article.title}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT PANEL - Content Boxes (80% on desktop, full width on mobile) */}
                <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
                    {selectedArticle ? (
                        <>
                            {/* Compact Article Header */}
                            <div className="bg-white rounded-lg shadow-sm border-2 p-3" style={{ borderColor: getCategoryColor(selectedArticle.category) }}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div 
                                        className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0"
                                        style={{ backgroundColor: getCategoryColor(selectedArticle.category) }}
                                    >
                                        {selectedArticle.shortLabel || selectedArticle.number.replace('Article ', '')}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{selectedArticle.number}</h3>
                                        <p className="text-base text-gray-700 font-medium">{selectedArticle.title}</p>
                                    </div>
                                </div>
                                <span 
                                    className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                                    style={{ backgroundColor: getCategoryColor(selectedArticle.category) }}
                                >
                                    {getCategoryLabel(selectedArticle.category)}
                                </span>
                            </div>

                            {/* Full-Width Content Boxes */}
                            {contentLayout.fullWidth.map(({ key, value, config }) => (
                                <div key={key}>
                                    {renderContentBox(key, value, config)}
                                </div>
                            ))}

                            {/* Grid Layout for Smaller Boxes (2 columns on desktop, 1 on mobile) */}
                            {contentLayout.grid.length > 0 && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {contentLayout.grid.map(({ key, value, config }) => (
                                        <div key={key}>
                                            {renderContentBox(key, value, config)}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <p className="text-xl font-semibold mb-2">Select an article to view details</p>
                                <p className="text-sm">Choose from the list on the left</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

