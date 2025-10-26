import React from 'react';

export default function WorkflowViewer({ workflow }) {
    if (!workflow || !workflow.nodes || workflow.nodes.length === 0) {
        return (
            <p className="text-sm text-gray-400 italic">
                Không có quy trình nào được áp dụng.
            </p>
        );
    }

    return (
        <div className="relative bg-gray-50 border border-gray-200 rounded-md shadow-sm p-4" style={{ height: '400px', position: 'relative' }}>
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {/* Draw edges */}
                {workflow.edges.map((edge, index) => {
                    const fromNode = workflow.nodes.find(node => node.key === edge.from);
                    const toNode = workflow.nodes.find(node => node.key === edge.to);

                    if (!fromNode || !toNode) return null;

                    const startX = fromNode.x + 10; // Adjust to left edge of box
                    const startY = fromNode.y + 40;
                    const endX = toNode.x - 10; // Adjust to left edge of box
                    const endY = toNode.y + 40;

                    const controlX1 = startX + 50;
                    const controlY1 = startY;
                    const controlX2 = endX - 50;
                    const controlY2 = endY;

                    return (
                        <path
                            key={index}
                            d={`M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`}
                            stroke="#6366F1"
                            strokeWidth="2"
                            fill="none"
                            markerEnd="url(#arrowhead)"
                        />
                    );
                })}

                {/* Arrow marker definition */}
                <defs>
                    <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="10"
                        refY="3.5"
                        orient="auto"
                    >
                        <polygon points="0 0, 10 3.5, 0 7" fill="#6366F1" />
                    </marker>
                </defs>
            </svg>

            {/* Draw nodes */}
            {workflow.nodes.map((node, index) => (
                <div
                    key={index}
                    className="absolute bg-white border border-gray-300 rounded-lg shadow-md p-2 text-center flex flex-col items-center"
                    style={{
                        left: node.x,
                        top: node.y,
                        width: '140px',
                        height: '80px',
                        transform: 'translate(-50%, -50%)',
                    }}
                >
                    <h4 className="text-sm font-medium text-gray-800 truncate">
                        {node.label || node.key}
                    </h4>
                    <p className={`text-xs font-semibold px-2 py-1 rounded ${
                        node.status === 'completed' ? 'bg-green-100 text-green-800' :
                        node.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                        {node.status.toUpperCase()}
                    </p>
                </div>
            ))}
        </div>
    );
}