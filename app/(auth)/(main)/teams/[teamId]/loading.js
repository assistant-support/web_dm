// app/(auth)/(main)/teams/[teamId]/loading.js
// Mục đích: Loading skeleton cho team detail page

export default function TeamDetailLoading() {
    return (
        <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="bg-white rounded-lg border p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 space-y-3">
                        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
            </div>

            {/* Members List Skeleton */}
            <div className="bg-white rounded-lg border">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-9 w-32 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="divide-y">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between py-3 px-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                                <div className="space-y-2">
                                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                            </div>
                            <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
