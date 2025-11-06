/**
 * @file components/attachments/AttachmentList.js
 * @description Server Component to display a list of attachments.
 */
import AttachmentItem from './AttachmentItem.client';
import { FileText } from 'lucide-react';

/**
 * Renders a list of attachments.
 * @param {{ initialAttachments: Array<object> }} props
 * @returns {JSX.Element}
 */
export default function AttachmentList({ initialAttachments = [] }) {
    if (initialAttachments.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400">
                <FileText className="mx-auto h-12 w-12 mb-2" />
                <p className="text-sm">Chưa có tệp đính kèm nào.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {initialAttachments.map((attachment) => (
                <AttachmentItem key={attachment._id} attachment={attachment} />
            ))}
        </div>
    );
}
