// components/ui/settings/SettingsTab.js
// Reusable settings tab navigation

'use client';

export default function SettingsTab({ tabs, activeTab, onTabChange }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                            isActive
                                ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                                : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
                        }`}
                    >
                        {Icon && <Icon className="w-5 h-5" />}
                        <span className="font-medium">{tab.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
