// app/(auth)/(main)/tasks/[taskId]/loading.js
// Mục đích: Loading state cho task detail page

export default function TaskDetailLoading() {
    return (
        <div className="space-y-6 animate-pulse w-full">
            {/* Breadcrumb skeleton */}
            <div className="h-5 bg-gray-200 rounded w-48"></div>

            {/* Task detail skeleton */}
            <div className="bg-white shadow rounded-lg">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>

                {/* Body */}
                <div className="px-6 py-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-24"></div>
                                <div className="h-32 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-16"></div>
                                <div className="h-8 bg-gray-200 rounded w-32"></div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-16"></div>
                                <div className="h-8 bg-gray-200 rounded w-32"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
