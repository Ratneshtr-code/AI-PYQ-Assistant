// components/conceptmap/visuals/FlowchartVisual.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FlowchartVisual({ topicData }) {
    const [selectedNode, setSelectedNode] = useState(null);
    const [expandedCategory, setExpandedCategory] = useState(null);

    if (!topicData || !topicData.data) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">No flowchart data available</p>
            </div>
        );
    }

    const { data } = topicData;
    
    // Check if this is the old format (categories) or new format (mainFlow, objectives, stages, etc.)
    const isOldFormat = data.categories && Array.isArray(data.categories);
    const categories = isOldFormat ? data.categories : [];
    const connections = data.connections || [];
    
    // For new format, convert sections to categories
    const newFormatSections = [];
    if (!isOldFormat) {
        // Handle direct stages array (like morley-minto-reforms-1909.json)
        if (data.stages && Array.isArray(data.stages)) {
            // Group stages by type or create single category
            const stagesByType = {};
            data.stages.forEach(stage => {
                const type = stage.type || 'general';
                if (!stagesByType[type]) {
                    stagesByType[type] = [];
                }
                stagesByType[type].push(stage);
            });
            
            // Create categories from grouped stages
            Object.entries(stagesByType).forEach(([type, stages]) => {
                const typeConfig = {
                    background: { label: 'Background', color: '#3B82F6', icon: '📋' },
                    provision: { label: 'Main Provisions', color: '#10B981', icon: '📜' },
                    positive: { label: 'Positive Aspects', color: '#F59E0B', icon: '✓' },
                    negative: { label: 'Negative Aspects', color: '#EF4444', icon: '⚠️' },
                    general: { label: 'Key Points', color: '#8B5CF6', icon: '📌' }
                };
                
                const config = typeConfig[type] || typeConfig.general;
                
                newFormatSections.push({
                    id: `${type}-stages`,
                    label: config.label,
                    color: config.color,
                    icon: config.icon,
                    description: `${stages.length} items`,
                    items: stages.map(stage => ({
                        id: stage.id,
                        label: stage.label,
                        subtitle: stage.description,
                        type: stage.type,
                        icon: stage.icon,
                        details: stage.details
                    }))
                });
            });
        }
        
        // Add mainFlow section
        if (data.mainFlow) {
            if (Array.isArray(data.mainFlow)) {
                // mainFlow is an array of stages
                newFormatSections.push({
                    id: 'mainFlow',
                    label: data.mainFlow.title || 'Main Flow',
                    color: '#3B82F6',
                    icon: '📊',
                    description: 'Key stages and events',
                    items: data.mainFlow.map(stage => ({
                        id: stage.id,
                        label: stage.label,
                        subtitle: stage.description,
                        type: stage.type || 'event',
                        icon: stage.icon,
                        details: stage.details
                    }))
                });
            } else if (data.mainFlow.stages) {
                // mainFlow has stages property
                newFormatSections.push({
                    id: 'mainFlow',
                    label: data.mainFlow.title || 'Foundation & Formation',
                    color: '#3B82F6',
                    icon: '📊',
                    description: 'Key stages and events',
                    items: data.mainFlow.stages.map(stage => ({
                        id: stage.id,
                        label: stage.label,
                        subtitle: stage.description,
                        type: stage.type || 'foundation',
                        icon: stage.icon,
                        details: stage.details
                    }))
                });
            }
        }
        
        // Add objectives section
        if (data.objectives) {
            newFormatSections.push({
                id: 'objectives',
                label: data.objectives.title || 'Aims & Objectives',
                color: '#10B981',
                icon: '🎯',
                description: 'Goals and purposes',
                items: (data.objectives.primaryAims || data.objectives.items || []).map(obj => ({
                    id: obj.id,
                    label: obj.label,
                    subtitle: obj.description,
                    type: 'objective',
                    icon: obj.icon,
                    details: {
                        points: obj.details,
                        significance: obj.significance
                    }
                }))
            });
        }
        
        // Add earlyPhase section
        if (data.earlyPhase) {
            const earlyPhaseItems = [];
            
            // Add characteristics
            if (data.earlyPhase.characteristics) {
                Object.entries(data.earlyPhase.characteristics).forEach(([key, value]) => {
                    earlyPhaseItems.push({
                        id: key,
                        label: value.label || key,
                        type: 'characteristic',
                        details: value
                    });
                });
            }
            
            // Add major demands as subcategories
            const subcategories = data.earlyPhase.majorDemands ? data.earlyPhase.majorDemands.map(demand => ({
                label: demand.category + ' Demands',
                items: demand.demands
            })) : [];
            
            newFormatSections.push({
                id: 'earlyPhase',
                label: data.earlyPhase.title || 'Early Phase',
                color: '#F59E0B',
                icon: '📅',
                description: 'Methods and activities in early phase',
                items: earlyPhaseItems,
                subcategories: subcategories,
                extraInfo: {
                    achievements: data.earlyPhase.achievements,
                    limitations: data.earlyPhase.limitations
                }
            });
        }
        
        // Add exam tips section
        if (data.examTips) {
            const examTipsItems = [];
            
            // Add Must Remember items
            if (data.examTips.mustRemember && data.examTips.mustRemember.length > 0) {
                data.examTips.mustRemember.forEach((item, idx) => {
                    examTipsItems.push({
                        id: `must-remember-${idx}`,
                        label: item,
                        type: 'must-remember'
                    });
                });
            }
            
            // Add Exam Questions items
            if (data.examTips.examQuestions && data.examTips.examQuestions.length > 0) {
                data.examTips.examQuestions.forEach((item, idx) => {
                    examTipsItems.push({
                        id: `exam-question-${idx}`,
                        label: item,
                        type: 'exam-question'
                    });
                });
            }
            
            // Add Balanced Answer item
            if (data.examTips.balancedAnswer) {
                examTipsItems.push({
                    id: 'balanced-answer',
                    label: 'Balanced Answer Approach',
                    type: 'balanced-answer',
                    details: { description: data.examTips.balancedAnswer }
                });
            }
            
            // Add Common Confusions if present (for backward compatibility)
            if (data.examTips.commonConfusions && data.examTips.commonConfusions.length > 0) {
                data.examTips.commonConfusions.forEach((item, idx) => {
                    examTipsItems.push({
                        id: `common-confusion-${idx}`,
                        label: item,
                        type: 'common-confusion'
                    });
                });
            }
            
            if (examTipsItems.length > 0) {
                newFormatSections.push({
                    id: 'examTips',
                    label: 'Exam Tips',
                    color: '#EC4899',
                    icon: '💡',
                    description: 'Must remember for exams',
                    items: examTipsItems
                });
            }
        }
        
        // Add response section (for partition type topics)
        if (data.response) {
            newFormatSections.push({
                id: 'response',
                label: data.response.title || 'Indian Response',
                color: '#EF4444',
                icon: '⚔️',
                description: 'Reactions and movements',
                items: (data.response.items || []).map(item => ({
                    id: item.id,
                    label: item.label,
                    subtitle: item.description,
                    type: item.type || 'reaction',
                    icon: item.icon,
                    details: item.details
                }))
            });
        }
        
        // Add impact section
        if (data.impact) {
            newFormatSections.push({
                id: 'impact',
                label: data.impact.title || 'Impact & Consequences',
                color: '#06B6D4',
                icon: '💥',
                description: 'Effects and outcomes',
                items: (data.impact.items || []).map(item => ({
                    id: item.id,
                    label: item.label,
                    subtitle: item.description,
                    type: item.type || 'impact',
                    icon: item.icon,
                    details: item.details
                }))
            });
        }
        
        // Add assessment section (positive/negative analysis)
        if (data.assessment) {
            if (data.assessment.positive && data.assessment.positive.length > 0) {
                newFormatSections.push({
                    id: 'assessment-positive',
                    label: 'Positive Aspects',
                    color: '#10B981',
                    icon: '✓',
                    description: data.assessment.title || 'Positive analysis',
                    items: data.assessment.positive.map((item, idx) => ({
                        id: `positive-${idx}`,
                        label: item.aspect || item.label || `Point ${idx + 1}`,
                        subtitle: item.description,
                        type: 'positive',
                        details: item
                    }))
                });
            }
            
            if (data.assessment.negative && data.assessment.negative.length > 0) {
                newFormatSections.push({
                    id: 'assessment-negative',
                    label: 'Negative Aspects',
                    color: '#EF4444',
                    icon: '⚠️',
                    description: 'Critical analysis',
                    items: data.assessment.negative.map((item, idx) => ({
                        id: `negative-${idx}`,
                        label: item.aspect || item.label || `Point ${idx + 1}`,
                        subtitle: item.description,
                        type: 'negative',
                        details: item
                    }))
                });
            }
        }
        
        // Add reactions section
        if (data.reactions) {
            const reactionItems = [];
            Object.entries(data.reactions).forEach(([key, value]) => {
                if (key === 'title') return;
                if (typeof value === 'object' && value !== null) {
                    reactionItems.push({
                        id: `reaction-${key}`,
                        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
                        subtitle: value.reaction || '',
                        type: 'reaction',
                        details: value
                    });
                }
            });
            
            if (reactionItems.length > 0) {
                newFormatSections.push({
                    id: 'reactions',
                    label: data.reactions.title || 'Reactions',
                    color: '#8B5CF6',
                    icon: '💬',
                    description: 'Different perspectives',
                    items: reactionItems
                });
            }
        }
        
        // Add significance section  
        if (data.significance) {
            const sigItems = [];
            Object.entries(data.significance).forEach(([key, value]) => {
                if (key === 'title') return;
                if (Array.isArray(value)) {
                    sigItems.push({
                        id: `sig-${key}`,
                        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
                        type: 'significance',
                        details: { points: value }
                    });
                }
            });
            
            if (sigItems.length > 0) {
                newFormatSections.push({
                    id: 'significance',
                    label: data.significance.title || 'Historical Significance',
                    color: '#F59E0B',
                    icon: '⭐',
                    description: 'Why this matters',
                    items: sigItems
                });
            }
        }
    }
    
    // Use either old categories or new format sections
    const displayCategories = isOldFormat ? categories : newFormatSections;

    const getCategoryColor = (categoryId) => {
        const category = displayCategories.find(c => c.id === categoryId);
        return category?.color || "#6B7280";
    };

    const getNodeColor = (type) => {
        const colors = {
            cause: "from-red-400 to-red-600",
            effect: "from-green-400 to-green-600",
            intermediate: "from-blue-400 to-blue-600",
            event: "from-purple-400 to-purple-600",
        };
        return colors[type] || "from-gray-400 to-gray-600";
    };

    const getBorderColor = (type) => {
        const colors = {
            cause: "border-red-600",
            effect: "border-green-600",
            intermediate: "border-blue-600",
            event: "border-purple-600",
        };
        return colors[type] || "border-gray-600";
    };

    return (
        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-blue-50 overflow-auto">
            <div className="p-6 md:p-8">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">{topicData.title}</h2>
                    {topicData.description && (
                        <p className="text-gray-600">{topicData.description}</p>
                    )}
                </div>

                {/* Legend */}
                {data.legend && (
                    <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Legend</h3>
                        <div className="flex flex-wrap gap-4">
                            {data.legend.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded ${getNodeColor(item.type)} bg-gradient-to-br`}></div>
                                    <span className="text-sm text-gray-600">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Flowchart by Categories */}
                <div className="space-y-8">
                    {displayCategories.map((category, catIdx) => (
                        <motion.div
                            key={category.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: catIdx * 0.1 }}
                            className="bg-white rounded-lg shadow-lg border-2 overflow-hidden"
                            style={{ borderColor: category.color }}
                        >
                            {/* Category Header */}
                            <div
                                className="p-4 cursor-pointer hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: category.color + "20" }}
                                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {category.icon && <span className="text-2xl">{category.icon}</span>}
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800">{category.label}</h3>
                                            {category.description && (
                                                <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-600">{category.items?.length || 0} items</span>
                                        <svg
                                            className={`w-5 h-5 text-gray-600 transition-transform ${
                                                expandedCategory === category.id ? "rotate-180" : ""
                                            }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Category Items */}
                            <AnimatePresence>
                                {(expandedCategory === category.id || expandedCategory === null) && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="p-6"
                                    >
                                        {/* Special rendering for Exam Tips */}
                                        {category.id === 'examTips' ? (
                                            <div className="space-y-6">
                                                {/* Group items by type */}
                                                {(() => {
                                                    const mustRememberItems = category.items?.filter(item => item.type === 'must-remember') || [];
                                                    const examQuestionItems = category.items?.filter(item => item.type === 'exam-question') || [];
                                                    const balancedAnswerItems = category.items?.filter(item => item.type === 'balanced-answer') || [];
                                                    const commonConfusionItems = category.items?.filter(item => item.type === 'common-confusion') || [];
                                                    
                                                    return (
                                                        <>
                                                            {mustRememberItems.length > 0 && (
                                                                <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-5 rounded-lg border-l-4 border-pink-500">
                                                                    <h4 className="text-lg font-bold text-pink-700 mb-3 flex items-center gap-2">
                                                                        <span>📌</span>
                                                                        Must Remember
                                                                    </h4>
                                                                    <ul className="space-y-2">
                                                                        {mustRememberItems.map((item, idx) => (
                                                                            <li key={idx} className="flex items-start gap-2 text-gray-800">
                                                                                <span className="text-pink-500 font-bold mt-1">•</span>
                                                                                <span className="flex-1">{item.label}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            
                                                            {examQuestionItems.length > 0 && (
                                                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border-l-4 border-blue-500">
                                                                    <h4 className="text-lg font-bold text-blue-700 mb-3 flex items-center gap-2">
                                                                        <span>❓</span>
                                                                        Common Exam Questions
                                                                    </h4>
                                                                    <ul className="space-y-2">
                                                                        {examQuestionItems.map((item, idx) => (
                                                                            <li key={idx} className="flex items-start gap-2 text-gray-800">
                                                                                <span className="text-blue-500 font-bold mt-1">•</span>
                                                                                <span className="flex-1">{item.label}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            
                                                            {balancedAnswerItems.length > 0 && (
                                                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-lg border-l-4 border-green-500">
                                                                    <h4 className="text-lg font-bold text-green-700 mb-3 flex items-center gap-2">
                                                                        <span>⚖️</span>
                                                                        Balanced Answer Approach
                                                                    </h4>
                                                                    {balancedAnswerItems.map((item, idx) => (
                                                                        <p key={idx} className="text-gray-800 leading-relaxed">
                                                                            {item.details?.description || item.label}
                                                                        </p>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            
                                                            {commonConfusionItems.length > 0 && (
                                                                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-5 rounded-lg border-l-4 border-yellow-500">
                                                                    <h4 className="text-lg font-bold text-yellow-700 mb-3 flex items-center gap-2">
                                                                        <span>⚠️</span>
                                                                        Common Confusions to Avoid
                                                                    </h4>
                                                                    <ul className="space-y-2">
                                                                        {commonConfusionItems.map((item, idx) => (
                                                                            <li key={idx} className="flex items-start gap-2 text-gray-800">
                                                                                <span className="text-yellow-600 font-bold mt-1">•</span>
                                                                                <span className="flex-1">{item.label}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        ) : category.id === 'assessment' ? (
                                            /* Special rendering for Assessment sections (Positive/Negative Aspects) */
                                            <div className="space-y-6">
                                                {(() => {
                                                    const positiveItems = category.items?.filter(item => item.type === 'positive') || [];
                                                    const negativeItems = category.items?.filter(item => item.type === 'negative') || [];
                                                    
                                                    return (
                                                        <>
                                                            {positiveItems.length > 0 && (
                                                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border-l-4 border-green-500">
                                                                    <h4 className="text-xl font-bold text-green-700 mb-5 flex items-center gap-2">
                                                                        <span>✓</span>
                                                                        Positive Aspects
                                                                    </h4>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                                                        {positiveItems.map((item, idx) => (
                                                                            <div key={idx} className="space-y-1">
                                                                                <h5 className="font-bold text-green-800 flex items-start gap-2 text-base">
                                                                                    <span className="text-green-500 mt-0.5">•</span>
                                                                                    <span>{item.label}</span>
                                                                                </h5>
                                                                                {item.subtitle && (
                                                                                    <p className="text-gray-700 text-sm ml-4 mb-1">{item.subtitle}</p>
                                                                                )}
                                                                                {item.details && (
                                                                                    <div className="text-sm text-gray-700 space-y-0.5 ml-4">
                                                                                        {Object.entries(item.details).map(([key, value]) => {
                                                                                            if (typeof value === 'string' && !['label', 'description', 'subtitle'].includes(key)) {
                                                                                                return (
                                                                                                    <p key={key} className="leading-relaxed">
                                                                                                        <span className="font-medium text-green-700 capitalize">
                                                                                                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                                                                                                        </span>{' '}
                                                                                                        {value}
                                                                                                    </p>
                                                                                                );
                                                                                            }
                                                                                            return null;
                                                                                        })}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            {negativeItems.length > 0 && (
                                                                <div className="bg-gradient-to-r from-red-50 to-pink-50 p-6 rounded-lg border-l-4 border-red-500">
                                                                    <h4 className="text-xl font-bold text-red-700 mb-5 flex items-center gap-2">
                                                                        <span>⚠</span>
                                                                        Negative Aspects
                                                                    </h4>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                                                        {negativeItems.map((item, idx) => (
                                                                            <div key={idx} className="space-y-1">
                                                                                <h5 className="font-bold text-red-800 flex items-start gap-2 text-base">
                                                                                    <span className="text-red-500 mt-0.5">•</span>
                                                                                    <span>{item.label}</span>
                                                                                </h5>
                                                                                {item.subtitle && (
                                                                                    <p className="text-gray-700 text-sm ml-4 mb-1">{item.subtitle}</p>
                                                                                )}
                                                                                {item.details && (
                                                                                    <div className="text-sm text-gray-700 space-y-0.5 ml-4">
                                                                                        {Object.entries(item.details).map(([key, value]) => {
                                                                                            if (typeof value === 'string' && !['label', 'description', 'subtitle'].includes(key)) {
                                                                                                return (
                                                                                                    <p key={key} className="leading-relaxed">
                                                                                                        <span className="font-medium text-red-700 capitalize">
                                                                                                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                                                                                                        </span>{' '}
                                                                                                        {value}
                                                                                                    </p>
                                                                                                );
                                                                                            }
                                                                                            return null;
                                                                                        })}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        ) : category.id === 'reactions' ? (
                                            /* Special rendering for Reactions section */
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {category.items?.map((item, idx) => {
                                                        const colorSchemes = {
                                                            moderate: { bg: 'from-blue-50 to-indigo-50', border: 'border-blue-500', text: 'text-blue-800', icon: '🕊️' },
                                                            extremist: { bg: 'from-orange-50 to-red-50', border: 'border-red-500', text: 'text-red-800', icon: '⚡' },
                                                            league: { bg: 'from-green-50 to-emerald-50', border: 'border-green-500', text: 'text-green-800', icon: '🌙' },
                                                            congress: { bg: 'from-purple-50 to-pink-50', border: 'border-purple-500', text: 'text-purple-800', icon: '🇮🇳' }
                                                        };
                                                        
                                                        const scheme = colorSchemes[item.type] || colorSchemes.moderate;
                                                        
                                                        return (
                                                            <div key={idx} className={`bg-gradient-to-r ${scheme.bg} p-5 rounded-lg border-l-4 ${scheme.border}`}>
                                                                <h5 className={`font-bold ${scheme.text} mb-3 flex items-center gap-2 text-lg`}>
                                                                    <span>{scheme.icon}</span>
                                                                    <span>{item.label}</span>
                                                                </h5>
                                                                {item.subtitle && (
                                                                    <p className="text-gray-700 mb-3 font-medium">{item.subtitle}</p>
                                                                )}
                                                                {item.details && (
                                                                    <div className="space-y-2 text-sm text-gray-700">
                                                                        {Object.entries(item.details).map(([key, value]) => (
                                                                            <p key={key} className="leading-relaxed">
                                                                                <span className="font-semibold capitalize">
                                                                                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                                                                                </span>{' '}
                                                                                {value}
                                                                            </p>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : category.id === 'significance' ? (
                                            /* Special rendering for Significance section */
                                            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-6 rounded-lg border-l-4 border-amber-500">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {category.items?.map((item, idx) => (
                                                        <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-amber-200">
                                                            <h5 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                                                                <span className="text-amber-500">⭐</span>
                                                                <span>{item.label}</span>
                                                            </h5>
                                                            {item.details?.points && (
                                                                <ul className="space-y-2">
                                                                    {item.details.points.map((point, pidx) => (
                                                                        <li key={pidx} className="flex items-start gap-2 text-sm text-gray-700">
                                                                            <span className="text-amber-500 font-bold mt-0.5">•</span>
                                                                            <span className="flex-1">{point}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            /* Regular flowchart rendering for other categories */
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {category.items?.map((item, idx) => (
                                                <motion.div
                                                    key={item.id || idx}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    whileHover={{ scale: 1.05 }}
                                                    className={`relative p-4 rounded-lg shadow-md cursor-pointer border-2 ${getBorderColor(
                                                        item.type || "intermediate"
                                                    )}`}
                                                    onClick={() => setSelectedNode(selectedNode === item.id ? null : item.id)}
                                                    style={{
                                                        background: `linear-gradient(135deg, ${category.color}15 0%, ${category.color}05 100%)`,
                                                    }}
                                                >
                                                    {/* Node Type Badge */}
                                                    {item.type && (
                                                        <div
                                                            className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getNodeColor(
                                                                item.type
                                                            )} shadow-md`}
                                                        >
                                                            {item.type}
                                                        </div>
                                                    )}

                                                    {/* Item Content */}
                                                    <div className="flex items-start gap-2">
                                                        {item.icon && <span className="text-xl">{item.icon}</span>}
                                                        <div className="flex-1">
                                                            <h4 className="font-bold text-gray-800 text-sm leading-tight">
                                                                {item.label || item}
                                                            </h4>
                                                            {item.subtitle && (
                                                                <p className="text-xs text-gray-600 mt-1">{item.subtitle}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Expanded Details */}
                                                    <AnimatePresence>
                                                        {selectedNode === item.id && item.details && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: "auto" }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="mt-3 pt-3 border-t border-gray-300"
                                                            >
                                                                {typeof item.details === "string" ? (
                                                                    <p className="text-xs text-gray-700">{item.details}</p>
                                                                ) : (
                                                                    <div className="space-y-2">
                                                                        {/* Render all detail fields dynamically */}
                                                                        {Object.entries(item.details).map(([key, value]) => {
                                                                            // Skip null/undefined values
                                                                            if (value === null || value === undefined) return null;
                                                                            
                                                                            // Skip fields that are already shown in the card header
                                                                            if (key === 'label' || key === 'aspect' || key === 'description' || key === 'subtitle') return null;
                                                                            
                                                                            // Define styling for specific field types
                                                                            const fieldConfig = {
                                                                                significance: { icon: '⭐', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', content: 'text-yellow-900', label: 'Significance' },
                                                                                achievement: { icon: '🏆', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', content: 'text-green-900', label: 'Achievement' },
                                                                                preparation: { icon: '📚', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', content: 'text-blue-900', label: 'Preparation' },
                                                                                milestone: { icon: '🎯', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', content: 'text-purple-900', label: 'Milestone' },
                                                                                symbolism: { icon: '🔰', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', content: 'text-indigo-900', label: 'Symbolism' },
                                                                                impact: { icon: '💥', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', content: 'text-red-900', label: 'Impact' },
                                                                                rating: { icon: '📊', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', content: 'text-orange-900', label: 'Rating' },
                                                                                reaction: { icon: '💬', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-800', content: 'text-pink-900', label: 'Reaction' },
                                                                                leaders: { icon: '👔', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', content: 'text-blue-900', label: 'Leaders' },
                                                                                action: { icon: '⚡', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', content: 'text-teal-900', label: 'Action' },
                                                                                tilak: { icon: '🗣️', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', content: 'text-amber-900', label: 'Tilak' },
                                                                                official: { icon: '📋', bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-800', content: 'text-gray-900', label: 'Official' },
                                                                                loyalty: { icon: '🤝', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-800', content: 'text-cyan-900', label: 'Loyalty' },
                                                                                participation: { icon: '👥', bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-800', content: 'text-lime-900', label: 'Participation' },
                                                                                points: { icon: '📌', bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-800', content: 'text-gray-900', label: 'Key Points' },
                                                                            };
                                                                            
                                                                            const config = fieldConfig[key] || { 
                                                                                icon: '📌', 
                                                                                bg: 'bg-gray-50', 
                                                                                border: 'border-gray-300', 
                                                                                text: 'text-gray-800', 
                                                                                content: 'text-gray-900',
                                                                                label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
                                                                            };
                                                                            
                                                                            // Render based on value type
                                                                            if (typeof value === 'string') {
                                                                                return (
                                                                                    <div key={key} className={`p-2 ${config.bg} rounded border ${config.border}`}>
                                                                                        <p className={`text-xs font-semibold ${config.text} mb-1`}>
                                                                                            {config.icon} {config.label}
                                                                                        </p>
                                                                                        <p className={`text-xs ${config.content}`}>{value}</p>
                                                                                    </div>
                                                                                );
                                                                            } else if (Array.isArray(value)) {
                                                                                return (
                                                                                    <div key={key} className={`p-2 ${config.bg} rounded border ${config.border}`}>
                                                                                        <p className={`text-xs font-semibold ${config.text} mb-1`}>
                                                                                            {config.icon} {config.label}
                                                                                        </p>
                                                                                        <ul className={`list-disc list-inside space-y-0.5 text-xs ${config.content}`}>
                                                                                            {value.map((item, i) => (
                                                                                                <li key={i}>{item}</li>
                                                                                            ))}
                                                                                        </ul>
                                                                                    </div>
                                                                                );
                                                                            } else if (typeof value === 'object') {
                                                                                // Nested object - render recursively
                                                                                return (
                                                                                    <div key={key} className={`p-2 ${config.bg} rounded border ${config.border}`}>
                                                                                        <p className={`text-xs font-semibold ${config.text} mb-2`}>
                                                                                            {config.icon} {config.label}
                                                                                        </p>
                                                                                        <div className={`space-y-1 text-xs ${config.content}`}>
                                                                                            {Object.entries(value).map(([subKey, subValue]) => (
                                                                                                <div key={subKey}>
                                                                                                    <strong className="capitalize">
                                                                                                        {subKey.replace(/([A-Z])/g, ' $1').trim()}:
                                                                                                    </strong>{' '}
                                                                                                    {Array.isArray(subValue) ? (
                                                                                                        <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                                                                                                            {subValue.map((item, idx) => (
                                                                                                                <li key={idx}>{item}</li>
                                                                                                            ))}
                                                                                                        </ul>
                                                                                                    ) : (
                                                                                                        <span>{subValue}</span>
                                                                                                    )}
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            return null;
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            ))}
                                        </div>
                                        )}

                                        {/* Sub-categories if exist */}
                                        {category.subcategories && (
                                            <div className="mt-6 space-y-4">
                                                {category.subcategories.map((subcat, subIdx) => (
                                                    <div key={subIdx} className="pl-4 border-l-4" style={{ borderColor: category.color }}>
                                                        <h4 className="font-semibold text-gray-700 mb-2">{subcat.label}</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {subcat.items?.map((item, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="p-3 bg-gray-50 rounded border border-gray-200 text-sm text-gray-700"
                                                                >
                                                                    {item}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Extra info (achievements, limitations, etc.) */}
                                        {category.extraInfo && (
                                            <div className="mt-6 space-y-4">
                                                {category.extraInfo.achievements && (
                                                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                                        <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                                                            <span>✓</span>
                                                            <span>Achievements</span>
                                                        </h4>
                                                        <ul className="list-disc list-inside space-y-1 text-sm text-green-900">
                                                            {category.extraInfo.achievements.map((achievement, idx) => (
                                                                <li key={idx}>{achievement}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {category.extraInfo.limitations && (
                                                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                                        <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                                                            <span>⚠️</span>
                                                            <span>Limitations</span>
                                                        </h4>
                                                        <ul className="list-disc list-inside space-y-1 text-sm text-red-900">
                                                            {category.extraInfo.limitations.map((limitation, idx) => (
                                                                <li key={idx}>{limitation}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>

                {/* Connections/Relationships */}
                {connections && connections.length > 0 && (
                    <div className="mt-8 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Key Relationships</h3>
                        <div className="space-y-3">
                            {connections.map((conn, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                                >
                                    <span className="font-semibold text-gray-700">{conn.from}</span>
                                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                    <span className="text-sm text-gray-600 italic">{conn.relationship}</span>
                                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                    <span className="font-semibold text-gray-700">{conn.to}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

