// app/(auth)/dev/_client/DevPanel.client.jsx
// Tác dụng file: Bảng điều khiển test nhanh B1–B5 (Client Component).
// - Sửa: i18n tiếng Việt cho priority/status; ẩn các _id trong preview.
// - Sửa: thêm danh sách AppUser để chọn khi add/remove/change role team (tránh nhập sai userId).

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAsyncNotifier } from '@/hooks/loading.hook.js';
import * as AppUserActions from '@/data/appUser/actions.js';
import * as TeamActions from '@/data/team/actions/server.js';
import * as ProjectActions from '@/data/project/actions/server.js';
import { PRIORITY } from '@/model/common/enums.js';
import { tPriority } from '@/lib/i18n.js';

const priorities = [
    { value: '', label: 'priority (optional)' },
    { value: PRIORITY.URGENT, label: tPriority(PRIORITY.URGENT) },
    { value: PRIORITY.HIGH, label: tPriority(PRIORITY.HIGH) },
    { value: PRIORITY.NORMAL, label: tPriority(PRIORITY.NORMAL) },
    { value: PRIORITY.LOW, label: tPriority(PRIORITY.LOW) },
];

// Replacer để ẩn _id và vài khóa kỹ thuật trong JSON preview
function previewReplacer(key, value) {
    if (key === '_id' || key === '__v') return undefined;
    return value;
}

export default function DevPanel() {
    const { run, Overlays } = useAsyncNotifier({ enableNoti: true, enableLoading: true });

    // ===== Auth/Profile =====
    const [who, setWho] = useState(null);

    // ===== Users for pickers =====
    const [users, setUsers] = useState([]);
    const userOptions = useMemo(
        () => [{ value: '', label: '-- Chọn user --' }, ...users],
        [users]
    );

    // ===== Team =====
    const [teamName, setTeamName] = useState('');
    const [teamDesc, setTeamDesc] = useState('');
    const [teams, setTeams] = useState([]);
    const [currentTeamId, setCurrentTeamId] = useState('');
    const currentTeam = useMemo(
        () => teams.find((t) => String(t._id) === String(currentTeamId)) || null,
        [teams, currentTeamId]
    );

    const [memberUserId, setMemberUserId] = useState('');
    const [memberRole, setMemberRole] = useState('member');

    const [removeUserId, setRemoveUserId] = useState('');
    const [changeUserId, setChangeUserId] = useState('');
    const [changeRole, setChangeRole] = useState('manager');

    // ===== Project =====
    const [projName, setProjName] = useState('');
    const [projCode, setProjCode] = useState('');
    const [projPriority, setProjPriority] = useState('');
    const [projStart, setProjStart] = useState('');
    const [projDue, setProjDue] = useState('');
    const [driveParentId, setDriveParentId] = useState('');
    const [projects, setProjects] = useState([]);
    const [currentProjectId, setCurrentProjectId] = useState('');
    const currentProject = useMemo(
        () => projects.find((p) => String(p._id) === String(currentProjectId)) || null,
        [projects, currentProjectId]
    );

    // Load danh sách AppUsers cho picker
    useEffect(() => {
        run(async () => {
            const res = await AppUserActions.listForPicker({ limit: 100 });
            // run() đã trả về {ok:true,data}; ở đây mình lấy res.data
            return res;
        }, { notify: 'none' }).then((r) => {
            if (r?.ok) setUsers(r.data.items || []);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ===== Handlers =====
    const onWhoAmI = async () => {
        const r = await run(() => AppUserActions.whoAmI(), { successMessage: 'OK' });
        if (r?.ok) setWho(r.data);
    };

    const onCreateTeam = async () => {
        if (!teamName.trim()) return;
        const r = await run(() => TeamActions.create({ name: teamName.trim(), description: teamDesc.trim() }));
        if (r?.ok) {
            setTeamName('');
            setTeamDesc('');
            // Refresh my teams
            await onListMyTeams();
            setCurrentTeamId(r.data._id);
        }
    };

    const onListMyTeams = async () => {
        const r = await run(() => TeamActions.listMy(), { notify: 'none' });
        if (r?.ok) setTeams(r.data || []);
    };

    const onAddMember = async () => {
        if (!currentTeamId || !memberUserId) return;
        const payload = { userId: memberUserId, role: memberRole };
        const r = await run(() => TeamActions.addMemberAction(currentTeamId, payload));
        if (r?.ok) await onListMyTeams();
    };

    const onRemoveMember = async () => {
        if (!currentTeamId || !removeUserId) return;
        const r = await run(() => TeamActions.removeMemberAction(currentTeamId, { userId: removeUserId }));
        if (r?.ok) await onListMyTeams();
    };

    const onChangeRole = async () => {
        if (!currentTeamId || !changeUserId) return;
        const r = await run(() => TeamActions.changeRole(currentTeamId, { userId: changeUserId, role: changeRole }));
        if (r?.ok) await onListMyTeams();
    };

    const onListProjects = async () => {
        if (!currentTeamId) return;
        const r = await run(() => ProjectActions.listByTeamAction(currentTeamId), { notify: 'none' });
        if (r?.ok) setProjects(r.data || []);
    };

    const onCreateProject = async () => {
        if (!currentTeamId || !projName.trim()) return;
        const payload = {
            team: currentTeamId,
            name: projName.trim(),
            code: projCode.trim() || undefined,
            priority: projPriority || undefined,
            startDate: projStart ? new Date(projStart) : undefined,
            dueDate: projDue ? new Date(projDue) : undefined,
            driveParentId: driveParentId || undefined,
        };
        const r = await run(() => ProjectActions.create(payload));
        if (r?.ok) {
            setProjName(''); setProjCode(''); setProjPriority(''); setProjStart(''); setProjDue(''); setDriveParentId('');
            await onListProjects();
            setCurrentProjectId(r.data._id);
        }
    };

    const onUpdateProject = async () => {
        if (!currentProjectId) return;
        const r = await run(() => ProjectActions.update(currentProjectId, { name: `${currentProject?.name || 'P'} (renamed)` }));
        if (r?.ok) await onListProjects();
    };

    const onArchiveProject = async () => {
        if (!currentProjectId) return;
        const r = await run(() => ProjectActions.archive(currentProjectId));
        if (r?.ok) await onListProjects();
    };

    // ===== Render =====
    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">
            <Overlays />
            <h1 className="text-xl font-semibold">Dev Panel · B1–B5 Smoke Test</h1>

            {/* Auth & Profile */}
            <section className="bg-white shadow rounded p-4 space-y-3">
                <h2 className="font-medium">Auth & Profile</h2>
                <div className="flex gap-2">
                    <button className="px-3 py-1 rounded bg-black text-white" onClick={onWhoAmI}>Who am I?</button>
                    <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={() => run(() => AppUserActions.setColor('#3b82f6'))}>Set color (#3b82f6)</button>
                    <button className="px-3 py-1 rounded bg-green-600 text-white" onClick={() => run(() => AppUserActions.setCapacity(40))}>Set capacity (40)</button>
                    <button className="px-3 py-1 rounded bg-slate-600 text-white" onClick={() => run(() => AppUserActions.updatePreferences({ 'ui.compact': !(who?.preferences?.['ui.compact']) }))}>Toggle ui.compact</button>
                </div>
                <pre className="bg-slate-50 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(who || { note: 'No profile yet' }, previewReplacer, 2)}
                </pre>
            </section>

            {/* Team */}
            <section className="bg-white shadow rounded p-4 space-y-3">
                <h2 className="font-medium">Team</h2>
                <div className="flex gap-2">
                    <input className="border px-2 py-1 rounded flex-1" placeholder="Team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                    <input className="border px-2 py-1 rounded flex-[2]" placeholder="Description (optional)" value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)} />
                    <button className="px-3 py-1 rounded bg-black text-white" onClick={onCreateTeam}>Create team</button>
                </div>

                <div className="flex gap-2 items-center">
                    <button className="px-3 py-1 rounded bg-slate-800 text-white" onClick={onListMyTeams}>List my teams</button>
                    <select className="border px-2 py-1 rounded" value={currentTeamId} onChange={(e) => setCurrentTeamId(e.target.value)}>
                        <option value="">-- Chọn team --</option>
                        {teams.map((t) => (<option key={t._id} value={t._id}>{t.name}</option>))}
                    </select>
                </div>

                <pre className="bg-slate-50 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify({ count: teams.length, currentTeamId, currentTeam: currentTeam ? { name: currentTeam.name, members: currentTeam.members } : null }, previewReplacer, 2)}
                </pre>

                {/* Membership controls */}
                <div className="grid grid-cols-3 gap-4">
                    {/* Add/Update member */}
                    <div className="border rounded p-3">
                        <h3 className="font-medium mb-2">Add member</h3>
                        <select className="border px-2 py-1 rounded w-full mb-2" value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)}>
                            {userOptions.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>
                        <select className="border px-2 py-1 rounded w-full mb-2" value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
                            <option value="member">Thành viên</option>
                            <option value="manager">Quản lý</option>
                        </select>
                        <button className="w-full px-3 py-1 rounded bg-slate-900 text-white" onClick={onAddMember}>Add / Update</button>
                    </div>

                    {/* Remove member */}
                    <div className="border rounded p-3">
                        <h3 className="font-medium mb-2">Remove member</h3>
                        <select className="border px-2 py-1 rounded w-full mb-2" value={removeUserId} onChange={(e) => setRemoveUserId(e.target.value)}>
                            {userOptions.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>
                        <button className="w-full px-3 py-1 rounded bg-red-600 text-white" onClick={onRemoveMember}>Remove</button>
                    </div>

                    {/* Change role */}
                    <div className="border rounded p-3">
                        <h3 className="font-medium mb-2">Change role</h3>
                        <select className="border px-2 py-1 rounded w-full mb-2" value={changeUserId} onChange={(e) => setChangeUserId(e.target.value)}>
                            {userOptions.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>
                        <select className="border px-2 py-1 rounded w-full mb-2" value={changeRole} onChange={(e) => setChangeRole(e.target.value)}>
                            <option value="manager">Quản lý</option>
                            <option value="member">Thành viên</option>
                        </select>
                        <button className="w-full px-3 py-1 rounded bg-amber-600 text-white" onClick={onChangeRole}>Change role</button>
                    </div>
                </div>
            </section>

            {/* Project */}
            <section className="bg-white shadow rounded p-4 space-y-3">
                <h2 className="font-medium">Project</h2>
                <div className="grid grid-cols-12 gap-2">
                    <input className="border px-2 py-1 rounded col-span-3" placeholder="Project name" value={projName} onChange={(e) => setProjName(e.target.value)} />
                    <input className="border px-2 py-1 rounded col-span-2" placeholder="Code" value={projCode} onChange={(e) => setProjCode(e.target.value)} />
                    <select className="border px-2 py-1 rounded col-span-2" value={projPriority} onChange={(e) => setProjPriority(e.target.value)}>
                        {priorities.map((p) => <option key={p.value || 'none'} value={p.value}>{p.label}</option>)}
                    </select>
                    <input type="date" className="border px-2 py-1 rounded col-span-2" value={projStart} onChange={(e) => setProjStart(e.target.value)} />
                    <input type="date" className="border px-2 py-1 rounded col-span-2" value={projDue} onChange={(e) => setProjDue(e.target.value)} />
                    <input className="border px-2 py-1 rounded col-span-6" placeholder="driveParentId (optional)" value={driveParentId} onChange={(e) => setDriveParentId(e.target.value)} />
                    <div className="col-span-6 flex gap-2">
                        <button className={`flex-1 px-3 py-1 rounded ${currentTeamId ? 'bg-black text-white' : 'bg-slate-300 text-slate-600 cursor-not-allowed'}`} onClick={onCreateProject} disabled={!currentTeamId}>
                            Create project {currentTeamId ? '' : '(needs team selected)'}
                        </button>
                        <button className="px-3 py-1 rounded bg-slate-800 text-white" onClick={onListProjects}>List projects by team</button>
                        <select className="border px-2 py-1 rounded" value={currentProjectId} onChange={(e) => setCurrentProjectId(e.target.value)}>
                            <option value="">-- Chọn project --</option>
                            {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>

                <pre className="bg-slate-50 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify({ teamId: currentTeamId, projectsCount: projects.length, currentProject: currentProject ? { name: currentProject.name, driveFolderId: currentProject.driveFolderId, isActive: currentProject.isActive } : null }, previewReplacer, 2)}
                </pre>

                <div className="flex gap-2">
                    <button className={`px-3 py-1 rounded ${currentProjectId ? 'bg-indigo-700 text-white' : 'bg-slate-300 text-slate-600 cursor-not-allowed'}`} onClick={onUpdateProject} disabled={!currentProjectId}>
                        Update (rename)
                    </button>
                    <button className={`px-3 py-1 rounded ${currentProjectId ? 'bg-red-700 text-white' : 'bg-slate-300 text-slate-600 cursor-not-allowed'}`} onClick={onArchiveProject} disabled={!currentProjectId}>
                        Archive
                    </button>
                </div>
            </section>
        </div>
    );
}
