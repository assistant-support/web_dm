export default function ProjectOverviewLoading() {
    return (
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="p-6 space-y-6 animate-pulse">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, idx) => (
                        <div
                            key={idx}
                            className="h-32 bg-gray-100 rounded-xl border border-gray-200"
                        />
                    ))}
                </div>

                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="h-4 w-48 bg-gray-100 rounded" />
                    </div>
                    <div className="p-6 space-y-4">
                        {[...Array(4)].map((_, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <div className="h-4 w-56 bg-gray-100 rounded" />
                                <div className="h-4 w-16 bg-gray-100 rounded" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="h-4 w-52 bg-gray-100 rounded" />
                    </div>
                    <div className="p-6 space-y-3">
                        {[...Array(5)].map((_, idx) => (
                            <div key={idx} className="h-3 w-full bg-gray-100 rounded" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
