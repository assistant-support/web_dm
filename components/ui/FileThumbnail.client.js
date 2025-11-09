// components/ui/FileThumbnail.client.js
// Component hiển thị thumbnail hoặc icon cho file

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Film, FileText, Music } from 'lucide-react';
import FileIconComponent from './FileIcon.client';
import { getFileDisplayUrl, detectFileCategory, getFileColors } from '@/lib/file-display';

/**
 * FileThumbnail Component
 * Hiển thị thumbnail cho image, icon cho các file khác
 * 
 * @param {object} props
 * @param {object} props.file - File object với driveFileId, mimeType, driveName
 * @param {string} props.size - 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 * @param {string} props.className - Additional classes
 * @param {boolean} props.showPlayButton - Show play button for videos
 * @returns {JSX.Element}
 */
export default function FileThumbnail({ 
    file, 
    size = 'md', 
    className = '',
    showPlayButton = false 
}) {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    
    const category = detectFileCategory(file.mimeType);
    const thumbnailUrl = getFileDisplayUrl(file, 'thumbnail');
    const colors = getFileColors(file.mimeType);
    
    // Size configurations
    const sizeConfig = {
        sm: { container: 'w-12 h-12', icon: 16, image: 48 },
        md: { container: 'w-16 h-16', icon: 24, image: 64 },
        lg: { container: 'w-24 h-24', icon: 32, image: 96 },
        xl: { container: 'w-32 h-32', icon: 48, image: 128 },
    };
    
    const config = sizeConfig[size] || sizeConfig.md;
    
    // For images, try to show actual thumbnail
    if (category === 'IMAGE' && thumbnailUrl && !imageError) {
        return (
            <div className={`${config.container} ${className} relative overflow-hidden rounded-lg bg-gray-100`}>
                <Image
                    src={thumbnailUrl}
                    alt={file.driveName || 'Image'}
                    fill
                    className={`object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                    unoptimized // Google Drive URLs need unoptimized
                />
                {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <FileIconComponent mimeType={file.mimeType} size={config.icon} />
                    </div>
                )}
            </div>
        );
    }
    
    // For videos, show icon with play button overlay
    if (category === 'VIDEO') {
        return (
            <div className={`${config.container} ${className} relative rounded-lg ${colors.bg} flex items-center justify-center`}>
                <FileIconComponent mimeType={file.mimeType} size={config.icon} />
                {showPlayButton && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-white bg-opacity-90 flex items-center justify-center">
                            <Film className="w-5 h-5 text-purple-600" />
                        </div>
                    </div>
                )}
            </div>
        );
    }
    
    // For audio, show icon with audio indicator
    if (category === 'AUDIO') {
        return (
            <div className={`${config.container} ${className} relative rounded-lg ${colors.bg} flex items-center justify-center`}>
                <FileIconComponent mimeType={file.mimeType} size={config.icon} />
                <div className="absolute bottom-1 right-1">
                    <Music className="w-3 h-3 text-pink-400" />
                </div>
            </div>
        );
    }
    
    // For documents, show icon with document type indicator
    if (['PDF', 'WORD', 'EXCEL', 'POWERPOINT', 'GOOGLE_DOCS', 'GOOGLE_SHEETS', 'GOOGLE_SLIDES'].includes(category)) {
        return (
            <div className={`${config.container} ${className} relative rounded-lg ${colors.bg} flex items-center justify-center`}>
                <FileIconComponent mimeType={file.mimeType} size={config.icon} />
                {file.extension && (
                    <div className="absolute bottom-0.5 right-0.5 px-1 py-0.5 bg-white rounded text-[8px] font-bold uppercase text-gray-600 shadow-sm">
                        {file.extension}
                    </div>
                )}
            </div>
        );
    }
    
    // For other files, just show icon
    return (
        <div className={`${config.container} ${className} rounded-lg ${colors.bg} flex items-center justify-center`}>
            <FileIconComponent mimeType={file.mimeType} size={config.icon} />
        </div>
    );
}
