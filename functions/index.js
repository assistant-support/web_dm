/**
 * Rút ngắn một chuỗi văn bản theo nhiều cách khác nhau.
 *
 * @param {string} text - Chuỗi văn bản gốc cần rút ngắn.
 * @param {object} options - Đối tượng chứa các tùy chọn để rút ngắn.
 * @param {'end' | 'middle' | 'start'} [options.mode='end'] - Chế độ rút ngắn.
 * - 'end': Rút ngắn ở cuối (mặc định).
 * - 'middle': Rút ngắn ở giữa.
 * - 'start': Rút ngắn ở đầu.
 * @param {number} [options.maxLength=50] - Độ dài tối đa cho chế độ 'end'.
 * @param {number} [options.startChars=5] - Số ký tự giữ lại ở đầu cho chế độ 'middle'.
 * @param {number} [options.endChars=5] - Số ký tự giữ lại ở cuối cho chế độ 'middle' và 'start'.
 * @param {string} [options.ellipsis='...'] - Chuỗi ký tự thay thế phần bị cắt.
 * @returns {string} Chuỗi văn bản đã được rút ngắn.
 */
export function truncateText(text, options = {}) {
    // Kiểm tra đầu vào
    if (typeof text !== 'string' || text.length === 0) {
        return '';
    }

    // Thiết lập các giá trị mặc định
    const {
        mode = 'end',
        maxLength = 50,
        startChars = 5,
        endChars = 5,
        ellipsis = '...',
    } = options;

    // Nếu văn bản đủ ngắn, trả về nguyên bản
    if (text.length <= maxLength && mode === 'end') {
        return text;
    }
    if (text.length <= startChars + endChars && mode === 'middle') {
        return text;
    }
    if (text.length <= endChars && mode === 'start') {
        return text;
    }

    switch (mode) {
        // Trường hợp 2: Rút ngắn ở giữa
        case 'middle': {
            const start = text.substring(0, startChars);
            const end = text.substring(text.length - endChars);
            return `${start}${ellipsis}${end}`;
        }

        // Trường hợp 3: Rút ngắn ở đầu
        case 'start': {
            const end = text.substring(text.length - endChars);
            return `${ellipsis}${end}`;
        }

        // Trường hợp 1: Rút ngắn ở cuối (mặc định)
        case 'end':
        default: {
            return text.substring(0, maxLength) + ellipsis;
        }
    }
}


export const getInitials = (name) => {
    if (!name) return '';
    const words = name.split(' ');
    if (words.length > 1) {
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return (name[0] || '').toUpperCase();
};

// Chuyển thành dạng ảnh hiển thị - Drive
export const driveImage = (id) => {
    if (!id) return null;
    if (id.startsWith('https://lh3.googleusercontent.com/d/')) return id;
    return `https://lh3.googleusercontent.com/d/${id}`;
}