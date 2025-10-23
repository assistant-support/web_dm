// components/project/ProjectHeader.server.js
// Mục đích: Header cho project detail page với actions (SSR Component)

import Link from 'next/link';
import Badge from '@/components/ui/badge';
import { Calendar, FolderOpen, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

/**
 * ProjectHeader - Server component hiển thị header project
 * @param {Object} props
 * @param {Object} props.project - Project object
 * @param {boolean} props.canManage - User có quyền manage project không
 */
export default function ProjectHeader({ project, canManage }) {
    const isOverdue = project.dueDate && new Date(project.dueDate) < new Date();
    const backUrl = project.team ? `/teams/${project.team._id || project.team}/projects` : '/projects';

    return (
        <div className="bg-white shadow rounded-lg p-6">
            {/* Back button */}
            <Link
                href={backUrl}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
                <ArrowLeft className="h-4 w-4" />
                {project.team ? 'Back to Team Projects' : 'Back to Projects'}
            </Link>

            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-gray-900">
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
                    </div>

                    {project.code && (
                        <p className="text-sm text-gray-500 mt-2">
                            Code: {project.code}
                        </p>
                    )}

                    {project.description && (
                        <p className="mt-4 text-gray-700 whitespace-pre-wrap">
                            {project.description}
                        </p>
                    )}

                    {/* Meta info */}
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        {project.startDate && (
                            <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Start: {format(new Date(project.startDate), 'MMM dd, yyyy')}</span>
                            </div>
                        )}
                        {project.dueDate && (
                            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                                <Calendar className="h-4 w-4" />
                                <span>Due: {format(new Date(project.dueDate), 'MMM dd, yyyy')}</span>
                            </div>
                        )}
                        {project.driveFolderName && (
                            <div className="flex items-center gap-1">
                                <FolderOpen className="h-4 w-4" />
                                <span className="truncate">{project.driveFolderName}</span>
                            </div>
                        )}
                    </div>

                    {/* Tags */}
                    {project.tags && project.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {project.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                {canManage && (
                    <div className="ml-4">
                        <Link
                            href={`/projects/${project._id}/edit`}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Edit Project
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
