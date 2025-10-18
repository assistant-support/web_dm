/**
 * Upload file lên Google Drive và tạo Attachment
 * - Hỗ trợ: taskId hoặc projectId (ít nhất một)
 * - Optional: label, workType, platforms (JSON array), kind, createTaskFolderIfMissing
 * - Phân quyền theo mô tả Bước 10
 */

import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import Attachment from '@/model/common/attachment.model'
import Task from '@/model/common/task.model'
import Project from '@/model/common/project.model'
import { FILE_KIND, STORAGE_PROVIDER } from '@/model/common/enums'
import { uploadToFolder, createTaskFolder } from '@/lib/drive'
import { inProject, canEditTask, canManageProject } from '@/lib/permissions'
import { revalidateTag } from 'next/cache'
import { tags } from '@/data/tags'
import { logActivity } from '@/lib/activity'
import { AppError } from '@/lib/errors'
import { getCurrentUser } from '@/lib/auth-bridge'

const OID = mongoose.Types.ObjectId
const toOid = (v) => new OID(String(v))
const storageConst = (STORAGE_PROVIDER?.GOOGLE_DRIVE ?? STORAGE_PROVIDER?.DRIVE) || 'google_drive'
const revalidateMany = (...tgs) => tgs.filter(Boolean).forEach((t) => revalidateTag(t))
const getUserId = (user) => user?._id || user?.id || user?.externalUserId

async function ensureTaskDocsFolder(taskId) {
  const task = await Task.findById(taskId)
  if (!task) throw new AppError('TASK_NOT_FOUND', 404)
  const project = await Project.findById(task.project)
  if (!project) throw new AppError('PROJECT_NOT_FOUND', 404)
  if (task?.docs?.enabled && task?.docs?.driveFolderId) {
    return { driveFolderId: task.docs.driveFolderId, driveFolderName: task.docs.driveFolderName }
  }
  if (!task.docs) task.docs = { enabled: true }
  task.docs.enabled = true
  const created = await createTaskFolder({ project, task })
  if (!created?.id) throw new AppError('CREATE_DRIVE_FOLDER_FAILED', 500)
  task.docs.driveFolderId = created.id
  task.docs.driveFolderName = created.name
  await task.save()
  return { driveFolderId: created.id, driveFolderName: created.name }
}

function kindFromMime(mime, fallback) {
  if (fallback) return fallback
  if (!mime) return FILE_KIND.OTHER || 'other'
  if (mime.startsWith('image/')) return FILE_KIND.IMAGE || 'image'
  if (mime.startsWith('video/')) return FILE_KIND.VIDEO || 'video'
  if (mime.includes('pdf') || mime.includes('msword') || mime.includes('officedocument') || mime.includes('text/')) return FILE_KIND.DOC || 'doc'
  return FILE_KIND.OTHER || 'other'
}

export async function POST(req) {
  try {
    const user = await getCurrentUser?.()
    if (!user) return NextResponse.json({ ok: false, message: 'UNAUTHORIZED', code: 'UNAUTHORIZED' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file')
    const taskId = form.get('taskId')?.toString()
    const projectId = form.get('projectId')?.toString()
    const label = form.get('label')?.toString()
    const workType = form.get('workType')?.toString()
    const platforms = (() => {
      const raw = form.get('platforms')?.toString()
      if (!raw) return undefined
      try { return JSON.parse(raw) } catch { return undefined }
    })()
    const kindOpt = form.get('kind')?.toString()
    const createFolderIfMissing = String(form.get('createTaskFolderIfMissing') || '').toLowerCase() === 'true'

    if (!file) return NextResponse.json({ ok: false, message: 'Thiếu file', code: 'VALIDATION_FAILED' }, { status: 400 })
    if (!taskId && !projectId) return NextResponse.json({ ok: false, message: 'Cần taskId hoặc projectId', code: 'VALIDATION_FAILED' }, { status: 400 })

    // Lấy container & phân quyền
    let parentFolderId
    let resolvedProjectId
    let resolvedTaskId

    if (taskId) {
      const task = await Task.findById(taskId)
      if (!task) return NextResponse.json({ ok: false, message: 'TASK_NOT_FOUND' }, { status: 404 })

      const isMember = (await inProject(user, task.project)) || (await canEditTask(user, task))
      if (!isMember) return NextResponse.json({ ok: false, message: 'FORBIDDEN' }, { status: 403 })

      resolvedProjectId = String(task.project)
      resolvedTaskId = String(task._id)

      if (task?.docs?.driveFolderId) {
        parentFolderId = task.docs.driveFolderId
      } else if (createFolderIfMissing) {
        const created = await ensureTaskDocsFolder(taskId)
        parentFolderId = created.driveFolderId
      } else {
        return NextResponse.json({ ok: false, message: 'Task chưa có folder docs', code: 'NO_TASK_FOLDER' }, { status: 400 })
      }
    } else if (projectId) {
      const project = await Project.findById(projectId)
      if (!project) return NextResponse.json({ ok: false, message: 'PROJECT_NOT_FOUND' }, { status: 404 })
      const isMember = await inProject(user, project._id)
      if (!isMember) return NextResponse.json({ ok: false, message: 'FORBIDDEN' }, { status: 403 })
      resolvedProjectId = String(project._id)
      parentFolderId = project.driveFolderId
      if (!parentFolderId) return NextResponse.json({ ok: false, message: 'Project chưa cấu hình Drive folder', code: 'NO_PROJECT_FOLDER' }, { status: 400 })
    }

    // Chuẩn bị dữ liệu upload
    const name = file.name || 'upload'
    const mimeType = file.type || 'application/octet-stream'
    const body = Buffer.from(await file.arrayBuffer())

    // Upload lên Drive
    const meta = await uploadToFolder({ parentId: parentFolderId, name, mimeType, body })
    if (!meta?.id) return NextResponse.json({ ok: false, message: 'UPLOAD_FAILED' }, { status: 500 })

    // Xác định kind
    const kind = kindFromMime(mimeType, kindOpt)

    // Lưu Attachment
    const attDoc = await Attachment.create({
      project: resolvedProjectId ? toOid(resolvedProjectId) : undefined,
      task: resolvedTaskId ? toOid(resolvedTaskId) : undefined,
      author: getUserId(user),
      storage: storageConst,
      kind,
      label,
      workType: workType || undefined,
      platforms: Array.isArray(platforms) ? platforms : undefined,
      driveFileId: meta.id,
      driveFileName: meta.name || name,
      driveFileMimeType: meta.mimeType || mimeType,
      driveFolderId: parentFolderId,
      size: meta.size || body.length,
    })

    // Activity + Revalidate
    await logActivity({
      type: 'attachment.added',
      project: resolvedProjectId,
      task: resolvedTaskId,
      actor: getUserId(user),
      payload: { driveFileId: meta.id, kind },
    })

    if (resolvedTaskId) revalidateMany(tags.attachments(resolvedTaskId), tags.task(resolvedTaskId))
    else if (resolvedProjectId) revalidateMany(tags.project(resolvedProjectId))

    return NextResponse.json({ ok: true, data: { attachment: { id: String(attDoc._id), project: resolvedProjectId, task: resolvedTaskId, kind, driveFileId: meta.id, driveFileName: meta.name || name, driveFileMimeType: meta.mimeType || mimeType } } })
  } catch (e) {
    const status = e?.status || (e?.code === 'FORBIDDEN' ? 403 : e?.code === 'UNAUTHORIZED' ? 401 : 500)
    return NextResponse.json({ ok: false, message: e?.message || 'INTERNAL_ERROR', code: e?.code || 'INTERNAL_ERROR' }, { status })
  }
}
