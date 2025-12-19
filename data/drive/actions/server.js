'use server';

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import Task from '@/model/task.model';
import { uploadFile as driveUploadFile } from '@/lib/drive';

export async function uploadFileToTaskAction(formData) {
    try {
        const file = formData.get('file');
        const taskId = formData.get('taskId');

        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return { success: false, error: 'Task ID không hợp lệ.' };
        }

        if (!file || typeof file === 'string' || !file.name || file.size === 0) {
            return { success: false, error: 'File không hợp lệ hoặc bị thiếu.' };
        }

        await connectDB();

        const task = await Task.findById(taskId).select('docs fileIds attachmentsCount').lean();

        if (!task) {
            return { success: false, error: 'Không tìm thấy công việc với ID đã cho.' };
        }

        const parentId = task.docs?.driveFolderId;
        if (!parentId) {
            return { success: false, error: 'Công việc này chưa được liên kết với thư mục Drive. Vui lòng tạo thư mục Drive cho công việc trước.' };
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const driveFile = await driveUploadFile({
            name: file.name,
            mime: file.type || 'application/octet-stream',
            parentId: parentId,
            buffer: buffer,
        });

        if (!driveFile || !driveFile.id) {
            throw new Error('Tải tệp lên Drive thất bại, không nhận được ID tệp.');
        }

        const updateResult = await Task.updateOne(
            { _id: taskId },
            {
                $push: { 'fileIds': driveFile.id },
                $inc: { attachmentsCount: 1 }
            }
        );

        if (updateResult.modifiedCount === 0) {
            console.warn(`[Drive Action] File ${driveFile.id} đã upload lên Drive nhưng không thể cập nhật Task ${taskId}.`);
            return { success: false, error: 'Tải tệp thành công nhưng cập nhật công việc thất bại.' };
        }

        return {
            success: true,
            data: {
                driveFile: driveFile,
                taskId: taskId,
                dbUpdate: {
                    matched: updateResult.matchedCount,
                    modified: updateResult.modifiedCount
                }
            }
        };

    } catch (error) {
        console.error('[uploadFileToTaskAction Error]', error);
        return {
            success: false,
            error: error.message || 'Lỗi không xác định xảy ra.'
        };
    }
}