// components/project/MemberList.client.js
// Mục đích: Hiển thị và quản lý members của project

'use client';

import { useState } from 'react';
import MemberRow from './MemberRow.client.js';
import AddMemberDialog from './AddMemberDialog.client.js';
import { Users, Plus } from 'lucide-react';

/**
 * MemberList - Component quản lý members của project
 * @param {Object} props
 * @param {string} props.projectId - Project ID
 * @param {Array} props.members - Mảng members [{userId, role, createdAt, updatedAt}]
 * @param {boolean} props.canManage - User có quyền manage không
 * @param {Function} props.onRefresh - Callback để refresh data
 */
export default function MemberList({ projectId, members = [], canManage = false, onRefresh }) {
    const [showAddDialog, setShowAddDialog] = useState(false);

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold text-gray-900">
                        Members ({members.length})
                    </h2>
                </div>
                {canManage && (
                    <button
                        onClick={() => setShowAddDialog(true)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                    >
                        <Plus className="h-4 w-4" />
                        Add Member
                    </button>
                )}
            </div>

            {members.length === 0 ? (
                <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No members yet</p>
                    {canManage && (
                        <button
                            onClick={() => setShowAddDialog(true)}
                            className="mt-4 text-sm text-indigo-600 hover:text-indigo-500"
                        >
                            Add your first member
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {members.map((member) => (
                        <MemberRow
                            key={member.userId}
                            projectId={projectId}
                            member={member}
                            canManage={canManage}
                            onRefresh={onRefresh}
                        />
                    ))}
                </div>
            )}

            {showAddDialog && (
                <AddMemberDialog
                    projectId={projectId}
                    existingMembers={members}
                    onClose={() => setShowAddDialog(false)}
                    onSuccess={() => {
                        setShowAddDialog(false);
                        if (onRefresh) onRefresh();
                    }}
                />
            )}
        </div>
    );
}
