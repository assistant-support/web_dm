// components/ui/FileCard.client.js
// Card component đẹp để hiển thị file trong grid view

'use client';

import { useState } from 'react';
import { Download, Eye, Trash2, MoreVertical, ExternalLink } from 'lucide-react';
import FileThumbnail from './FileThumbnail.client';
import { getCompleteFileConfig } from '@/lib/file-display';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * FileCard Component
 * Beautiful card to display file in grid view
 * 
 * @param {object} props
 * @param {object} props.file - File object
 * @param {function} props.onPreview - Callback when preview clicked
 * @param {function} props.onDelete - Callback when delete clicked
 * @param {boolean} props.canDelete - Can user delete this file
 * @param {boolean} props.selected - Is file selected
 * @param {function} props.onSelect - Callback when file selected
 * @returns {JSX.Element}
 */
export default function FileCard({ 
    file, 
    onPreview, 
    onDelete,
    canDelete = false,
    selected = false,
    onSelect
}) {
    const [showActions, setShowActions] = useState(false);
    
    const config = getCompleteFileConfig(file);
    
    const handleCardClick = () => {
        if (onPreview) {
            onPreview(file);
        }
    };
    
    const handleDelete = (e) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete(file);
        }
    };
    
    const handleDownload = (e) => {
        e.stopPropagation();
        if (config.urls.download) {
            window.open(config.urls.download, '_blank');
        }
    };
    
    const handleViewInDrive = (e) => {
        e.stopPropagation();
        if (config.urls.view) {
            window.open(config.urls.view, '_blank');
        }
    };
    
    return (
        <div 
            className={`
                group relative bg-white rounded-lg border-2 transition-all duration-200 cursor-pointer
                ${selected ? `${config.colors.border} ${config.colors.bg}` : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}
            `}
            onClick={handleCardClick}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Selection checkbox */}
            {onSelect && (
                <div className="absolute top-2 left-2 z-10">
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => {
                            e.stopPropagation();
                            onSelect(file);
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                </div>
            )}
            
            {/* Actions menu */}
            {showActions && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    <button
                        onClick={handleViewInDrive}
                        className="p-1.5 bg-white rounded-md shadow-sm hover:bg-gray-50 border border-gray-200"
                        title="Xem trên Drive"
                    >
                        <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    {file.webContentLink && (
                        <button
                            onClick={handleDownload}
                            className="p-1.5 bg-white rounded-md shadow-sm hover:bg-gray-50 border border-gray-200"
                            title="Tải xuống"
                        >
                            <Download className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                    )}
                    {canDelete && (
                        <button
                            onClick={handleDelete}
                            className="p-1.5 bg-white rounded-md shadow-sm hover:bg-red-50 border border-gray-200"
                            title="Xóa"
                        >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                    )}
                </div>
            )}
            
            <div className="p-4 flex flex-col items-center">
                {/* Thumbnail */}
                <FileThumbnail 
                    file={file} 
                    size="lg" 
                    showPlayButton={config.category === 'VIDEO'}
                    className="mb-3"
                />
                
                {/* File info */}
                <div className="w-full text-center">
                    {/* File name */}
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1" title={file.driveName}>
                        {file.driveName}
                    </p>
                    
                    {/* File type & size */}
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                        <span className={`px-2 py-0.5 rounded ${config.colors.bg} ${config.colors.text} font-medium`}>
                            {config.label}
                        </span>
                        <span>•</span>
                        <span>{config.formattedSize}</span>
                    </div>
                    
                    {/* Date */}
                    {file.createdAt && (
                        <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(file.createdAt), { 
                                addSuffix: true, 
                                locale: vi 
                            })}
                        </p>
                    )}
                    
                    {/* Project/Task tags */}
                    {(file.project || file.task) && (
                        <div className="flex flex-wrap gap-1 mt-2 justify-center">
                            {file.project && (
                                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                                    {file.project.name}
                                </span>
                            )}
                            {file.task && (
                                <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded line-clamp-1">
                                    {file.task.title}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Preview overlay on hover */}
            {config.canPreview && (
                <div className={`
                    absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 
                    transition-all duration-200 rounded-lg
                    flex items-center justify-center
                `}>
                    <Eye className="w-8 h-8 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            )}
        </div>
    );
}
