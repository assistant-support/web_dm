// components/tasks/CollaboratorsPanel.client.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, X, Check, Clock, Trash2, Send } from 'lucide-react';
import { Select } from '@/components/ui/input';
import UserDisplay from '@/components/ui/user-display';
import Button from '@/components/ui/button'; // Import Button
import {
    inviteCollaborator, // Use default from prop if not provided
    acceptCollaboratorInvite,
    removeCollaboratorFromTask, // Use default from prop if not provided
    listTaskCollaborators
} from '@/data/task/actions';
import { useAsyncNotifier } from '@/hooks/loading.hook';

/**
 * CollaboratorsPanel - Quản lý collaborators của task
 *
 * @param {Object} props
 * @param {Object} props.task - Task object
 * @param {Object} props.users - Dữ liệu từ listForPicker { items: [], count: number }
 * @param {Array} props.projectMembers - Current project members [{ userId: string, ... }]
 * @param {string} props.currentUserId - Current user's externalUserId
 * @param {boolean} props.canManage - Can invite/remove collaborators
 * @param {Function} [props.onUpdate] - Callback khi có thay đổi (optional, để refresh)
 * @param {Function} [props.inviteAction] - Action để mời (default: import)
 * @param {Function} [props.removeAction] - Action để xóa (default: import)
 */
export default function CollaboratorsPanel({
    task,
    users: usersProp = { items: [] }, // Expect { items: [] }
    projectMembers = [],
    currentUserId,
    canManage = false,
    onUpdate,
    inviteAction = inviteCollaborator,
    removeAction = removeCollaboratorFromTask
}) {
    const { run } = useAsyncNotifier();
    const router = useRouter();

    // Use usersProp.items safely
    const allAvailableUsers = useMemo(() => usersProp?.items || [], [usersProp]);

    const [collaborators, setCollaborators] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInvitingFormVisible, setIsInvitingFormVisible] = useState(false);
    const [error, setError] = useState('');

    // Invite form state
    const [selectedUserId, setSelectedUserId] = useState(''); // Stores 'value' (ID)
    const [selectedRole, setSelectedRole] = useState('contributor');

    // Load collaborators initially and when task ID changes
    useEffect(() => {
        loadCollaborators();
    }, [task._id]);

    const loadCollaborators = async () => {
        setIsLoading(true);
        setError('');
        try {
            const result = await listTaskCollaborators(task._id);
            if (result.ok) {
                setCollaborators(result.data || []);
            } else {
                setError('Không tải được danh sách cộng tác viên.');
            }
        } catch (err) {
            console.error('Load collaborators error:', err);
            setError('Lỗi tải danh sách cộng tác viên.');
        } finally {
            setIsLoading(false);
        }
    };

    // Filter users for the dropdown: exclude project members & existing collaborators
    const availableUsersForDropdown = useMemo(() => {
        return allAvailableUsers.filter(user => {
            // Check if user.value exists in projectMembers (compare with m.userId)
            const isMember = projectMembers.some(m => m.userId === user.value);
            // Check if user.value exists in collaborators (compare with c.userId)
            const isCollaborator = collaborators.some(c => c.userId === user.value);
            return !isMember && !isCollaborator;
        });
    }, [allAvailableUsers, projectMembers, collaborators]);


    // Handle invite using useAsyncNotifier
    const handleInvite = async () => {
        if (!selectedUserId) {
            setError('Vui lòng chọn người muốn mời');
            return;
        }
        setError('');

        await run(
            () => inviteAction(task._id, { userId: selectedUserId, role: selectedRole }),
            {
                loadingMessage: 'Đang gửi lời mời...',
                successMessage: 'Đã gửi lời mời!',
                errorMessage: 'Không thể gửi lời mời.',
                onSuccess: () => {
                    setSelectedUserId('');
                    setSelectedRole('contributor');
                    setIsInvitingFormVisible(false);
                    loadCollaborators();
                    if (onUpdate) onUpdate(); else router.refresh();
                },
                onError: (err) => setError(err.message || 'Lỗi khi gửi lời mời.')
            }
        );
    };

    // Handle accept using useAsyncNotifier
    const handleAccept = async () => {
        await run(() => acceptCollaboratorInvite(task._id), {
            loadingMessage: 'Đang chấp nhận...',
            successMessage: 'Đã chấp nhận lời mời!',
            errorMessage: 'Không thể chấp nhận lời mời.',
            onSuccess: () => {
                loadCollaborators();
                if (onUpdate) onUpdate(); else router.refresh();
            },
            onError: (err) => setError(err.message || 'Lỗi khi chấp nhận.')
        });
    };

    // Handle remove using useAsyncNotifier
    const handleRemove = async (collaboratorUserIdToRemove) => {
        if (!confirm('Bạn có chắc muốn xóa người này khỏi công việc?')) return;
        await run(() => removeAction(task._id, collaboratorUserIdToRemove), {
            loadingMessage: 'Đang xóa...',
            successMessage: 'Đã xóa cộng tác viên!',
            errorMessage: 'Không thể xóa cộng tác viên.',
            onSuccess: () => {
                loadCollaborators();
                if (onUpdate) onUpdate(); else router.refresh();
            },
            onError: (err) => setError(err.message || 'Lỗi khi xóa.')
        });
    };

    return (
        <div className="space-y-3">
            {/* Header with Invite Toggle */}
            <div className="flex items-center justify-end"> {/* Moved button to right */}
                {canManage && (
                    <button
                        onClick={() => setIsInvitingFormVisible(!isInvitingFormVisible)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 p-1 hover:bg-blue-50 rounded"
                        disabled={availableUsersForDropdown.length === 0 && !isInvitingFormVisible} // Disable if no one to invite
                    >
                        <UserPlus className="h-3.5 w-3.5" />
                        {isInvitingFormVisible ? 'Đóng mời' : 'Mời người'}
                    </button>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                    {error}
                </div>
            )}

            {/* Invite Form */}
            {canManage && isInvitingFormVisible && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Chọn người (ngoài project)
                        </label>
                        <Select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="text-xs" // Smaller text
                        >
                            <option value="">-- Chọn người --</option>
                            {availableUsersForDropdown.map(user => (
                                <option key={user.value} value={user.value}>
                                    {user.label} {/* label includes name and email */}
                                </option>
                            ))}
                        </Select>
                        {availableUsersForDropdown.length === 0 && (
                            <p className="mt-1 text-xs text-gray-500 italic">Không có người dùng nào phù hợp để mời.</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Vai trò
                        </label>
                        <Select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="text-xs" // Smaller text
                        >
                            <option value="contributor">Contributor - Thực hiện</option>
                            <option value="reviewer">Reviewer - Xem xét</option>
                        </Select>
                    </div>
                    <div className="flex gap-2 pt-1">
                        <Button
                            size="xs"
                            onClick={handleInvite}
                            disabled={!selectedUserId} // Only disable if no user selected
                            icon={Send}
                        >
                            Gửi lời mời
                        </Button>
                        <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => {
                                setIsInvitingFormVisible(false);
                                setError('');
                                setSelectedUserId('');
                                // Reset role? Optional: setSelectedRole('contributor');
                            }}
                        >
                            Hủy
                        </Button>
                    </div>
                </div>
            )}

            {/* Collaborators List */}
            {isLoading ? (
                <div className="text-xs text-gray-500 text-center py-3">Đang tải...</div>
            ) : collaborators.length === 0 && !isInvitingFormVisible ? ( // Only show if form is also hidden
                <div className="text-xs text-gray-500 text-center py-3 border border-gray-200 border-dashed rounded-lg">
                    Chưa có cộng tác viên nào.
                </div>
            ) : (
                <div className="space-y-1.5"> {/* Tighter spacing */}
                    {collaborators.map((collab) => {
                        const isPending = !collab.acceptedAt;
                        const isCurrentUser = collab.userId === currentUserId;
                        const canAccept = isCurrentUser && isPending;

                        return (
                            <div
                                key={collab.userId}
                                className="flex items-center justify-between p-1.5 pr-1 bg-white border border-gray-100 rounded hover:bg-gray-50 transition-colors" // Lighter background/border
                            >
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    {/* Status icon */}
                                    {isPending ? (
                                        <Clock className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" title="Chờ xác nhận" />
                                    ) : (
                                        <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" title="Đã tham gia" />
                                    )}
                                    {/* User info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                            {/* Assuming UserDisplay can handle string ID */}
                                            <UserDisplay
                                                userId={String(collab.userId)}
                                                size="xs" // Smaller size
                                                showAvatar={true}
                                                className="text-xs font-medium text-gray-700" // Slightly darker text
                                            />
                                            {isCurrentUser && (<span className="text-xs text-gray-500">(Bạn)</span>)}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[11px] text-gray-500"> {/* Smaller text */}
                                                {collab.role === 'contributor' ? 'Contributor' : 'Reviewer'}
                                            </span>
                                            {isPending && (
                                                <span className="text-[10px] px-1 py-0 bg-yellow-100 text-yellow-700 rounded">Chờ</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Actions */}
                                <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                                    {canAccept && (
                                        <Button
                                            size="xs" // Smaller button
                                            variant="success_outline" // Outline style might be less intrusive
                                            onClick={handleAccept}
                                            icon={Check}
                                        >
                                            Chấp nhận
                                        </Button>
                                    )}
                                    {/* Optional: Reject invite button */}
                                    {/* {canAccept && ( <Button size="xs" variant="danger_outline" onClick={() => handleRemove(collab.userId)} icon={X}>Từ chối</Button> )} */}

                                    {/* Remove Button (Manager sees for others, or for pending self-invite) */}
                                    {canManage && (!isCurrentUser || isPending) && (
                                        <Button
                                            variant="ghost"
                                            size="icon_xs" // Extra small icon button
                                            className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleRemove(collab.userId)}
                                            tooltip="Xóa" // Assuming Button supports tooltip prop
                                        >
                                            <Trash2 className="h-3 w-3" /> {/* Smaller Icon */}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}