import { FolderOpen, Image as ImageIcon, Video, FileText, File, Sparkles } from 'lucide-react';

const KIND_CONFIG = {
    image: {
        label: 'Hình ảnh',
        icon: ImageIcon,
        color: 'text-blue-600 bg-blue-50',
    },
    video: {
        label: 'Video',
        icon: Video,
        color: 'text-purple-600 bg-purple-50',
    },
    doc: {
        label: 'Tài liệu',
        icon: FileText,
        color: 'text-emerald-600 bg-emerald-50',
    },
    other: {
        label: 'Khác',
        icon: File,
        color: 'text-slate-600 bg-slate-100',
    },
};

function formatSize(bytes = 0) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
    const value = bytes / Math.pow(1024, i);
    return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${sizes[i]}`;
}

export default function FileStatsCard({ stats }) {
    const totalSize = stats.byKind.reduce((acc, item) => acc + (item.totalSize || 0), 0);

    const summaryCards = [
        {
            key: 'total',
            label: 'Tổng số file',
            value: stats.total,
            icon: FolderOpen,
            color: 'text-slate-700 bg-slate-100',
        },
        {
            key: 'recent',
            label: 'Trong 7 ngày',
            value: stats.recentUploads,
            icon: Sparkles,
            color: 'text-amber-600 bg-amber-50',
        },
        {
            key: 'size',
            label: 'Dung lượng',
            value: formatSize(totalSize),
            icon: File,
            color: 'text-teal-600 bg-teal-50',
        },
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {summaryCards.map(({ key, label, value, icon: Icon, color }) => (
                <div key={key} className="rounded-md border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${color}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm text-gray-500">{label}</p>
                            <p className="truncate text-xl font-semibold text-gray-900">{value}</p>
                        </div>
                    </div>
                </div>
            ))}

            {stats.byKind.map(({ kind, count, totalSize: kindSize }) => {
                const config = KIND_CONFIG[kind] || KIND_CONFIG.other;
                const Icon = config.icon;
                return (
                    <div key={kind} className="rounded-md border border-gray-200 bg-white p-4">
                        <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-md ${config.color}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm text-gray-500">{config.label}</p>
                                <p className="truncate text-xl font-semibold text-gray-900">{count}</p>
                                <p className="truncate text-xs text-gray-500">{formatSize(kindSize)}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
