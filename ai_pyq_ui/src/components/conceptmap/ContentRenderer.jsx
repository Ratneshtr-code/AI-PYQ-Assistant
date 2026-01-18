// components/conceptmap/ContentRenderer.jsx
import { useState, useEffect } from "react";
import { buildApiUrl } from "../../config/apiConfig";
import StaticContentRenderer from "./StaticContentRenderer";
import TimelineVisual from "./visuals/TimelineVisual";
import TableVisual from "./visuals/TableVisual";
import FlowchartVisual from "./visuals/FlowchartVisual";
import MindMapVisual from "./visuals/MindMapVisual";
import ClockVisual from "./visuals/ClockVisual";
import StaircaseVisual from "./visuals/StaircaseVisual";
import ArticleCardsVisual from "./visuals/ArticleCardsVisual";
import SplitPanelVisual from "./visuals/SplitPanelVisual";
import PreambleVisual from "./visuals/PreambleVisual";
import TabsVisual from "./visuals/TabsVisual";
import LearningPath from "./LearningPath";

export default function ContentRenderer({ topic, selectedSubject, onTopicSelect, activeTab = "content", onTabChange }) {
    const [topicData, setTopicData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!topic) {
            setTopicData(null);
            setLoading(false);
            setError(null);
            return;
        }

        // If topic has a path, it's a static image - no need to fetch data
        if (topic.path) {
            setTopicData(topic);
            setLoading(false);
            setError(null);
            return;
        }

        // For JSON-based topics, fetch the full data
        const fetchTopicData = async () => {
            setLoading(true);
            setError(null);

            try {
                const url = buildApiUrl(`conceptmap/topic/${topic.id}?subject=${selectedSubject}`);
                const res = await fetch(url, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                });

                if (!res.ok) {
                    throw new Error(`Failed to fetch topic data: ${res.status}`);
                }

                const data = await res.json();
                setTopicData(data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching topic data:", err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchTopicData();
    }, [topic, selectedSubject]);

    // Show learning path
    if (activeTab === "learning-path") {
        return (
            <div className="w-full h-full flex flex-col">
                <div className="flex-1 overflow-auto">
                    <LearningPath
                        subject={selectedSubject}
                        onTopicSelect={onTopicSelect}
                        currentTopicId={topic?.id}
                    />
                </div>
            </div>
        );
    }

    // Show content tab
    if (activeTab === "content") {
        // Loading state
        if (loading) {
            return (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                        <p className="text-gray-600">Loading content...</p>
                    </div>
                </div>
            );
        }

        // Error state
        if (error) {
            return (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                        <div className="text-4xl mb-3">⚠️</div>
                        <p className="text-gray-500 text-lg">Failed to load content</p>
                        <p className="text-gray-400 text-sm mt-2">{error}</p>
                    </div>
                </div>
            );
        }

        // No topic selected
        if (!topic || !topicData) {
            return (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                        <p className="text-gray-500 text-lg">No content available</p>
                        <p className="text-gray-400 text-sm mt-2">Select a topic to view content</p>
                    </div>
                </div>
            );
        }

        // Route to appropriate visual component based on visualType
        const visualType = topic.visualType || topicData.visualType || "static";
        let content;

        switch (visualType) {
            case "static":
                content = <StaticContentRenderer topic={topicData} />;
                break;
            
            case "timeline":
                content = <TimelineVisual topicData={topicData} />;
                break;
            
            case "table":
                content = <TableVisual topicData={topicData} />;
                break;
            
            case "flowchart":
                content = <FlowchartVisual topicData={topicData} />;
                break;
            
            case "mindmap":
                content = <MindMapVisual topicData={topicData} />;
                break;
            
            case "clock":
                content = <ClockVisual topicData={topicData} />;
                break;
            
            case "staircase":
                content = <StaircaseVisual topicData={topicData} />;
                break;
            
            case "articleCards":
                content = <ArticleCardsVisual topicData={topicData} />;
                break;
            
            case "splitPanel":
                content = <SplitPanelVisual topicData={topicData} />;
                break;
            
            case "preambleVisual":
                content = <PreambleVisual topicData={topicData} />;
                break;
            
            case "tabs":
                content = <TabsVisual topicData={topicData} />;
                break;
            
            default:
                content = (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <div className="text-center">
                            <div className="text-4xl mb-3">❓</div>
                            <p className="text-gray-500 text-lg">Unknown visual type</p>
                            <p className="text-gray-400 text-sm mt-2">Visual type "{visualType}" is not supported</p>
                        </div>
                    </div>
                );
        }

        return (
            <div className="w-full h-full flex flex-col">
                <div className="flex-1 overflow-auto">
                    {content}
                </div>
            </div>
        );
    }

    // Quiz tab (coming soon)
    return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold text-gray-700 mb-2">Coming Soon!</h3>
                <p className="text-gray-600">
                    Interactive quizzes will be available soon to test your knowledge.
                </p>
            </div>
        </div>
    );
}

