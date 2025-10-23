// components/ui/settings/SettingItem.js
// Reusable setting item with label, description, and control

'use client';

export default function SettingItem({ 
    label, 
    description, 
    children, 
    className = '' 
}) {
    return (
        <div className={`flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${className}`}>
            <div className="flex-1 pr-4">
                <p className="font-medium text-gray-900">{label}</p>
                {description && (
                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                )}
            </div>
            <div className="flex-shrink-0">
                {children}
            </div>
        </div>
    );
}
