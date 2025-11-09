import {
    Image as ImageIcon,
    Video,
    File,
    FileText,
    FileArchive,
    FileSpreadsheet,
    FileType2,
    FileCode,
    FileAudio,
} from 'lucide-react';
import { detectFileCategory } from '@/lib/file-display.js';

const CATEGORY_ALIAS = {
    GOOGLE_DOCS: 'WORD',
    GOOGLE_SHEETS: 'EXCEL',
    GOOGLE_SLIDES: 'POWERPOINT',
};

const FILE_ICON_CONFIG = {
    IMAGE: {
        icon: ImageIcon,
        badgeClass: 'bg-blue-50 text-blue-600',
        headerClass: 'text-blue-600',
    },
    VIDEO: {
        icon: Video,
        badgeClass: 'bg-purple-50 text-purple-600',
        headerClass: 'text-purple-600',
    },
    AUDIO: {
        icon: FileAudio,
        badgeClass: 'bg-amber-50 text-amber-600',
        headerClass: 'text-amber-600',
    },
    PDF: {
        icon: FileText,
        badgeClass: 'bg-red-50 text-red-600',
        headerClass: 'text-red-600',
    },
    WORD: {
        icon: FileType2,
        badgeClass: 'bg-blue-50 text-blue-600',
        headerClass: 'text-blue-600',
    },
    EXCEL: {
        icon: FileSpreadsheet,
        badgeClass: 'bg-emerald-50 text-emerald-600',
        headerClass: 'text-emerald-600',
    },
    POWERPOINT: {
        icon: FileType2,
        badgeClass: 'bg-orange-50 text-orange-600',
        headerClass: 'text-orange-600',
    },
    TEXT: {
        icon: FileText,
        badgeClass: 'bg-slate-50 text-slate-600',
        headerClass: 'text-slate-600',
    },
    CODE: {
        icon: FileCode,
        badgeClass: 'bg-indigo-50 text-indigo-600',
        headerClass: 'text-indigo-600',
    },
    ARCHIVE: {
        icon: FileArchive,
        badgeClass: 'bg-yellow-50 text-yellow-600',
        headerClass: 'text-yellow-600',
    },
    OTHER: {
        icon: File,
        badgeClass: 'bg-slate-100 text-slate-600',
        headerClass: 'text-slate-600',
    },
};

export function getFileIconConfig(file) {
    const mime = file?.mime || file?.mimeType || '';
    const category = detectFileCategory(mime);
    const normalized = CATEGORY_ALIAS[category] || category;
    return FILE_ICON_CONFIG[normalized] || FILE_ICON_CONFIG.OTHER;
}

export { FILE_ICON_CONFIG };
