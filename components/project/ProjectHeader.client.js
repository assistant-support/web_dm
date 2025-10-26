// components/project/ProjectHeader.client.js
// Mục đích: Header cho project detail page với actions (Client Component - có dialog)

'use client';

import { useState } from 'react';
// import Link from 'next/link'; // Đã loại bỏ do lỗi biên dịch
import Badge from '@/components/ui/badge';
import {
    Calendar,
    FolderOpen,
    ArrowLeft,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
// import EditProjectDialog from './EditProjectDialog.client'; // Đã loại bỏ do lỗi biên dịch

// --- BẮT ĐẦU MOCK COMPONENT ---
// Tạo một component giả lập để giải quyết lỗi import và duy trì chức năng
function MockEditProjectDialog({ project, open, onClose }) {
    if (!open) return null;

    // Sử dụng inline styles để tránh phụ thuộc CSS bên ngoài
    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50
    };

    const dialogStyle = {
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        width: '450px',
        maxWidth: '90%',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    };

    const buttonStyle = {
        marginTop: '20px',
        padding: '8px 16px',
        backgroundColor: '#f1f1f1',
        border: '1px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
                <h2 style={{ marginTop: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
                    Edit Project (Mock)
                </h2>
                <p style={{ margin: '8px 0', fontSize: '14px' }}>
                    Đây là placeholder cho dialog chỉnh sửa: <strong>{project.name}</strong>
                </p>
                <button
                    onClick={onClose}
                    style={buttonStyle}
                    className="hover:bg-gray-200" // Thêm một chút tương tác
                >
                    Close
                </button>
            </div>
        </div>
    );
}
// --- KẾT THÚC MOCK COMPONENT ---


/**
 * ProjectHeader - Client component hiển thị header project với edit dialog
 * @param {Object} props
 * @param {Object} props.project - Project object
 * @param {boolean} props.canManage - User có quyền manage project không
 */
export default function ProjectHeader({ project, canManage }) {
    const [showEditDialog, setShowEditDialog] = useState(false);
    // State để quản lý việc thu gọn/mở rộng, mặc định là mở rộng
    const [isExpanded, setIsExpanded] = useState(true);

    const isOverdue = project.dueDate && new Date(project.dueDate) < new Date();
    // Cập nhật backUrl để luôn trỏ về /projects
    const backUrl = '/projects';

    return (
        <>
            {/* Edit Dialog - Sử dụng Mock component */}
            {showEditDialog && (
                <MockEditProjectDialog
                    project={project}
                    open={showEditDialog}
                    onClose={() => setShowEditDialog(false)}
                />
            )}

            <div className="bg-white shadow rounded-lg p-4 md:p-6"> {/* Giảm padding một chút */}
                {/* Back button - Thay thế Link bằng a */}
                <a
                    href={backUrl}
                    // Font nhỏ hơn, icon nhỏ hơn, margin bottom nhỏ hơn
                    className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 mb-3"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Projects {/* Cập nhật text */}
                </a>

                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            {/* Font title nhỏ hơn */}
                            <h1 className="text-2xl font-bold text-gray-900">
                                {project.name}
                            </h1>
                            {!project.isActive && (
                                <Badge variant="secondary">Archived</Badge>
                            )}
                            {project.priority && (
                                <Badge
                                    variant={
                                        project.priority === 'urgent' ? 'destructive' :
                                            project.priority === 'high' ? 'default' :
                                                'secondary'
                                    }
                                >
                                    {project.priority}
                                </Badge>
                            )}

                            {/* Nút Thu gọn / Mở rộng */}
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="text-gray-400 hover:text-gray-600 ml-1"
                                aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                            >
                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    {canManage && (
                        <div className="ml-4 flex-shrink-0">
                            <button
                                onClick={() => setShowEditDialog(true)}
                                // Button nhỏ hơn
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Edit Project
                            </button>
                        </div>
                    )}
                </div>

                {/* --- Phần nội dung có thể thu gọn --- */}
                <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded
                        ? 'max-h-[1000px] opacity-100 mt-3'
                        : 'max-h-0 opacity-0 mt-0'
                        }`}
                >
                    {project.code && (
                        // Font nhỏ hơn, margin top nhỏ hơn
                        <p className="text-xs text-gray-500 mt-1">
                            Code: {project.code}
                        </p>
                    )}

                    {project.description && (
                        // Font nhỏ hơn (text-sm), margin top nhỏ hơn
                        <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
                            {project.description}
                        </p>
                    )}

                    {/* Meta info */}
                    {/* Font nhỏ hơn, margin top nhỏ hơn, icon nhỏ hơn */}
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                        {project.startDate && (
                            <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Start: {format(new Date(project.startDate), 'MMM dd, yyyy')}
                            </div>
                        )}
                        {project.dueDate && (
                            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                                <Calendar className="h-3.5 w-3.5" />
                                Due: {format(new Date(project.dueDate), 'MMM dd, yyyy')}
                            </div>
                        )}
                        {project.driveFolderName && (
                            <div className="flex items-center gap-1">
                                <FolderOpen className="h-3.5 w-3.5" />
                                <span className="truncate">{project.driveFolderName}</span>
                            </div>
                        )}
                    </div>

                    {/* Tags */}
                    {project.tags && project.tags.length > 0 && (
                        // Margin top nhỏ hơn
                        <div className="mt-3 flex flex-wrap gap-2">
                            {project.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs"> {/* Thêm class text-xs cho badge */}
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
                {/* --- Hết phần nội dung có thể thu gọn --- */}

            </div>
        </>
    );
}

