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

/**
 * Get Google Drive image URL for display
 * 
 * Google Drive direct image URLs:
 * - Format: https://lh3.googleusercontent.com/d/FILE_ID
 * - With size: https://lh3.googleusercontent.com/d/FILE_ID=w400
 * - Thumbnail: https://drive.google.com/thumbnail?id=FILE_ID&sz=w400
 * 
 * @param {string} id - Google Drive file ID or full URL
 * @param {number} size - Optional width in pixels (e.g., 400, 800, 1600)
 * @returns {string|null} Image URL or null if invalid
 */
export const driveImage = (id, size = null) => {
    if (!id) return null;
    
    // If already a full googleusercontent URL, return as is or add size
    if (id.startsWith('https://lh3.googleusercontent.com/d/')) {
        // Extract file ID from URL
        const match = id.match(/\/d\/([^/=?]+)/);
        if (match) {
            const fileId = match[1];
            return size ? `https://lh3.googleusercontent.com/d/${fileId}=w${size}` : id;
        }
        return id;
    }
    
    // If it's just a file ID, construct the URL
    if (size) {
        return `https://lh3.googleusercontent.com/d/${id}=w${size}`;
    }
    return `https://lh3.googleusercontent.com/d/${id}`;
};

/**
 * Get Google Drive thumbnail URL
 * Better for generating thumbnails than direct image URL
 * 
 * @param {string} fileId - Google Drive file ID
 * @param {number} width - Thumbnail width (100, 200, 400, 800, 1600)
 * @returns {string|null} Thumbnail URL
 */
export const driveThumbnail = (fileId, width = 400) => {
    if (!fileId) return null;
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
};

/**
 * Get Google Drive preview URL (for embedding)
 * Works for documents, videos, etc.
 * 
 * @param {string} fileId - Google Drive file ID
 * @returns {string|null} Preview URL
 */
export const drivePreview = (fileId) => {
    if (!fileId) return null;
    return `https://drive.google.com/file/d/${fileId}/preview`;
};

/**
 * Get Google Drive view URL (opens in Drive viewer)
 * 
 * @param {string} fileId - Google Drive file ID
 * @returns {string|null} View URL
 */
export const driveView = (fileId) => {
    if (!fileId) return null;
    return `https://drive.google.com/file/d/${fileId}/view`;
};

/**
 * Get Google Drive download URL
 * 
 * @param {string} fileId - Google Drive file ID
 * @returns {string|null} Download URL
 */
export const driveDownload = (fileId) => {
    if (!fileId) return null;
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
};