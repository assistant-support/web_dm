// lib/file-display.js
// Utilities để hiển thị file từ Google Drive với icon, preview, và thumbnail phù hợp

/**
 * MIME Type Categories - Phân loại chi tiết các loại file
 */
export const MIME_CATEGORIES = {
    // Images
    IMAGE: {
        types: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'],
        patterns: [/^image\//],
        label: 'Hình ảnh',
        color: 'blue',
    },
    
    // Videos
    VIDEO: {
        types: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
        patterns: [/^video\//],
        label: 'Video',
        color: 'purple',
    },
    
    // Audio
    AUDIO: {
        types: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'],
        patterns: [/^audio\//],
        label: 'Âm thanh',
        color: 'pink',
    },
    
    // Documents
    PDF: {
        types: ['application/pdf'],
        patterns: [/pdf/],
        label: 'PDF',
        color: 'red',
    },
    
    WORD: {
        types: [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.google-apps.document',
        ],
        patterns: [/word/, /document/],
        label: 'Word',
        color: 'blue',
    },
    
    EXCEL: {
        types: [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.google-apps.spreadsheet',
        ],
        patterns: [/excel/, /spreadsheet/],
        label: 'Excel',
        color: 'green',
    },
    
    POWERPOINT: {
        types: [
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.google-apps.presentation',
        ],
        patterns: [/powerpoint/, /presentation/],
        label: 'PowerPoint',
        color: 'orange',
    },
    
    // Text & Code
    TEXT: {
        types: ['text/plain', 'text/html', 'text/css', 'text/javascript', 'text/markdown'],
        patterns: [/^text\//],
        label: 'Text',
        color: 'gray',
    },
    
    CODE: {
        types: [
            'application/javascript',
            'application/json',
            'application/xml',
            'text/x-python',
            'text/x-java',
        ],
        patterns: [/javascript/, /json/, /xml/, /python/, /java/],
        label: 'Code',
        color: 'indigo',
    },
    
    // Archives
    ARCHIVE: {
        types: [
            'application/zip',
            'application/x-rar-compressed',
            'application/x-7z-compressed',
            'application/x-tar',
            'application/gzip',
        ],
        patterns: [/zip/, /rar/, /7z/, /tar/, /gzip/],
        label: 'Archive',
        color: 'yellow',
    },
    
    // Google Apps
    GOOGLE_DOCS: {
        types: ['application/vnd.google-apps.document'],
        patterns: [],
        label: 'Google Docs',
        color: 'blue',
    },
    
    GOOGLE_SHEETS: {
        types: ['application/vnd.google-apps.spreadsheet'],
        patterns: [],
        label: 'Google Sheets',
        color: 'green',
    },
    
    GOOGLE_SLIDES: {
        types: ['application/vnd.google-apps.presentation'],
        patterns: [],
        label: 'Google Slides',
        color: 'yellow',
    },
    
    // Other
    OTHER: {
        types: [],
        patterns: [],
        label: 'Khác',
        color: 'gray',
    },
};

/**
 * Detect file category from MIME type
 * @param {string} mimeType - MIME type của file
 * @returns {string} Category key
 */
export function detectFileCategory(mimeType) {
    if (!mimeType) return 'OTHER';
    
    const mime = mimeType.toLowerCase();
    
    for (const [category, config] of Object.entries(MIME_CATEGORIES)) {
        // Check exact type match
        if (config.types.some(type => type.toLowerCase() === mime)) {
            return category;
        }
        
        // Check pattern match
        if (config.patterns.some(pattern => pattern.test(mime))) {
            return category;
        }
    }
    
    return 'OTHER';
}

/**
 * Get file display info (icon, color, label)
 * @param {string} mimeType - MIME type
 * @param {string} kind - File kind (image/video/doc/other)
 * @returns {object} Display configuration
 */
export function getFileDisplayInfo(mimeType, kind) {
    const category = detectFileCategory(mimeType);
    const config = MIME_CATEGORIES[category] || MIME_CATEGORIES.OTHER;
    
    return {
        category,
        label: config.label,
        color: config.color,
        // Tailwind classes
        textColor: `text-${config.color}-600`,
        bgColor: `bg-${config.color}-50`,
        borderColor: `border-${config.color}-200`,
        hoverBg: `hover:bg-${config.color}-100`,
    };
}

/**
 * Generate Google Drive thumbnail/preview URL
 * 
 * Google Drive URL patterns:
 * - Thumbnail: https://drive.google.com/thumbnail?id=FILE_ID&sz=w400
 * - Direct image: https://lh3.googleusercontent.com/d/FILE_ID
 * - View: https://drive.google.com/file/d/FILE_ID/view
 * - Preview: https://drive.google.com/file/d/FILE_ID/preview
 * - Download: https://drive.google.com/uc?export=download&id=FILE_ID
 * 
 * @param {string} driveFileId - Google Drive file ID
 * @param {object} options - Display options
 * @returns {object} URLs for different purposes
 */
export function getDriveFileUrls(driveFileId, options = {}) {
    if (!driveFileId) {
        return {
            thumbnail: null,
            preview: null,
            view: null,
            download: null,
            embed: null,
        };
    }
    
    const { 
        thumbnailSize = 400,  // Width in pixels (w100, w200, w400, w800, w1600)
        quality = 'high',     // 'low', 'medium', 'high'
    } = options;
    
    return {
        // Thumbnail - Tốt nhất cho grid/list view
        thumbnail: `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w${thumbnailSize}`,
        
        // Direct image URL - Tốt cho image preview
        // CHỈ hoạt động với file có quyền "Anyone with the link can view"
        direct: `https://lh3.googleusercontent.com/d/${driveFileId}`,
        
        // Direct with size - Có thể resize
        directWithSize: `https://lh3.googleusercontent.com/d/${driveFileId}=w${thumbnailSize}`,
        
        // Preview URL - Embed trong iframe
        preview: `https://drive.google.com/file/d/${driveFileId}/preview`,
        
        // View URL - Mở trong Drive viewer
        view: `https://drive.google.com/file/d/${driveFileId}/view`,
        
        // Download URL - Force download
        download: `https://drive.google.com/uc?export=download&id=${driveFileId}`,
        
        // Embed URL - Cho iframe (video, docs)
        embed: `https://drive.google.com/file/d/${driveFileId}/preview`,
    };
}

/**
 * Get optimal display URL based on file type
 * @param {object} file - File object with driveFileId, mimeType, kind
 * @param {string} displayMode - 'thumbnail' | 'preview' | 'full'
 * @returns {string} Optimal URL
 */
export function getFileDisplayUrl(file, displayMode = 'thumbnail') {
    const { driveFileId, mimeType, kind, webViewLink, webContentLink } = file;
    
    if (!driveFileId) {
        return webViewLink || webContentLink || null;
    }
    
    const urls = getDriveFileUrls(driveFileId);
    const category = detectFileCategory(mimeType);
    
    // Images - Use direct Googleusercontent URL
    if (category === 'IMAGE' || kind === 'image') {
        if (displayMode === 'thumbnail') {
            return urls.directWithSize; // Resized image
        }
        return urls.direct; // Full resolution
    }
    
    // Videos - Use preview URL for embed
    if (category === 'VIDEO' || kind === 'video') {
        return urls.preview; // Can be embedded in iframe
    }
    
    // Documents (PDF, Word, Excel, etc) - Use preview
    if (['PDF', 'WORD', 'EXCEL', 'POWERPOINT', 'GOOGLE_DOCS', 'GOOGLE_SHEETS', 'GOOGLE_SLIDES'].includes(category)) {
        if (displayMode === 'thumbnail') {
            return urls.thumbnail;
        }
        return urls.preview; // Can be embedded
    }
    
    // For other files, use thumbnail or view link
    if (displayMode === 'thumbnail') {
        return urls.thumbnail;
    }
    
    return urls.view;
}

/**
 * Check if file can be previewed in browser
 * @param {string} mimeType - MIME type
 * @returns {boolean}
 */
export function canPreviewInBrowser(mimeType) {
    const category = detectFileCategory(mimeType);
    
    const previewableCategories = [
        'IMAGE', 'VIDEO', 'AUDIO',
        'PDF', 'TEXT',
        'GOOGLE_DOCS', 'GOOGLE_SHEETS', 'GOOGLE_SLIDES',
        'WORD', 'EXCEL', 'POWERPOINT',
    ];
    
    return previewableCategories.includes(category);
}

/**
 * Check if file can be embedded in iframe
 * @param {string} mimeType - MIME type
 * @returns {boolean}
 */
export function canEmbedFile(mimeType) {
    const category = detectFileCategory(mimeType);
    
    const embeddableCategories = [
        'VIDEO', 'AUDIO',
        'PDF',
        'GOOGLE_DOCS', 'GOOGLE_SHEETS', 'GOOGLE_SLIDES',
    ];
    
    return embeddableCategories.includes(category);
}

/**
 * Format file size to human readable
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Get file extension from name or mime type
 * @param {string} fileName - File name
 * @param {string} mimeType - MIME type
 * @returns {string} Extension (without dot)
 */
export function getFileExtension(fileName, mimeType) {
    // Try from filename first
    if (fileName) {
        const match = fileName.match(/\.([^.]+)$/);
        if (match) return match[1].toLowerCase();
    }
    
    // Fallback to mime type
    const mimeToExt = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'video/mp4': 'mp4',
        'video/quicktime': 'mov',
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/zip': 'zip',
        'text/plain': 'txt',
        'application/json': 'json',
    };
    
    return mimeToExt[mimeType] || '';
}

/**
 * Get color scheme for file type
 * @param {string} mimeType - MIME type
 * @returns {object} Color configuration
 */
export function getFileColors(mimeType) {
    const category = detectFileCategory(mimeType);
    const config = MIME_CATEGORIES[category] || MIME_CATEGORIES.OTHER;
    
    const colorMap = {
        blue: { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:bg-blue-100' },
        purple: { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', hover: 'hover:bg-purple-100' },
        pink: { text: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', hover: 'hover:bg-pink-100' },
        red: { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', hover: 'hover:bg-red-100' },
        green: { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', hover: 'hover:bg-green-100' },
        yellow: { text: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', hover: 'hover:bg-yellow-100' },
        orange: { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', hover: 'hover:bg-orange-100' },
        indigo: { text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', hover: 'hover:bg-indigo-100' },
        gray: { text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', hover: 'hover:bg-gray-100' },
    };
    
    return colorMap[config.color] || colorMap.gray;
}

/**
 * Generate complete file display configuration
 * @param {object} file - File object
 * @returns {object} Complete display config
 */
export function getCompleteFileConfig(file) {
    const { driveFileId, driveName, mimeType, kind, size } = file;
    
    const category = detectFileCategory(mimeType);
    const displayInfo = getFileDisplayInfo(mimeType, kind);
    const urls = getDriveFileUrls(driveFileId);
    const colors = getFileColors(mimeType);
    const extension = getFileExtension(driveName, mimeType);
    
    return {
        // Basic info
        category,
        label: displayInfo.label,
        extension,
        formattedSize: formatFileSize(size),
        
        // URLs
        urls,
        thumbnailUrl: getFileDisplayUrl(file, 'thumbnail'),
        previewUrl: getFileDisplayUrl(file, 'preview'),
        fullUrl: getFileDisplayUrl(file, 'full'),
        
        // Capabilities
        canPreview: canPreviewInBrowser(mimeType),
        canEmbed: canEmbedFile(mimeType),
        
        // Styling
        colors,
        
        // Display mode recommendations
        displayMode: category === 'IMAGE' ? 'image' : 
                    category === 'VIDEO' ? 'video' :
                    ['PDF', 'WORD', 'EXCEL', 'POWERPOINT'].includes(category) ? 'document' :
                    'file',
    };
}
