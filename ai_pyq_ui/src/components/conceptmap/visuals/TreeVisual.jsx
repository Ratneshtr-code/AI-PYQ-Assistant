// components/conceptmap/visuals/TreeVisual.jsx
import React, { useCallback, useMemo, useEffect } from "react";
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
    root: ({ data }) => (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-6 py-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-lg shadow-lg border-2 border-blue-800 font-semibold text-center min-w-[200px]"
        >
            {data.label}
        </motion.div>
    ),
    branch: ({ data }) => (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-5 py-3 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg shadow-md border-2 border-green-700 font-medium text-center min-w-[180px]"
        >
            {data.label}
        </motion.div>
    ),
    leaf: ({ data }) => (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-4 py-2 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-md shadow-sm border border-yellow-600 text-sm font-medium text-center min-w-[150px] cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => data.onClick && data.onClick()}
        >
            {data.label}
        </motion.div>
    ),
};

export default function TreeVisual({ topicData, onNodeClick }) {
    const { root, branches = [] } = topicData || {};

    const { nodes, edges } = useMemo(() => {
        const nodeList = [];
        const edgeList = [];
        let yOffset = 0;

        // Root node
        if (root) {
            nodeList.push({
                id: root.id,
                type: "root",
                position: { x: 400, y: 50 },
                data: {
                    label: root.label,
                    onClick: () => onNodeClick && onNodeClick(root),
                },
                sourcePosition: Position.Bottom,
            });
        }

        // Branch nodes
        branches.forEach((branch, branchIndex) => {
            const branchX = 200 + (branchIndex * 400);
            const branchY = 200;
            
            nodeList.push({
                id: branch.id,
                type: "branch",
                position: { x: branchX, y: branchY },
                data: {
                    label: branch.label,
                    onClick: () => onNodeClick && onNodeClick(branch),
                },
                sourcePosition: Position.Bottom,
                targetPosition: Position.Top,
            });

            // Edge from root to branch
            if (root) {
                edgeList.push({
                    id: `e-${root.id}-${branch.id}`,
                    source: root.id,
                    target: branch.id,
                    type: "smoothstep",
                    animated: true,
                    style: { stroke: "#6366F1", strokeWidth: 2 },
                });
            }

            // Leaf nodes
            if (branch.leaves && branch.leaves.length > 0) {
                branch.leaves.forEach((leaf, leafIndex) => {
                    const leafX = branchX - 50 + (leafIndex * 100);
                    const leafY = 350;
                    
                    nodeList.push({
                        id: leaf.id,
                        type: "leaf",
                        position: { x: leafX, y: leafY },
                        data: {
                            label: leaf.label,
                            onClick: () => onNodeClick && onNodeClick(leaf),
                        },
                        targetPosition: Position.Top,
                    });

                    // Edge from branch to leaf
                    edgeList.push({
                        id: `e-${branch.id}-${leaf.id}`,
                        source: branch.id,
                        target: leaf.id,
                        type: "smoothstep",
                        animated: true,
                        style: { stroke: "#10B981", strokeWidth: 2 },
                    });
                });
            }
        });

        return { nodes: nodeList, edges: edgeList };
    }, [root, branches, onNodeClick]);

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

