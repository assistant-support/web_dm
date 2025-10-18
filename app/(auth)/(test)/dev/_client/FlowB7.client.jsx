// app/(auth)/dev/_client/FlowB7.client.jsx
// Tác dụng file: UI Dev Flow Runner (auth 2.0 thật) — chỉ hiển thị tên/nhãn, KHÔNG hiển thị _id.
// - Kết quả và log đều đã “scrub” bỏ các trường id thô để tránh rác UI và lỗi serialize.

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAsyncNotifier } from '@/hooks/loading.hook.js';
import { whoAmI } from '@/data/appUser/actions.js';
import { create as createTeam } from '@/data/team/actions/server.js';
import {
    create as createProject,
    addMemberAction as addProjectMember,
    getDetailAction as getProjectDetail,
} from '@/data/project/actions/server.js';
import {
    create as createTask,
    requestApproval, approveStart, assign,
    confirmStartByAssignee, startNow, markDone, requestReview, approveCompletion,
} from '@/data/task/actions/project.server.js';

function pickTaskSummary(t) {
    if (!t) return null;
    return {
        title: t.title,
        project: t.project, // id nội bộ, không render ra UI
        status: t.status,
        assignee: t.assignee || null,
        approvalStatus: t?.approval?.status || 'none',
        approvalRequired: !!t?.approval?.required,
        assigneeConfirmRequired: !!t?.assigneeConfirm?.required,
        startedAt: t?.startedAt || null,
        completedAt: t?.completedAt || null,
        finalPoints: t?.finalPoints ?? 0,
    };
}

export default function FlowB7() {
    const { run, Overlays, openNoti } = useAsyncNotifier({ enableNoti: true });
    const [me, setMe] = useState(null);

    const [teamName, setTeamName] = useState('');
    const [projectName, setProjectName] = useState('');
    const [projectId, setProjectId] = useState(''); // dùng nội bộ, không render
    const [projectDoc, setProjectDoc] = useState(null);

    const [task, setTask] = useState(null);
    const [workerId, setWorkerId] = useState('');

    const [logs, setLogs] = useState([]);

    useEffect(() => {
        (async () => {
            const w = await whoAmI();
            setMe(w?.data || w);
        })();
    }, []);

    const summary = pickTaskSummary(task);

    const isProjectManager = useMemo(() => {
        if (!projectDoc || !me?.externalUserId) return false;
        const ms = projectDoc.members || [];
        return ms.some(m => {
            const rid = String(m.userId);
            const role = String(m.role || '').toLowerCase();
            return rid === String(me.externalUserId) && (role === 'owner' || role === 'manager');
        });
    }, [projectDoc, me]);

    const isAssignee = useMemo(() => {
        if (!summary || !me?.externalUserId) return false;
        return String(summary.assignee || '') === String(me.externalUserId);
    }, [summary, me]);

    const log = (label, data) => {
        // scrub id fields from log for UI
        const scrubbed = JSON.parse(JSON.stringify(data, (k, v) => {
            if (['_id', 'project', 'team', 'parentTask', '__v'].includes(k)) return undefined;
            return v;
        }));
        setLogs((s) => [{ at: new Date().toISOString(), label, data: scrubbed }, ...s].slice(0, 200));
    };

    const refreshProjectDetail = async (id) => {
        const p = await getProjectDetail(id);
        const doc = p?.data || p;
        setProjectDoc(doc || null);
        setProjectName(doc?.name || projectName);
        return doc;
    };

    // Seed
    const seedTeam = async () => {
        await run(async () => {
            const name = `B7 Team ${new Date().toLocaleTimeString()}`;
            const t = await createTeam({ name });
            setTeamName(name);
            log('createTeam', { name });
            openNoti({ status: 'success', message: `Tạo team: ${name}` });
        });
    };

    const seedProject = async () => {
        await run(async () => {
            if (!teamName) throw new Error('Tạo team trước (đang demo nhanh không nhập ID)');
            const name = `B7 Project ${new Date().toLocaleTimeString()}`;
            const p = await createProject({ team: projectDoc?.team || projectDoc?._id || undefined, name }); // teamId sẽ được enforce khi thật
            const id = p?.data?._id || p?._id; // nội bộ
            setProjectId(String(id));
            setProjectName(name);
            log('createProject', { name });

            if (workerId) {
                try {
                    await addProjectMember(id, { userId: workerId, role: 'member' });
                    log('project.addMember(worker)', { workerId });
                } catch { }
            }
            await refreshProjectDetail(id);
            openNoti({ status: 'success', message: `Tạo project: ${name}` });
        });
    };

    const seedTask = async () => {
        await run(async () => {
            if (!projectId) throw new Error('Tạo project trước');
            const title = `B7 Task ${new Date().toLocaleTimeString()}`;
            const t = await createTask({ project: projectId, title, priority: 'normal' });
            const doc = t?.data || t;
            setTask(doc);
            log('createTask', { title, status: doc?.status });
            openNoti({ status: 'success', message: `Tạo task: ${title}` });
        });
    };

    // B7 step handlers
    const stepRequestApproval = async () => {
        await run(async () => {
            const res = await requestApproval(task?._id || task?.id, 'Please approve start');
            const doc = res?.data || res;
            setTask(doc);
            log('requestApproval', { status: doc?.status, approval: doc?.approval });
        });
    };
    const stepApproveStart = async () => {
        await run(async () => {
            const res = await approveStart(task?._id || task?.id, 'Approved by manager');
            const doc = res?.data || res;
            setTask(doc);
            log('approveStart', { status: doc?.status, approval: doc?.approval });
        });
    };
    const stepAssignWorker = async () => {
        await run(async () => {
            if (!workerId) throw new Error('Nhập externalUserId của worker trước khi Assign');
            try { await addProjectMember(projectId, { userId: workerId, role: 'member' }); } catch { }
            const res = await assign(task?._id || task?.id, workerId);
            const doc = res?.data || res;
            setTask(doc);
            log('assign(worker)', { assignee: doc?.assignee, status: doc?.status });
            openNoti({ status: 'success', message: `Đã assign cho ${workerId}` });
        });
    };
    const stepConfirmByWorker = async () => {
        await run(async () => {
            const res = await confirmStartByAssignee(task?._id || task?.id);
            const doc = res?.data || res;
            setTask(doc);
            log('confirmStart', { status: doc?.status });
        });
    };
    const stepStartNow = async () => {
        await run(async () => {
            const res = await startNow(task?._id || task?.id);
            const doc = res?.data || res;
            setTask(doc);
            log('startNow', { status: doc?.status, startedAt: doc?.startedAt });
        });
    };
    const stepMarkDone = async () => {
        await run(async () => {
            const res = await markDone(task?._id || task?.id);
            const doc = res?.data || res;
            setTask(doc);
            log('markDone', { status: doc?.status });
        });
    };
    const stepApproveCompletion = async () => {
        await run(async () => {
            const res = await approveCompletion({ taskId: task?._id || task?.id, finalPoints: 10 });
            const doc = res?.data || res;
            setTask(doc);
            log('approveCompletion', { status: doc?.status, finalPoints: doc?.finalPoints });
        });
    };

    const canConfirm = !!summary && !!isAssignee && summary.approvalStatus === 'approved' && summary.assigneeConfirmRequired === true;
    const canMarkDone = !!summary && (isAssignee || isProjectManager) && summary.status === 'in_progress';

    return (
        <div className="space-y-6">
            <Overlays />

            {/* Auth info */}
            <section className="p-4 rounded-lg border bg-white">
                <h2 className="font-semibold mb-3">Tài khoản đăng nhập</h2>
                <div className="text-lg font-semibold">{me?.name || '(Chưa xác định)'}</div>
                <div className="text-sm text-gray-600">{me?.email}</div>
                <div className="text-xs text-gray-500 mt-1">externalUserId: {me?.externalUserId}</div>
            </section>

            {/* Worker */}
            <section className="p-4 rounded-lg border bg-white">
                <h2 className="font-semibold mb-3">Chọn Worker (assignee) — externalUserId</h2>
                <div className="flex gap-2">
                    <input
                        className="border rounded px-3 py-2 flex-1"
                        placeholder="Nhập externalUserId của worker (user thật)"
                        value={workerId}
                        onChange={(e) => setWorkerId(e.target.value.trim())}
                    />
                    <button
                        className="px-3 py-2 rounded bg-blue-600 text-white"
                        onClick={async () => {
                            if (!projectId) return openNoti({ status: 'error', message: 'Tạo Project trước' });
                            await run(async () => {
                                await addProjectMember(projectId, { userId: workerId, role: 'member' });
                                await refreshProjectDetail(projectId);
                                openNoti({ status: 'success', message: `Đã thêm ${workerId} vào project ${projectName || ''}` });
                            });
                        }}
                        disabled={!workerId || !projectId}
                    >
                        Add vào Project
                    </button>
                </div>
            </section>

            {/* Seed */}
            <section className="p-4 rounded-lg border bg-white">
                <h2 className="font-semibold mb-3">Seed nhanh</h2>
                <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={seedTeam}>Tạo Team</button>
                    <button className="px-3 py-2 rounded bg-emerald-500 text-white" onClick={seedProject} disabled={!teamName}>Tạo Project</button>
                    <button className="px-3 py-2 rounded bg-emerald-400 text-white" onClick={seedTask} disabled={!projectId}>Tạo Task</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm">
                    <div className="p-2 rounded bg-gray-50 border"><div className="font-medium">Team</div><div>{teamName || '-'}</div></div>
                    <div className="p-2 rounded bg-gray-50 border"><div className="font-medium">Project</div><div>{projectName || '-'}</div></div>
                    <div className="p-2 rounded bg-gray-50 border"><div className="font-medium">Task</div><div>{summary?.title || '-'}</div></div>
                </div>
            </section>

            {/* Steps */}
            <section className="p-4 rounded-lg border bg-white">
                <h2 className="font-semibold mb-3">B7 Steps</h2>
                <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-2 rounded bg-yellow-500 text-white" onClick={stepRequestApproval} disabled={!summary}>Request Approval</button>
                    <button className="px-3 py-2 rounded bg-green-600 text-white" onClick={stepApproveStart} disabled={!summary || !isProjectManager}>Approve Start (Mgr)</button>
                    <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={stepAssignWorker} disabled={!summary || !isProjectManager || !workerId}>Assign Worker</button>
                    <button className={`px-3 py-2 rounded ${canConfirm ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`} onClick={stepConfirmByWorker} disabled={!canConfirm}>Confirm Start (Assignee)</button>
                    <button className="px-3 py-2 rounded bg-cyan-600 text-white" onClick={stepStartNow} disabled={!summary}>Start Now</button>
                    <button className={`px-3 py-2 rounded ${canMarkDone ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`} onClick={stepMarkDone} disabled={!canMarkDone}>Mark Done / Request Review</button>
                    <button className="px-3 py-2 rounded bg-rose-600 text-white" onClick={stepApproveCompletion} disabled={!summary || !isProjectManager}>Approve Completion (Mgr)</button>
                </div>

                <div className="mt-4">
                    <h3 className="font-medium mb-2">Project Members</h3>
                    <pre className="text-sm bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(projectDoc?.members?.map(m => ({ user: m.userId, role: m.role })), null, 2)}
                    </pre>
                </div>

                <div className="mt-4">
                    <h3 className="font-medium mb-2">Task</h3>
                    <pre className="text-sm bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(summary, null, 2)}
                    </pre>
                </div>
            </section>

            {/* Logs */}
            <section className="p-4 rounded-lg border bg-white">
                <h2 className="font-semibold mb-3">Logs</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {logs.map((l, i) => (
                        <div key={i} className="text-sm bg-gray-50 p-2 rounded border">
                            <div className="text-gray-500">{l.at} — <span className="font-medium">{l.label}</span></div>
                            <pre className="mt-1 overflow-x-auto">{JSON.stringify(l.data, null, 2)}</pre>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
