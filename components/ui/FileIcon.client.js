// components/ui/FileIcon.client.js
// Component hiển thị icon file với màu sắc phù hợp theo loại file

'use client';

import {
    FileText,
    Image as ImageIcon,
    Film,
    Music,
    FileArchive,
    FileSpreadsheet,
    FileCode,
    Presentation,
    File as FileIcon,
    FileType,
} from 'lucide-react';
import { detectFileCategory, getFileColors } from '@/lib/file-display';

const CATEGORY_ICONS = {
    IMAGE: ImageIcon,
    VIDEO: Film,
    AUDIO: Music,
    PDF: FileText,
    WORD: FileText,
    EXCEL: FileSpreadsheet,
    POWERPOINT: Presentation,
    TEXT: FileType,
    CODE: FileCode,
    ARCHIVE: FileArchive,
    GOOGLE_DOCS: FileText,
    GOOGLE_SHEETS: FileSpreadsheet,
    GOOGLE_SLIDES: Presentation,
    OTHER: FileIcon,
};

/**
 * FileIcon Component
 * @param {object} props
 * @param {string} props.mimeType - MIME type of file
 * @param {string} props.className - Additional classes
 * @param {number} props.size - Icon size (default: 20)
 * @param {boolean} props.showBackground - Show colored background circle
 * @returns {JSX.Element}
 */
export default function FileIconComponent({ 
    mimeType, 
    className = '', 
    size = 20,
    showBackground = false 
}) {
    const category = detectFileCategory(mimeType);
    const Icon = CATEGORY_ICONS[category] || CATEGORY_ICONS.OTHER;
    const colors = getFileColors(mimeType);
    
    if (showBackground) {
        return (
            <div className={`flex items-center justify-center rounded-lg ${colors.bg} p-2 ${className}`}>
                <Icon className={`${colors.text}`} size={size} />
            </div>
        );
    }
    
    return <Icon className={`${colors.text} ${className}`} size={size} />;
}
