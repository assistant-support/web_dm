// components/project/MemberListWrapper.client.js
// Mục đích: Wrapper cho MemberList với router refresh support

'use client';

import { useRouter } from 'next/navigation';
import MemberList from './MemberList';

/**
 * MemberListWrapper - Wrapper component với router refresh
 * @param {Object} props
 * @param {string} props.projectId - Project ID
 * @param {Array} props.initialMembers - Initial members data
 * @param {boolean} props.canManage - User có quyền manage không
 */
export default function MemberListWrapper({ projectId, initialMembers, canManage }) {
    const router = useRouter();

    const handleRefresh = () => {
        router.refresh();
    };

    return (
        <MemberList
            projectId={projectId}
            members={initialMembers}
            canManage={canManage}
            onRefresh={handleRefresh}
        />
    );
}
