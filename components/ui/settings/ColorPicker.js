// components/ui/settings/ColorPicker.js
// Reusable color picker component

'use client';

const PRESET_COLORS = [
    '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444',
    '#F59E0B', '#10B981', '#06B6D4', '#6366F1'
];

export default function ColorPicker({ value, onChange, className = '' }) {
    return (
        <div className={className}>
            {/* Preset Colors */}
            <div className="flex gap-3 flex-wrap mb-4">
                {PRESET_COLORS.map(color => (
                    <button
                        key={color}
                        type="button"
                        onClick={() => onChange(color)}
                        className={`w-12 h-12 rounded-lg border-4 transition-all ${
                            value === color
                                ? 'border-gray-900 scale-110 shadow-lg'
                                : 'border-gray-200 hover:border-gray-400 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                    />
                ))}
            </div>

            {/* Custom Color Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hoặc nhập mã màu tùy chỉnh
                </label>
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#3B82F6"
                    className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={32}
                />
            </div>
        </div>
    );
}
