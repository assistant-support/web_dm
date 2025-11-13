'use client';

import PropTypes from 'prop-types';

export default function MemberActivityList({ memberStats = [] }) {
    return (
        <section className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <header className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-base font-semibold text-gray-900">Hiệu suất thành viên</h2>
                <p className="mt-1 text-sm text-gray-500">
                    Thống kê số lượng công việc được giao, hoàn thành và điểm thưởng của từng thành viên.
                </p>
            </header>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-600">
                                Thành viên
                            </th>
                            <th scope="col" className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-600">
                                Tasks được giao
                            </th>
                            <th scope="col" className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-600">
                                Tasks hoàn thành
                            </th>
                            <th scope="col" className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-600">
                                Điểm nhận được
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {memberStats.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-6 text-center text-gray-500">
                                    Chưa có dữ liệu thành viên.
                                </td>
                            </tr>
                        ) : (
                            memberStats.map((member) => (
                                <tr key={member.userId}>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900">{member.userName}</span>
                                            <span className="text-xs uppercase text-gray-500">{member.role}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-700">{member.tasksAssigned}</td>
                                    <td className="px-6 py-4 text-gray-700">{member.tasksCompleted}</td>
                                    <td className="px-6 py-4 text-gray-700">
                                        {new Intl.NumberFormat('vi-VN').format(member.pointsEarned || 0)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

MemberActivityList.propTypes = {
    memberStats: PropTypes.arrayOf(
        PropTypes.shape({
            userId: PropTypes.string.isRequired,
            userName: PropTypes.string.isRequired,
            role: PropTypes.string,
            tasksAssigned: PropTypes.number,
            tasksCompleted: PropTypes.number,
            pointsEarned: PropTypes.number,
        })
    ),
};
