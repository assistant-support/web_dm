// components/project/ProjectCard.client.js
// Mục đích: Card hiển thị project với thông tin tổng quan

'use client';

import Link from 'next/link';
import Card from '@/components/ui/card';
import Badge from '@/components/ui/badge';
import { Calendar, Users, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';

/**
 * ProjectCard - Card hiển thị thông tin tổng quan project
 * @param {Object} props
 * @param {Object} props.project - Project object
 * @param {string} props.teamId - Team ID để tạo link
 */
export default function ProjectCard({ project, teamId }) {
    const memberCount = project.members?.length || 0;
    const isOverdue = project.dueDate && new Date(project.dueDate) < new Date();

    return (
        <Link href={`/projects/${project._id}`}>
            <div className="p-6 rounded-lg border border-gray-200 bg-white hover:shadow-md hover:border-gray-300 transition-all cursor-pointer h-full">
                <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {project.name}
                            </h3>
                            {project.code && (
                                <p className="text-sm text-gray-500 mt-1">
                                    {project.code}
                                </p>
                            )}
                        </div>
                        {!project.isActive && (
                            <Badge variant="secondary">Archived</Badge>
                        )}
                    </div>

                    {/* Description */}
                    {project.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                            {project.description}
                        </p>
                    )}

                    {/* Tags */}
                    {project.tags && project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {project.tags.slice(0, 3).map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                            {project.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                    +{project.tags.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        {/* Members */}
                        <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{memberCount}</span>
                        </div>

                        {/* Due date */}
                        {project.dueDate && (
                            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(project.dueDate), 'MMM dd, yyyy')}</span>
                            </div>
                        )}

                        {/* Priority */}
                        {project.priority && (
                            <Badge 
                                variant={
                                    project.priority === 'urgent' ? 'destructive' : 
                                    project.priority === 'high' ? 'default' : 
                                    'secondary'
                                }
                                className="text-xs"
                            >
                                {project.priority}
                            </Badge>
                        )}
                    </div>

                    {/* Drive folder */}
                    {project.driveFolderName && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <FolderOpen className="h-3 w-3" />
                            <span className="truncate">{project.driveFolderName}</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
