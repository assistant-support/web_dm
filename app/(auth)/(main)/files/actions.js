'use server';

import { revalidatePath } from 'next/cache';
import { rename, remove } from '@/data/attachment/actions/server.js';

export async function renameAttachmentAction({ attachmentId, name, revalidate = true }) {
    if (!attachmentId || !name) {
        throw new Error('Thiếu attachmentId hoặc name khi đổi tên file');
    }

    const result = await rename({ attachmentId, name });

    if (revalidate) {
        revalidatePath('/files');
    }

    return result;
}

export async function deleteAttachmentAction({ attachmentId, hard = false, revalidate = true }) {
    if (!attachmentId) {
        throw new Error('Thiếu attachmentId khi xóa file');
    }

    const result = await remove({ attachmentId, hard });

    if (revalidate) {
        revalidatePath('/files');
    }

    return result;
}
