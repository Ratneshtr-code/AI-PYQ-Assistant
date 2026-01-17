// components/conceptmap/ContentRenderer.jsx
import { useState, useEffect } from "react";
import { buildApiUrl } from "../../config/apiConfig";
import StaticContentRenderer from "./StaticContentRenderer";
import TimelineVisual from "./visuals/TimelineVisual";
import TableVisual from "./visuals/TableVisual";
import FlowchartVisual from "./visuals/FlowchartVisual";
import MindMapVisual from "./visuals/MindMapVisual";

export default function ContentRenderer({ topic, selectedSubject }) {
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

    // Loading state
    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
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
            <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
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
            <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                    <p className="text-gray-500 text-lg">No content available</p>
                    <p className="text-gray-400 text-sm mt-2">Select a topic to view content</p>
                </div>
            </div>
        );
    }

    // Route to appropriate visual component based on visualType
    const visualType = topic.visualType || topicData.visualType || "static";

    switch (visualType) {
        case "static":
            return <StaticContentRenderer topic={topicData} />;
        
        case "timeline":
            return <TimelineVisual topicData={topicData} />;
        
        case "table":
            return <TableVisual topicData={topicData} />;
        
        case "flowchart":
            return <FlowchartVisual topicData={topicData} />;
        
        case "mindmap":
            return <MindMapVisual topicData={topicData} />;
        
        default:
            return (
                <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                        <div className="text-4xl mb-3">❓</div>
                        <p className="text-gray-500 text-lg">Unknown visual type</p>
                        <p className="text-gray-400 text-sm mt-2">Visual type "{visualType}" is not supported</p>
                    </div>
                </div>
            );
    }
}

