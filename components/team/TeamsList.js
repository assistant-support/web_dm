// components/team/TeamsList.js
// Server Component - Render danh sách teams theo view mode

import TeamCard from './TeamCard.js';
import TeamListItem from './TeamListItem.js';

/**
 * TeamsList Server Component
 * Render danh sách teams dưới dạng card grid hoặc list
 * 
 * @param {Object} props
 * @param {Array} props.teams - Danh sách teams đã sort
 * @param {string} props.currentUserId - ID user hiện tại
 * @param {'card'|'list'} props.viewMode - Chế độ hiển thị
 */
export default function TeamsList({ teams, currentUserId, viewMode = 'card' }) {
    if (!teams || teams.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Chưa có nhóm làm việc</h3>
                <p className="text-sm text-gray-500 mb-6">
                    Bắt đầu bằng cách tạo nhóm làm việc đầu tiên của bạn
                </p>
            </div>
        );
    }

    if (viewMode === 'list') {
        return (
            <div className="bg-white rounded-lg border border-gray-200 overflow-scroll">
                <div className="divide-y divide-gray-200">
                    {teams.map((team) => (
                        <TeamListItem
                            key={team._id}
                            team={team}
                            currentUserId={currentUserId}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // Card view (default)
    return (
        <div className='flex-1 overflow-y-auto'>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ">
                {teams.map((team) => (
                    <TeamCard
                        key={team._id}
                        team={team}
                        currentUserId={currentUserId}
                    />
                ))}
            </div>
        </div>
    );
}
