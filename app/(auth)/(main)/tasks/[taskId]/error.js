// app/(auth)/(main)/tasks/[taskId]/error.js
// Mục đích: Error boundary cho task detail page

'use client';

export default function TaskDetailError({ error, reset }) {
    return (
        <div className="space-y-6">
            <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                            Something went wrong!
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                            <p>{error.message || 'Failed to load task'}</p>
                        </div>
                        <div className="mt-4">
                            <button
                                onClick={reset}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
