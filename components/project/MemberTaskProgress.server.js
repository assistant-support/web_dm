import UserDisplay from '@/components/ui/user-display';
import { TASK_STATUS } from '@/model/common/enums';

export default function MemberTaskProgress({ members = [], usersMap = {}, memberTaskStats = {} }) {
    if (members.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="text-center text-gray-500">
                    <p className="font-medium">Chưa có thành viên nào trong dự án</p>
                    <p className="text-sm mt-1">Thêm thành viên để bắt đầu theo dõi tiến độ</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {/* Header đơn giản */}
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                    Tiến độ công việc thành viên ({members.length})
                </h3>
            </div>

            {/* Members List - Simple Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Thành viên
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                Tổng CV
                            </th>
                             <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                Đang làm
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                Chờ duyệt
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                Hoàn thành
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                Điểm
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Tiến độ
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {members.map(member => {
                            const userInfo = usersMap[member.userId];
                            const stats = memberTaskStats[member.userId] || {
                                statusCounts: {},
                                points: 0,
                                totalTasks: 0
                            };

                            const inProgress = stats.statusCounts[TASK_STATUS.IN_PROGRESS] || 0;
                            const awaitReview = stats.statusCounts[TASK_STATUS.COMPLETED_AWAIT_REVIEW] || 0;
                            const completed = stats.statusCounts[TASK_STATUS.COMPLETED] || 0;
                            const completionPercentage = stats.totalTasks > 0 
                                ? Math.round((completed / stats.totalTasks) * 100) 
                                : 0;

                            return (
                                <tr key={member.userId}>
                                    {/* Member Name */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <UserDisplay
                                            userId={member.userId}
                                            userInfo={userInfo}
                                            showJobTitle={false}
                                            showEmail={false}
                                            size="sm"
                                        />
                                    </td>

                                    {/* Total Tasks */}
                                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm font-medium text-gray-900">
                                        {stats.totalTasks}
                                    </td>

                                    {/* In Progress */}
                                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-700">
                                        {inProgress > 0 && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                {inProgress}
                                            </span>
                                        )}
                                        {inProgress === 0 && '-'}
                                    </td>

                                    {/* Await Review */}
                                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-700">
                                        {awaitReview > 0 && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                {awaitReview}
                                            </span>
                                        )}
                                        {awaitReview === 0 && '-'}
                                    </td>

                                    {/* Completed */}
                                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-700">
                                        {completed > 0 && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                {completed}
                                            </span>
                                        )}
                                        {completed === 0 && '-'}
                                    </td>

                                    {/* Points */}
                                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm font-semibold text-gray-900">
                                        {stats.points}
                                    </td>

                                    {/* Progress Bar */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className="bg-green-600 h-full rounded-full"
                                                    style={{ width: `${completionPercentage}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-gray-600 w-10 text-right">
                                                {completionPercentage}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
