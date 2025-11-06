/**
 * @file components/project/MyProjectsList.js
 * @description Server Component to display a list of projects.
 * It receives project data as a prop and renders ProjectCard components.
 * Interactive elements like edit/delete buttons are delegated to Client Components.
 */
import Link from 'next/link';
import { Folder } from 'lucide-react';
import ProjectCard from '@/components/project/ProjectCard.client';

/**
 * Renders a grid of project cards.
 * @param {{ initialProjects: Array<object> }} props
 * @returns {JSX.Element}
 */
export default function MyProjectsList({ initialProjects = [] }) {
    if (initialProjects.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300 mt-4">
                <Folder className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Projects Found</h3>
                <p className="mt-1 text-sm text-gray-500">
                    Get started by creating a new project.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {initialProjects.map((project) => (
                <ProjectCard key={project._id} project={project} />
            ))}
        </div>
    );
}