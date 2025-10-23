// components/ui/settings/CapacityInput.js
// Reusable capacity input with presets

'use client';

const PRESET_HOURS = [20, 30, 40, 50, 60];

export default function CapacityInput({ value, onChange, className = '' }) {
    const handleChange = (hours) => {
        const parsedValue = Math.max(0, Math.min(168, Number(hours) || 0));
        onChange(parsedValue);
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Number Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số giờ mỗi tuần (0-168)
                </label>
                <div className="flex items-center gap-4">
                    <input
                        type="number"
                        min="0"
                        max="168"
                        value={value || 40}
                        onChange={(e) => handleChange(e.target.value)}
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-600">giờ/tuần</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                    Mặc định: 40 giờ/tuần (8 giờ/ngày × 5 ngày)
                </p>
            </div>

            {/* Preset Buttons */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hoặc chọn mức sẵn có
                </label>
                <div className="flex gap-2 flex-wrap">
                    {PRESET_HOURS.map(hours => (
                        <button
                            key={hours}
                            type="button"
                            onClick={() => handleChange(hours)}
                            className={`px-4 py-2 rounded-lg border-2 transition-all font-medium ${
                                value === hours
                                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                                    : 'border-gray-300 hover:border-gray-400 text-gray-700'
                            }`}
                        >
                            {hours}h
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
