/**
 * @file components/project/MemberList.js
 * @description Server Component to display the list of project members with stats.
 */
import MemberStatsRow from './MemberStatsRow';
import { AddMemberButton } from './AddMemberDialog.client';

/**
 * Renders the list of members for a project with stats.
 * @param {object} props
 * @param {string} props.projectId - The ID of the current project.
 * @param {string} props.teamId - The ID of the project's team.
 * @param {Array<object>} props.members - The list of member objects.
 * @param {Object} props.usersMap - A map of user info, keyed by user ID.
 * @param {Object} props.memberStats - A map of member stats, keyed by user ID.
 * @param {boolean} props.isManager - Whether the current user is a manager.
 * @param {string} props.currentUserId - Current user ID.
 * @returns {JSX.Element}
 */
export default function MemberList({ 
    projectId,
    teamId,
    members, 
    usersMap = {}, 
    memberStats = {}, 
    isManager, 
    currentUserId 
}) {
    return (
        <div className="bg-white rounded-lg border">
            <div className="p-4 border-b flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">Thành viên ({members.length})</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Công việc hiện tại • Hoàn thành tháng • Tổng hoàn thành • Điểm tháng
                    </p>
                </div>
                {isManager && (
                    <AddMemberButton 
                        projectId={projectId}
                        teamId={teamId}
                        currentMembers={members}
                    />
                )}
            </div>
            <div className="divide-y divide-gray-200">
                {members.length > 0 ? (
                    members.map((member) => (
                        <MemberStatsRow
                            key={member.userId}
                            projectId={projectId}
                            member={member}
                            userInfo={usersMap[member.userId] || null}
                            stats={memberStats[member.userId] || null}
                            isManager={isManager}
                            currentUserId={currentUserId}
                        />
                    ))
                ) : (
                    <p className="p-6 text-center text-gray-500">Chưa có thành viên nào trong dự án.</p>
                )}
            </div>
        </div>
    );
}