// components/conceptmap/visuals/FlowDiagramVisual.jsx
import { useMemo, useEffect } from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion } from "framer-motion";

const nodeTypes = {
    source: ({ data }) => (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-6 py-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-lg shadow-lg border-2 border-blue-800 font-semibold text-center min-w-[180px] cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => data.onClick && data.onClick()}
        >
            {data.label}
        </motion.div>
    ),
    process: ({ data }) => (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-6 py-4 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg shadow-md border-2 border-green-700 font-medium text-center min-w-[180px] cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => data.onClick && data.onClick()}
        >
            {data.label}
        </motion.div>
    ),
    end: ({ data }) => (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-6 py-4 bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-lg shadow-md border-2 border-purple-700 font-medium text-center min-w-[180px] cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => data.onClick && data.onClick()}
        >
            {data.label}
        </motion.div>
    ),
};

export default function FlowDiagramVisual({ topicData, onNodeClick }) {
    const { nodes: dataNodes = [], edges: dataEdges = [] } = topicData || {};

    const { nodes, edges } = useMemo(() => {
        const nodeList = dataNodes.map((node) => ({
            id: node.id,
            type: node.type || "process",
            position: node.position || { x: 0, y: 0 },
            data: {
                label: node.label,
                onClick: () => onNodeClick && onNodeClick(node),
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
        }));

        const edgeList = dataEdges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#6366F1", strokeWidth: 2 },
            labelStyle: { fill: "#1F2937", fontWeight: 600 },
            labelBgStyle: { fill: "#F3F4F6", fillOpacity: 0.8 },
        }));

        return { nodes: nodeList, edges: edgeList };
    }, [dataNodes, dataEdges, onNodeClick]);

    const [nodesState, setNodes, onNodesChange] = useNodesState(nodes);
    const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges);

    // Update nodes and edges when data changes
    useEffect(() => {
        setNodes(nodes);
        setEdges(edges);
    }, [nodes, edges, setNodes, setEdges]);

    return (
        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg overflow-hidden border border-gray-200">
            <ReactFlow
                nodes={nodesState}
                edges={edgesState}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                className="bg-transparent"
            >
                <Background />
                <Controls />
                <MiniMap />
            </ReactFlow>
        </div>
    );
}

