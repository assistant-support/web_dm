// components/project/ProjectList.client.js
// Mục đích: Hiển thị danh sách projects với grid layout

'use client';

import ProjectCard from './ProjectCard.client.js';
import { FolderOpen } from 'lucide-react';

/**
 * ProjectList - Grid layout hiển thị danh sách projects
 * @param {Object} props
 * @param {Array} props.projects - Mảng project objects
 * @param {string} props.teamId - Team ID để pass vào ProjectCard
 */
export default function ProjectList({ projects, teamId }) {
    if (!projects || projects.length === 0) {
        return (
            <div className="text-center py-12">
                <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
                <p className="mt-1 text-sm text-gray-500">
                    Get started by creating a new project.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
                <ProjectCard key={project._id} project={project} teamId={teamId} />
            ))}
        </div>
    );
}
