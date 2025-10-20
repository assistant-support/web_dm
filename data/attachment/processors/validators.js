// /data/attachment/processors/validators.js
// Mục đích: Định nghĩa schema và validate payload cho Attachment B8.
// - Chuẩn hóa lỗi validation về AppError('VALIDATION', { issues }) để UI hiển thị chính xác.
// - KHÔNG thay đổi hợp đồng schemas hiện có.

import { z } from 'zod';
import { AppError } from '@/lib/errors.js';
import { formatZodIssues } from '@/lib/action-utils.js';
import { FILE_KIND } from '@/model/common/enums.js';

// Thông tin file do client gửi lên; payload chỉ chứa meta + dữ liệu (arrayBuffer hoặc base64).
const FilePayload = z.object({
    name: z.string().trim().min(1, 'Thiếu tên file'),
    size: z.number().int().min(0, 'Kích thước không hợp lệ'),
    mime: z.string().trim().min(1, 'Thiếu MIME type'),
    arrayBuffer: z.any().optional(),
    base64: z.string().optional(),
});

export const attachmentCreateSchema = z.object({
    scope: z.enum(['project', 'task']),
    projectId: z.string().trim().min(1),
    taskId: z.string().trim().optional().nullable(),
    file: FilePayload,
    // Giữ nguyên enum theo hợp đồng hiện tại
    kind: z.nativeEnum(FILE_KIND).default(FILE_KIND.OTHER),
});

export const attachmentRenameSchema = z.object({
    attachmentId: z.string().trim().min(1),
    name: z.string().trim().min(1),
});

export const attachmentMoveSchema = z.object({
    attachmentId: z.string().trim().min(1),
    to: z.object({
        scope: z.enum(['project', 'task']),
        projectId: z.string().trim().min(1),
        taskId: z.string().trim().optional().nullable(),
    }),
});

export const attachmentDeleteSchema = z.object({
    attachmentId: z.string().trim().min(1),
});

/**
 * Validate payload theo schema; ném AppError('VALIDATION', { issues }) khi sai.
 * Lưu ý: bám chuẩn B0→B7 để UI đồng bộ cách hiện lỗi.
 */
export function validate(schema, payload) {
    const res = schema.safeParse(payload);
    if (!res.success) {
        throw new AppError('VALIDATION', { issues: formatZodIssues(res.error.issues) });
    }
    return res.data;
}
