/**
 * @file components/comments/CommentSection.js
 * @description A Server Component that fetches and displays comments for a target,
 * and includes the form for adding new comments.
 */
import { Suspense } from 'react';
import * as commentData from '@/data/comment.data';
import CommentList from './CommentList';
import { CommentForm } from './CommentForm.client';

/**
 * Renders the entire comment section for a given target.
 * @param {{ targetId: string, targetType: 'task' | 'project' }} props
 * @returns {Promise<JSX.Element>}
 */
export default async function CommentSection({ targetId, targetType }) {
    // Fetch initial comments on the server
    const initialComments = await commentData.findComments({ targetId });

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold border-b pb-2">Comments</h3>
            {/* The form is a client component for interactivity */}
            <CommentForm targetId={targetId} targetType={targetType} />
            
            {/* The list is a server component that receives initial data */}
            <Suspense fallback={<p>Loading comments...</p>}>
                <CommentList initialComments={initialComments} />
            </Suspense>
        </div>
    );
}
