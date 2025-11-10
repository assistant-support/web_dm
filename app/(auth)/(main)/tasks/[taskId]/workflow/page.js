// app/(auth)/(main)/tasks/[taskId]/workflow/page.js
// Workflow Editor Page - Drag & drop subtasks to create workflow

import { notFound } from 'next/navigation';
import WorkflowEditor from '@/components/tasks/WorkflowEditor.js';

export const dynamic = 'force-dynamic';

export default async function WorkflowEditorPage({ params }) {
    const { taskId } = await params;
    if (!taskId) return notFound();

    return <WorkflowEditor taskId={taskId} />;
}
