'use client';

import { useState } from 'react';
import { Bell, Palette, Clock, Globe, ExternalLink, Save, CheckCircle2 } from 'lucide-react';
import { updateUserSettings, setColor, setCapacity } from '@/data/appUser/actions';
import { ToggleSwitch, SettingItem, SettingsTab, ColorPicker, CapacityInput } from '@/components/ui/settings';

const DEFAULT_SETTINGS = {
    notifications: {
        email: true,
        taskAssigned: true,
        taskCompleted: true,
        projectUpdates: true,
        mentions: true,
    },
    preferences: {},
    platforms: [],
    color: '#3B82F6',
    capacityHoursPerWeek: 40,
};

export default function SettingsClient({ user = {}, settings: initialSettings }) {
    const [activeTab, setActiveTab] = useState('notifications');
    const [settings, setSettings] = useState({
        ...DEFAULT_SETTINGS,
        ...initialSettings,
        notifications: {
            ...DEFAULT_SETTINGS.notifications,
            ...initialSettings?.notifications,
        },
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // OAuth account URL from environment or default
    const accountUrl = process.env.NEXT_PUBLIC_OAUTH_SERVER_URL || 'http://localhost:3000';

    const tabs = [
        { id: 'notifications', label: 'Thông báo', icon: Bell },
        { id: 'preferences', label: 'Giao diện', icon: Palette },
        { id: 'capacity', label: 'Năng lực', icon: Clock },
        { id: 'platform', label: 'Nền tảng', icon: Globe },
    ];

    const handleToggle = (category, key) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: !prev[category]?.[key]
            }
        }));
        setSaved(false);
    };

    const handleColorChange = (color) => {
        setSettings(prev => ({ ...prev, color }));
        setSaved(false);
    };

    const handleCapacityChange = (hours) => {
        const value = Math.max(0, Math.min(168, Number(hours) || 0));
        setSettings(prev => ({ ...prev, capacityHoursPerWeek: value }));
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);

        try {
            // Save notifications and preferences
            const result = await updateUserSettings({
                notifications: settings.notifications,
                preferences: settings.preferences || {},
                platforms: settings.platforms || [],
            });

            // Save color separately
            if (settings.color !== initialSettings.color) {
                await setColor(settings.color);
            }

            // Save capacity separately
            if (settings.capacityHoursPerWeek !== initialSettings.capacityHoursPerWeek) {
                await setCapacity(settings.capacityHoursPerWeek);
            }

            if (result?.ok || result?.saved) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Không thể lưu cài đặt. Vui lòng thử lại.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 w-full">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                {/* Header */}
                <div className="mb-6 lg:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Cài đặt</h1>
                    <p className="text-sm sm:text-base text-gray-600">Quản lý các tùy chọn cá nhân và thông báo của bạn</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                    {/* Sidebar */}
                    <div className="w-full lg:w-64 flex-shrink-0">
                        <SettingsTab 
                            tabs={tabs} 
                            activeTab={activeTab} 
                            onTabChange={setActiveTab} 
                        />

                        {/* Account Link */}
                        <a
                            href={accountUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 flex items-center gap-2 px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <ExternalLink className="w-5 h-5" />
                            <span className="font-medium">Quản lý tài khoản</span>
                        </a>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            {/* Notifications Tab */}
                            {activeTab === 'notifications' && (
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                        Cài đặt thông báo
                                    </h2>
                                    <p className="text-gray-600 mb-6">
                                        Chọn các loại thông báo bạn muốn nhận
                                    </p>

                                    <div className="space-y-4">
                                        <SettingItem
                                            label="Thông báo qua Email"
                                            description="Nhận thông báo qua email"
                                        >
                                            <ToggleSwitch
                                                checked={settings.notifications?.email !== false}
                                                onChange={() => handleToggle('notifications', 'email')}
                                            />
                                        </SettingItem>
                                        
                                        <SettingItem
                                            label="Nhiệm vụ được giao"
                                            description="Thông báo khi bạn được giao nhiệm vụ mới"
                                        >
                                            <ToggleSwitch
                                                checked={settings.notifications?.taskAssigned !== false}
                                                onChange={() => handleToggle('notifications', 'taskAssigned')}
                                            />
                                        </SettingItem>
                                        
                                        <SettingItem
                                            label="Nhiệm vụ hoàn thành"
                                            description="Thông báo khi nhiệm vụ của bạn được hoàn thành"
                                        >
                                            <ToggleSwitch
                                                checked={settings.notifications?.taskCompleted !== false}
                                                onChange={() => handleToggle('notifications', 'taskCompleted')}
                                            />
                                        </SettingItem>
                                        
                                        <SettingItem
                                            label="Cập nhật dự án"
                                            description="Thông báo về các thay đổi trong dự án"
                                        >
                                            <ToggleSwitch
                                                checked={settings.notifications?.projectUpdates !== false}
                                                onChange={() => handleToggle('notifications', 'projectUpdates')}
                                            />
                                        </SettingItem>
                                        
                                        <SettingItem
                                            label="Nhắc đến trong bình luận"
                                            description="Thông báo khi ai đó nhắc đến bạn"
                                        >
                                            <ToggleSwitch
                                                checked={settings.notifications?.mentions !== false}
                                                onChange={() => handleToggle('notifications', 'mentions')}
                                            />
                                        </SettingItem>
                                    </div>
                                </div>
                            )}

                            {/* Preferences Tab */}
                            {activeTab === 'preferences' && (
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                        Tùy chỉnh giao diện
                                    </h2>
                                    <p className="text-gray-600 mb-6">
                                        Cá nhân hóa giao diện làm việc của bạn
                                    </p>

                                    <div className="space-y-6">
                                        {/* Color Picker */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Màu hiển thị
                                            </label>
                                            <p className="text-sm text-gray-500 mb-3">
                                                Chọn màu sắc hiển thị cho avatar và badge của bạn
                                            </p>
                                            <ColorPicker 
                                                value={settings.color} 
                                                onChange={handleColorChange} 
                                            />
                                        </div>

                                        {/* Preview */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Xem trước
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shadow-lg"
                                                    style={{ backgroundColor: settings.color || '#3B82F6' }}
                                                >
                                                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                                </div>
                                                <span className="text-gray-700 font-medium">{user.name || 'User'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Capacity Tab */}
                            {activeTab === 'capacity' && (
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                        Năng lực làm việc
                                    </h2>
                                    <p className="text-gray-600 mb-6">
                                        Cài đặt số giờ làm việc mỗi tuần của bạn
                                    </p>

                                    <CapacityInput
                                        value={settings.capacityHoursPerWeek}
                                        onChange={handleCapacityChange}
                                    />
                                </div>
                            )}

                            {/* Platform Tab */}
                            {activeTab === 'platform' && (
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                        Cài đặt nền tảng
                                    </h2>
                                    <p className="text-gray-600 mb-6">
                                        Thông tin về các nền tảng đã kết nối
                                    </p>

                                    <div className="space-y-4">
                                        {settings.platforms && settings.platforms.length > 0 ? (
                                            settings.platforms.map((platform, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-4 border border-gray-200 rounded-lg"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium text-gray-900">
                                                                {platform.type || 'Platform'}
                                                            </p>
                                                            <p className="text-sm text-gray-500">
                                                                ID: {platform.id || 'N/A'}
                                                            </p>
                                                        </div>
                                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                <Globe className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                                <p>Chưa có nền tảng nào được kết nối</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Save Button */}
                            <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
                                <div>
                                    {saved && (
                                        <div className="flex items-center gap-2 text-green-600">
                                            <CheckCircle2 className="w-5 h-5" />
                                            <span className="font-medium">Đã lưu thành công!</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                                >
                                    <Save className="w-5 h-5" />
                                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
