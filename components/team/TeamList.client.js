// components/team/TeamList.client.js
// Mục đích: Grid layout hiển thị danh sách teams

'use client';

import TeamCard from './TeamCard.client.js';

/**
 * TeamList Component
 * @param {Object} props
 * @param {Array} props.teams - Danh sách teams
 * @param {string} props.currentUserId - ID của user hiện tại
 */
export default function TeamList({ teams, currentUserId }) {
    // Sort: Active teams trước, sau đó theo updatedAt
    const sortedTeams = [...teams].sort((a, b) => {
        // Active trước
        if (a.isActive !== b.isActive) {
            return a.isActive ? -1 : 1;
        }
        // Sau đó sort theo updatedAt (mới nhất trước)
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    if (sortedTeams.length === 0) {
        return null; // Parent sẽ hiển thị empty state
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedTeams.map((team) => (
                <TeamCard
                    key={team._id}
                    team={team}
                    currentUserId={currentUserId}
                />
            ))}
        </div>
    );
}
