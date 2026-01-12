// components/conceptmap/VisualRenderer.jsx
import { lazy, Suspense } from "react";
import MapVisual from "./visuals/MapVisual";
import TreeVisual from "./visuals/TreeVisual";
import TimelineVisual from "./visuals/TimelineVisual";
import FlowDiagramVisual from "./visuals/FlowDiagramVisual";
import LayeredSystemVisual from "./visuals/LayeredSystemVisual";

export default function VisualRenderer({ visualType, topicData, onElementClick }) {
    const renderVisual = () => {
        switch (visualType) {
            case "map":
                return <MapVisual topicData={topicData} onMarkerClick={onElementClick} />;
            case "tree":
                return <TreeVisual topicData={topicData} onNodeClick={onElementClick} />;
            case "timeline":
                return <TimelineVisual topicData={topicData} onEventClick={onElementClick} />;
            case "flow":
                return <FlowDiagramVisual topicData={topicData} onNodeClick={onElementClick} />;
            case "layered":
                return <LayeredSystemVisual topicData={topicData} onLayerClick={onElementClick} />;
            default:
                return (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
                        <p className="text-gray-500">Visual type "{visualType}" not supported</p>
                    </div>
                );
        }
    };

    return (
        <Suspense
            fallback={
                <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                        <p className="text-gray-600">Loading visualization...</p>
                    </div>
                </div>
            }
        >
            {renderVisual()}
        </Suspense>
    );
}

