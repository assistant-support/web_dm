// components/tasks/CollaboratorsPanel.client.js
// UI Panel quản lý collaborators - mời người ngoài project vào task

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, X, Check, Clock, Trash2 } from 'lucide-react';
import { Select } from '@/components/ui/input';
import UserDisplay from '@/components/ui/user-display';
import {
    inviteCollaborator,
    acceptCollaboratorInvite,
    removeCollaboratorFromTask,
    listTaskCollaborators
} from '@/data/task/actions/collaborators.server';

/**
 * CollaboratorsPanel - Quản lý collaborators của task
 * 
 * @param {Object} props
 * @param {Object} props.task - Task object
 * @param {Array} props.users - All users available for invitation
 * @param {Array} props.projectMembers - Current project members (để exclude)
 * @param {string} props.currentUserId - Current user's externalUserId
 * @param {boolean} props.canManage - Can invite/remove collaborators
 */
export default function CollaboratorsPanel({
    task,
    users = [],
    projectMembers = [],
    currentUserId,
    canManage = false
}) {
    users = users.items
    
    const router = useRouter();
    const [collaborators, setCollaborators] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInviting, setIsInviting] = useState(false);
    const [error, setError] = useState('');

    // Invite form state
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRole, setSelectedRole] = useState('contributor');

    // Load collaborators
    useEffect(() => {
        loadCollaborators();
    }, [task._id]);

    const loadCollaborators = async () => {
        setIsLoading(true);
        try {
            const result = await listTaskCollaborators(task._id);
            if (result.ok) {
                setCollaborators(result.data || []);
            }
        } catch (err) {
            console.error('Load collaborators error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter users: exclude project members và existing collaborators
    const availableUsers = users.filter(user => {
        const isMember = projectMembers.some(m => m.userId === user.externalUserId);
        const isCollaborator = collaborators.some(c => c.userId === user.externalUserId);
        return !isMember && !isCollaborator;
    });

    // Handle invite
    const handleInvite = async () => {
        if (!selectedUserId) {
            setError('Vui lòng chọn người muốn mời');
            return;
        }

        setIsInviting(true);
        setError('');

        try {
            const result = await inviteCollaborator(task._id, {
                userId: selectedUserId,
                role: selectedRole
            });

            if (!result.ok) {
                setError(result.message || 'Không thể mời');
                return;
            }

            // Reset form
            setSelectedUserId('');
            setSelectedRole('contributor');
            
            // Reload
            await loadCollaborators();
            router.refresh();
        } catch (err) {
            console.error('Invite error:', err);
            setError(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsInviting(false);
        }
    };

    // Handle accept (for current user)
    const handleAccept = async (collaboratorUserId) => {
        try {
            const result = await acceptCollaboratorInvite(task._id);
            if (result.ok) {
                await loadCollaborators();
                router.refresh();
            }
        } catch (err) {
            console.error('Accept error:', err);
        }
    };

    // Handle remove
    const handleRemove = async (collaboratorUserId) => {
        if (!confirm('Bạn có chắc muốn xóa người này khỏi công việc?')) return;

        try {
            const result = await removeCollaboratorFromTask(task._id, collaboratorUserId);
            if (result.ok) {
                await loadCollaborators();
                router.refresh();
            }
        } catch (err) {
            console.error('Remove error:', err);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">
                    Cộng tác viên ({collaborators.length})
                </h3>
                {canManage && availableUsers.length > 0 && (
                    <button
                        onClick={() => setIsInviting(!isInviting)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        <UserPlus className="h-4 w-4 inline mr-1" />
                        Mời người
                    </button>
                )}
            </div>

            {/* Description */}
            <p className="text-xs text-gray-500">
                Mời người ngoài project để cùng làm việc trên task này. Họ chỉ xem được task này, không xem toàn bộ project.
            </p>

            {/* Error */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    {error}
                </div>
            )}

            {/* Invite Form */}
            {canManage && isInviting && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Chọn người
                        </label>
                        <Select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            disabled={isInviting}
                        >
                            <option value="">-- Chọn người --</option>
                            {availableUsers.map(user => (
                                <option key={user.externalUserId} value={user.externalUserId}>
                                    {user.fullName} ({user.email})
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Vai trò
                        </label>
                        <Select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            disabled={isInviting}
                        >
                            <option value="contributor">Contributor - Thực hiện công việc</option>
                            <option value="reviewer">Reviewer - Xem và góp ý</option>
                        </Select>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleInvite}
                            disabled={isInviting || !selectedUserId}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            Gửi lời mời
                        </button>
                        <button
                            onClick={() => {
                                setIsInviting(false);
                                setError('');
                                setSelectedUserId('');
                            }}
                            disabled={isInviting}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Hủy
                        </button>
                    </div>
                </div>
            )}

            {/* Collaborators List */}
            {isLoading ? (
                <div className="text-sm text-gray-500 text-center py-4">
                    Đang tải...
                </div>
            ) : collaborators.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4 border border-gray-200 border-dashed rounded-lg">
                    Chưa có cộng tác viên nào
                </div>
            ) : (
                <div className="space-y-2">
                    {collaborators.map((collab) => {
                        const isPending = !collab.acceptedAt;
                        const isCurrentUser = collab.userId === currentUserId;
                        const canAccept = isCurrentUser && isPending;

                        return (
                            <div
                                key={collab.userId}
                                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {/* Status icon */}
                                    {isPending ? (
                                        <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                                    ) : (
                                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                                    )}

                                    {/* User info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <UserDisplay 
                                                userId={collab.userId} 
                                                size="sm"
                                                showAvatar={true}
                                            />
                                            {isCurrentUser && (
                                                <span className="text-xs text-gray-500">(Bạn)</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-600">
                                                {collab.role === 'contributor' ? 'Contributor' : 'Reviewer'}
                                            </span>
                                            {isPending && (
                                                <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                                                    Chờ xác nhận
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    {canAccept && (
                                        <button
                                            onClick={() => handleAccept(collab.userId)}
                                            className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                                        >
                                            Chấp nhận
                                        </button>
                                    )}
                                    {canManage && (
                                        <button
                                            onClick={() => handleRemove(collab.userId)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                                            title="Xóa cộng tác viên"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Info note */}
            {collaborators.length > 0 && (
                <p className="text-xs text-gray-500 italic">
                    💡 Cộng tác viên chỉ xem được task này và các comment/attachment liên quan.
                </p>
            )}
        </div>
    );
}
