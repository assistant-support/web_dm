// components/tasks/QuickTaskForm.client.js
// Mục đích: Form nhanh tạo task trong project

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Select } from '@/components/ui/input';
import { createTask } from '@/data/task/actions/server.js';
import { Plus } from 'lucide-react';
import { PRIORITY } from '@/model/common/enums.js';

const PRIORITY_OPTIONS = [
    { value: PRIORITY.LOW, label: 'Low' },
    { value: PRIORITY.MEDIUM, label: 'Medium' },
    { value: PRIORITY.HIGH, label: 'High' },
    { value: PRIORITY.URGENT, label: 'Urgent' },
];

/**
 * QuickTaskForm - Form nhanh tạo task
 * @param {Object} props
 * @param {string} props.projectId - Project ID
 * @param {Function} props.onSuccess - Callback khi tạo thành công
 */
export default function QuickTaskForm({ projectId, onSuccess }) {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState(PRIORITY.MEDIUM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!title.trim()) {
            setError('Task title is required');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const result = await createTask(projectId, {
                title: title.trim(),
                priority,
            });

            if (!result.ok) {
                setError(result.message || 'Failed to create task');
                return;
            }

            // Reset form
            setTitle('');
            setPriority(PRIORITY.MEDIUM);

            if (onSuccess) {
                onSuccess(result.data);
            } else {
                router.refresh();
            }
        } catch (err) {
            console.error('Create task error:', err);
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            <div className="flex gap-3">
                <div className="flex-1">
                    <Input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="What needs to be done?"
                        disabled={isSubmitting}
                        className="w-full"
                    />
                </div>

                <div className="w-32">
                    <Select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        options={PRIORITY_OPTIONS}
                        disabled={isSubmitting}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || !title.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    {isSubmitting ? 'Adding...' : 'Add Task'}
                </button>
            </div>
        </form>
    );
}
