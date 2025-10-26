// data/workTypes/constants.js
// Danh sách loại công việc cứng

export const WORK_TYPES = [
    {
        code: 'design_banner',
        name: 'Thiết kế Banner',
        icon: '🎨',
        color: 'purple'
    },
    {
        code: 'design_poster',
        name: 'Thiết kế Poster',
        icon: '🖼️',
        color: 'purple'
    },
    {
        code: 'design_logo',
        name: 'Thiết kế Logo',
        icon: '✨',
        color: 'purple'
    },
    {
        code: 'video_edit',
        name: 'Dựng Video',
        icon: '🎬',
        color: 'blue'
    },
    {
        code: 'video_motion',
        name: 'Motion Graphics',
        icon: '🎞️',
        color: 'blue'
    },
    {
        code: 'content_writing',
        name: 'Viết Bài',
        icon: '✍️',
        color: 'green'
    },
    {
        code: 'content_translate',
        name: 'Dịch Thuật',
        icon: '🌐',
        color: 'green'
    },
    {
        code: 'social_media',
        name: 'Quản Lý Social',
        icon: '📱',
        color: 'orange'
    },
    {
        code: 'marketing_plan',
        name: 'Lập Kế Hoạch Marketing',
        icon: '📊',
        color: 'orange'
    },
    {
        code: 'dev_frontend',
        name: 'Dev Frontend',
        icon: '💻',
        color: 'cyan'
    },
    {
        code: 'dev_backend',
        name: 'Dev Backend',
        icon: '⚙️',
        color: 'cyan'
    },
    {
        code: 'dev_mobile',
        name: 'Dev Mobile App',
        icon: '📱',
        color: 'cyan'
    },
    {
        code: 'qa_testing',
        name: 'QA Testing',
        icon: '🧪',
        color: 'red'
    },
    {
        code: 'qa_review',
        name: 'Review & Feedback',
        icon: '✅',
        color: 'red'
    },
    {
        code: 'data_entry',
        name: 'Nhập Liệu',
        icon: '📝',
        color: 'gray'
    },
    {
        code: 'research',
        name: 'Nghiên Cứu',
        icon: '🔍',
        color: 'indigo'
    },
    {
        code: 'presentation',
        name: 'Làm Slide/Thuyết Trình',
        icon: '📽️',
        color: 'pink'
    },
    {
        code: 'other',
        name: 'Khác',
        icon: '📌',
        color: 'gray'
    }
];

export const getWorkTypeByCode = (code) => {
    return WORK_TYPES.find(wt => wt.code === code) || WORK_TYPES.find(wt => wt.code === 'other');
};

export const getWorkTypeColor = (color) => {
    const colors = {
        purple: 'bg-purple-100 text-purple-700 border-purple-300',
        blue: 'bg-blue-100 text-blue-700 border-blue-300',
        green: 'bg-green-100 text-green-700 border-green-300',
        orange: 'bg-orange-100 text-orange-700 border-orange-300',
        cyan: 'bg-cyan-100 text-cyan-700 border-cyan-300',
        red: 'bg-red-100 text-red-700 border-red-300',
        gray: 'bg-gray-100 text-gray-700 border-gray-300',
        indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300',
        pink: 'bg-pink-100 text-pink-700 border-pink-300',
    };
    return colors[color] || colors.gray;
};
