// app/(auth)/(main)/teams/[teamId]/loading.js
// Mục đích: Loading skeleton cho [teamId]/page.js (Tab Tổng quan)
// Tối ưu: Skeleton này chỉ hiển thị cho phần `children` (nội dung tab).

export default function TeamOverviewLoading() {
    return (
        <div className="space-y-6 w-full flex flex-col animate-pulse">
            {/* Skeleton cho Description */}
            <div>
                <div className="h-5 w-24 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-full bg-gray-200 rounded"></div>
                <div className="h-4 w-3/4 bg-gray-200 rounded mt-2"></div>
            </div>

            {/* Skeleton cho Quick Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-200"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                                <div className="h-6 w-1/4 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Skeleton cho Quick Links */}
            <div>
                <div className="h-5 w-32 bg-gray-200 rounded mb-3"></div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-4 rounded-lg border border-gray-200">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-200"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
                                <div className="h-3 w-2/3 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Skeleton cho Team Info */}
            <div className="border-t border-gray-200 pt-4">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                    <div>
                        <div className="h-4 w-20 bg-gray-200 rounded mb-1"></div>
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    </div>
                    <div>
                        <div className="h-4 w-32 bg-gray-200 rounded mb-1"></div>
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    </div>
                </dl>
            </div>
        </div>
    );
}