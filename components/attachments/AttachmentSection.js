/**
 * @file components/attachments/AttachmentSection.js
 * @description A Server Component that fetches and displays attachments for a target.
 */
import { Suspense } from 'react';
import * as attachmentData from '@/data/attachment.data';
import AttachmentList from './AttachmentList';
import { AttachmentUpload } from './AttachmentUpload.client';

/**
 * Renders the entire attachment section for a given target.
 * @param {{ targetId: string, targetType: 'task' | 'project' }} props
 * @returns {Promise<JSX.Element>}
 */
export default async function AttachmentSection({ targetId, targetType, isActive = true }) {
    const initialAttachments = await attachmentData.findAttachments({ targetId });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Attachments</h3>
                <AttachmentUpload targetId={targetId} targetType={targetType} isActive={isActive} />
            </div>
            <Suspense fallback={<p>Loading attachments...</p>}>
                <AttachmentList initialAttachments={initialAttachments} isActive={isActive} />
            </Suspense>
        </div>
    );
}
