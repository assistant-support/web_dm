// /data/attachment/processors/validators.js
import { z } from 'zod';
import { AppError } from '@/lib/errors.js';
import { formatZodIssues } from '@/lib/action-utils.js';
import { FILE_KIND } from '@/model/common/enums.js';

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

export function validate(schema, payload) {
    const res = schema.safeParse(payload);
    if (!res.success) {
        throw new AppError('VALIDATION', 'VALIDATION', 400, formatZodIssues(res.error.issues));
    }
    return res.data;
}
