'use server';

import { NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import { connectDB } from '@/lib/db.js';
import Attachment from '@/model/attachment.model.js';
import Project from '@/model/project.model.js';
import Task from '@/model/task.model.js';
import { getCurrentUser } from '@/lib/request-user.js';
import {
    canManageProject,
    canViewProject,
    canViewTask,
    isTeamManager,
} from '@/lib/permissions.js';
import { getFileMeta, getFileStream } from '@/lib/drive.js';

async function resolveAttachmentContext(token) {
    if (!token) {
        return { error: new NextResponse('Thiếu token', { status: 400 }) };
    }

    const user = await getCurrentUser();
    if (!user?.externalUserId) {
        return { error: new NextResponse('Unauthorized', { status: 401 }) };
    }

    await connectDB();

    const attachment = await Attachment.findOne({
        publicToken: token,
        deletedAt: null,
    }).lean();

    if (!attachment) {
        return { error: new NextResponse('Không tìm thấy file', { status: 404 }) };
    }

    const allowed = await canViewAttachment(attachment, user.externalUserId);
    if (!allowed) {
        return { error: new NextResponse('Forbidden', { status: 403 }) };
    }

    if (!attachment.driveFileId) {
        return { error: new NextResponse('File không khả dụng trên Drive', { status: 410 }) };
    }

    return { attachment, uid: user.externalUserId };
}

export async function GET(request, { params }) {
    const { token } = params ?? {};
    const context = await resolveAttachmentContext(token);
    if (context.error) return context.error;

    const { attachment } = context;

    const mode = request.nextUrl.searchParams.get('mode') || 'preview';
    const rangeHeader = request.headers.get('range');

    let meta;
    try {
        meta = await getFileMeta(attachment.driveFileId);
    } catch (error) {
        console.error('[files.preview] Lỗi lấy metadata:', error);
    }

    const mimeType = attachment.mimeType || meta?.mimeType || 'application/octet-stream';
    const fileSize = meta?.size ? Number(meta.size) : undefined;

    const nodeStream = await getFileStream(attachment.driveFileId, { range: rangeHeader });
    const body = Readable.toWeb(nodeStream);

    const headers = new Headers({
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=60',
    });

    if (mode === 'download') {
        headers.set('Content-Disposition', `attachment; filename="${encodeRFC5987ValueChars(attachment.driveName || 'file')}"`);
    } else {
        headers.set('Content-Disposition', `inline; filename="${encodeRFC5987ValueChars(attachment.driveName || 'file')}"`);
    }

    if (rangeHeader && typeof fileSize === 'number') {
        const { start, end } = parseRange(rangeHeader, fileSize);
        headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Content-Length', String(end - start + 1));
        return new NextResponse(body, { status: 206, headers });
    }

    if (typeof fileSize === 'number') {
        headers.set('Content-Length', String(fileSize));
    }

    return new NextResponse(body, { headers });
}

export async function HEAD(_request, { params }) {
    const { token } = params ?? {};
    const context = await resolveAttachmentContext(token);
    if (context.error) return context.error;

    const { attachment } = context;

    let meta;
    try {
        meta = await getFileMeta(attachment.driveFileId);
    } catch (error) {
        console.error('[files.preview] HEAD metadata error:', error);
    }

    const mimeType = attachment.mimeType || meta?.mimeType || 'application/octet-stream';
    const headers = new Headers({
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=60',
    });

    if (meta?.size) {
        headers.set('Content-Length', String(meta.size));
    }

    return new NextResponse(null, { status: 204, headers });
}

async function canViewAttachment(attachment, uid) {
    if (!uid) return false;
    if (String(attachment.author) === String(uid)) {
        return true;
    }

    if (attachment.project) {
        const project = await Project.findById(attachment.project).lean();
        if (!project) return false;

        if (canManageProject(project, uid)) {
            return true;
        }

        if (canViewProject(project, uid) && !attachment.task) {
            return true;
        }

        if (project.team) {
            const Team = (await import('@/model/team.model.js')).default;
            const team = await Team.findById(project.team).lean();
            if (team && isTeamManager(team, uid)) {
                return true;
            }
        }

        if (attachment.task) {
            const task = await Task.findById(attachment.task).lean();
            if (!task) return false;
            return canViewTask({ ...task, project }, uid);
        }

        return false;
    }

    if (attachment.task) {
        const task = await Task.findById(attachment.task).populate('project').lean();
        if (!task) return false;
        return canViewTask(task, uid);
    }

    return false;
}

function parseRange(rangeHeader, size) {
    const matches = /bytes=(\d*)-(\d*)/.exec(rangeHeader || '');
    if (!matches) {
        return { start: 0, end: size - 1 };
    }
    const start = matches[1] ? parseInt(matches[1], 10) : 0;
    const end = matches[2] ? parseInt(matches[2], 10) : size - 1;
    return {
        start: Number.isNaN(start) ? 0 : start,
        end: Number.isNaN(end) ? size - 1 : end,
    };
}

function encodeRFC5987ValueChars(str) {
    return encodeURIComponent(str)
        .replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
        .replace(/%(7C|60|5E)/g, (match, hex) => `%${hex}`);
}
