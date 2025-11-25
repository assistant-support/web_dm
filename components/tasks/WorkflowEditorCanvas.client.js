// components/tasks/WorkflowEditorCanvas.client.js
// Client-only canvas interactions for the workflow editor

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Plus, Trash2, Move, Link as LinkIcon } from 'lucide-react';
import TaskStatusBadge from '@/components/ui/TaskStatusBadge';
import { createTaskWorkflow } from '@/data/workflow/actions/server';
import CreateSubtaskDialog from '@/components/tasks/CreateSubtaskDialog.client';

const TYPE_CLIENT_MAPPING = {
    subtask: 'task',
};

const STATUS_CLIENT_MAPPING = {
    draft: 'in_progress',
};

const mapType = (type = '') => TYPE_CLIENT_MAPPING[type] || type;
const mapStatus = (status = '') => STATUS_CLIENT_MAPPING[status] || status;

export default function WorkflowEditorCanvas({
    task,
    users = [],
    initialNodes = [],
    initialEdges = [],
    workflowId = null,
    workTypes = [],
    subtasksCount = 0,
    allUsersWithDetails = [],
}) {
    const router = useRouter();
    const canvasRef = useRef(null);

    const [nodes, setNodes] = useState(() => initialNodes);
    const [edges, setEdges] = useState(() => initialEdges);
    const [selectedNode, setSelectedNode] = useState(null);
    const [draggingNode, setDraggingNode] = useState(null);
    const [connectingFrom, setConnectingFrom] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    const handleNodeMouseDown = (event, nodeKey) => {
        if (event.button !== 0) return;
        event.stopPropagation();

        const node = nodes.find((n) => n.key === nodeKey);
        if (!node) return;

        setDraggingNode({
            key: nodeKey,
            startX: event.clientX,
            startY: event.clientY,
            nodeStartX: node.x,
            nodeStartY: node.y,
        });
    };

    const handleMouseMove = useCallback(
        (event) => {
            if (!draggingNode) return;

            const dx = event.clientX - draggingNode.startX;
            const dy = event.clientY - draggingNode.startY;

            setNodes((prev) =>
                prev.map((node) =>
                    node.key === draggingNode.key
                        ? {
                              ...node,
                              x: draggingNode.nodeStartX + dx,
                              y: draggingNode.nodeStartY + dy,
                          }
                        : node,
                ),
            );
        },
        [draggingNode],
    );

    const handleMouseUp = useCallback(() => {
        setDraggingNode(null);
    }, []);

    useEffect(() => {
        if (!draggingNode) return;

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingNode, handleMouseMove, handleMouseUp]);

    const handleConnectClick = (nodeKey) => {
        if (connectingFrom === nodeKey) {
            setConnectingFrom(null);
            return;
        }

        if (connectingFrom) {
            const newEdge = { from: connectingFrom, to: nodeKey, label: '' };
            setEdges((prev) => [...prev, newEdge]);
            setConnectingFrom(null);
            return;
        }

        setConnectingFrom(nodeKey);
    };

    const handleDeleteEdge = (from, to) => {
        setEdges((prev) => prev.filter((edge) => !(edge.from === from && edge.to === to)));
    };

    const handleSave = async () => {
        if (!task?._id) return;

        setIsSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const result = await createTaskWorkflow(task._id, {
                name: `Workflow - ${task.title}`,
                nodes,
                edges,
                workflowId,
            });

            if (!result.ok) {
                setMessage({
                    type: 'error',
                    text: result.message || 'Không thể lưu workflow',
                });
                return;
            }

            setMessage({ type: 'success', text: 'Đã lưu workflow thành công!' });
            router.refresh();
        } catch (error) {
            console.error('[WorkflowEditor] Save error', error);
            setMessage({ type: 'error', text: error?.message || 'Có lỗi xảy ra' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAutoLayout = () => {
        const subtaskNodes = nodes.filter((node) => node.type === mapType('subtask'));

        setNodes(
            subtaskNodes.map((node, index) => ({
                ...node,
                x: 100 + (index % 3) * 300,
                y: 100 + Math.floor(index / 3) * 180,
            })),
        );
    };

    const handleSubtaskCreated = (newSubtask) => {
        if (!newSubtask?._id) return;

        setNodes((prev) => [
            ...prev,
            {
                key: `subtask-${newSubtask._id}`,
                type: mapType('subtask'),
                label: newSubtask.title || '',
                x: 100 + ((prev.length ?? 0) % 3) * 250,
                y: 100 + Math.floor((prev.length ?? 0) / 3) * 150,
                task: String(newSubtask._id),
                status: mapStatus(newSubtask.status),
            },
        ]);
    };

    return (
        <div className="flex flex-col flex-1">
            <div className="bg-white border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCreateDialogOpen(true)}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                        >
                            <Plus className="h-4 w-4" />
                            Tạo task con
                        </button>

                        <button
                            onClick={handleAutoLayout}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <Move className="h-4 w-4" />
                            Sắp xếp tự động
                        </button>

                        {connectingFrom && (
                            <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                                Đang nối từ node. Click vào node đích để tạo connection.
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {message.text && (
                            <span
                                className={`text-sm ${
                                    message.type === 'success' ? 'text-green-600' : 'text-red-600'
                                }`}
                            >
                                {message.text}
                            </span>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />
                            {isSaving ? 'Đang lưu...' : 'Lưu workflow'}
                        </button>
                    </div>
                </div>
            </div>

            <CreateSubtaskDialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                parentTask={task}
                projectId={task?.project}
                users={users}
                allUsersWithDetails={allUsersWithDetails}
                workTypes={workTypes}
                onSuccess={handleSubtaskCreated}
            />

            <div
                ref={canvasRef}
                className="flex-1 relative bg-gray-100 overflow-auto"
                style={{
                    backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                }}
            >
                <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                    {edges.map((edge, idx) => {
                        const fromNode = nodes.find((node) => node.key === edge.from);
                        const toNode = nodes.find((node) => node.key === edge.to);
                        if (!fromNode || !toNode) return null;

                        const x1 = fromNode.x + 120;
                        const y1 = fromNode.y + 40;
                        const x2 = toNode.x + 120;
                        const y2 = toNode.y + 40;

                        const midX = (x1 + x2) / 2;
                        const midY = (y1 + y2) / 2;

                        return (
                            <g key={idx}>
                                <line
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke="#4f46e5"
                                    strokeWidth="3"
                                    markerEnd="url(#arrowhead)"
                                    strokeDasharray="5,5"
                                />

                                <g transform={`translate(${midX}, ${midY})`}>
                                    <circle r="16" fill="white" stroke="#4f46e5" strokeWidth="2" />
                                    <text
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill="#4f46e5"
                                        fontSize="18"
                                        fontWeight="bold"
                                        className="pointer-events-none"
                                        style={{ userSelect: 'none' }}
                                    >
                                        →
                                    </text>
                                </g>

                                <g transform={`translate(${midX + 25}, ${midY - 25})`}>
                                    <circle
                                        r="12"
                                        fill="white"
                                        stroke="#ef4444"
                                        strokeWidth="2"
                                        className="cursor-pointer pointer-events-auto hover:fill-red-50"
                                        onClick={() => handleDeleteEdge(edge.from, edge.to)}
                                    />
                                    <text
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill="#ef4444"
                                        fontSize="16"
                                        fontWeight="bold"
                                        className="pointer-events-none"
                                        style={{ userSelect: 'none' }}
                                    >
                                        ×
                                    </text>
                                </g>
                            </g>
                        );
                    })}

                    <defs>
                        <marker id="arrowhead" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
                            <polygon points="0 0, 12 6, 0 12" fill="#4f46e5" />
                        </marker>
                    </defs>
                </svg>

                {nodes.map((node) => (
                    <div
                        key={node.key}
                        className={`absolute cursor-move select-none ${
                            selectedNode === node.key ? 'ring-2 ring-blue-500' : ''
                        } ${connectingFrom === node.key ? 'ring-2 ring-green-500' : ''}`}
                        style={{ left: node.x, top: node.y, width: 240 }}
                        onMouseDown={(event) => handleNodeMouseDown(event, node.key)}
                        onClick={() => setSelectedNode(node.key)}
                    >
                        <div
                            className={`bg-white border-2 rounded-lg shadow-lg overflow-hidden ${
                                node.type === 'parent' ? 'border-indigo-500' : 'border-gray-300'
                            }`}
                        >
                            <div
                                className={`px-3 py-2 ${
                                    node.type === 'parent'
                                        ? 'bg-indigo-50 text-indigo-900'
                                        : 'bg-gray-50 text-gray-900'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold">
                                        {node.type === 'parent' ? '🎯 Task chính' : '📋 Subtask'}
                                    </span>
                                    <TaskStatusBadge status={mapStatus(node.status)} size="xs" />
                                </div>
                            </div>

                            <div className="p-3">
                                <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                                    {node.label}
                                </h3>
                            </div>

                            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex gap-2">
                                <button
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        handleConnectClick(node.key);
                                    }}
                                    className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium rounded ${
                                        connectingFrom === node.key
                                            ? 'bg-green-600 text-white'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <LinkIcon className="h-3 w-3" />
                                    {connectingFrom === node.key ? 'Đang nối...' : 'Nối'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {nodes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                            <p className="text-lg font-medium">Chưa có subtask nào</p>
                            <p className="text-sm mt-1">Tạo subtasks trước để xây dựng workflow</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white border-t border-gray-200 px-4 py-3">
                <div className="flex items-center gap-6 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                        <Move className="h-4 w-4" />
                        <span>Kéo node để di chuyển</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        <span>Click &quot;Nối&quot; để tạo connection giữa các nodes</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4 text-red-600" />
                        <span>Click × trên line để xóa connection</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                        <span>Tổng subtask: {subtasksCount}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
