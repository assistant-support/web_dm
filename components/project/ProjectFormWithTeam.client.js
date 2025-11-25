// components/project/ProjectFormWithTeam.client.js
// Form tạo project với team selector

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Folder, Users, Calendar, Tag } from 'lucide-react';
import { listManagedTeams } from '@/data/team/actions/server.js';
import { create as createProject } from '@/data/project/actions/server.js';

const projectSchema = z.object({
    name: z.string().min(1, 'Tên dự án là bắt buộc'),
    description: z.string().optional(),
    team: z.string().optional(),
    priority: z.enum(['', 'low', 'medium', 'high', 'urgent']).optional(),
    startDate: z.string().optional(),
    dueDate: z.string().optional(),
    tags: z.string().optional(),
});

const PRIORITIES = [
    { value: '', label: 'Không ưu tiên' },
    { value: 'low', label: '🟢 Thấp' },
    { value: 'medium', label: '🟡 Trung bình' },
    { value: 'high', label: '🟠 Cao' },
    { value: 'urgent', label: '🔴 Khẩn cấp' },
];

export default function ProjectFormWithTeam({ onSuccess }) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverError, setServerError] = useState(null);
    const [managedTeams, setManagedTeams] = useState([]);
    const [loadingTeams, setLoadingTeams] = useState(true);

    const form = useForm({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            name: '',
            description: '',
            team: '',
            priority: '',
            startDate: '',
            dueDate: '',
            tags: '',
        },
    });

    // Load managed teams
    useEffect(() => {
        const loadTeams = async () => {
            try {
                const result = await listManagedTeams();
                if (result.ok) {
                    setManagedTeams(result.data);
                }
            } catch (error) {
                console.error('Error loading teams:', error);
            } finally {
                setLoadingTeams(false);
            }
        };
        loadTeams();
    }, []);

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        setServerError(null);

        try {
            
            
            // Parse tags
            const tags = data.tags
                ? data.tags.split(',').map(t => t.trim()).filter(Boolean)
                : [];

            const payload = {
                name: data.name.trim(),
                description: data.description?.trim() || undefined,
                team: data.team || undefined,
                priority: data.priority || undefined,
                startDate: data.startDate || undefined,
                dueDate: data.dueDate || undefined,
                tags: tags.length > 0 ? tags : undefined,
            };

            
            const result = await createProject(payload);
            

            if (!result.ok) {
                console.error('[ProjectForm] Error:', result);
                setServerError(result.message || 'Không thể tạo dự án');
                return;
            }

            if (onSuccess) {
                onSuccess(result.data);
            } else {
                router.push(`/projects/${result.data._id}`);
                router.refresh();
            }
        } catch (error) {
            console.error('[ProjectForm] Create project error:', error);
            setServerError('Có lỗi không mong muốn xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {serverError && (
                <div className="rounded-md bg-red-50 p-4 border border-red-200">
                    <div className="flex">
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">
                                Có lỗi xảy ra
                            </h3>
                            <div className="mt-2 text-sm text-red-700">
                                {serverError}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Basic Info Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Folder className="h-5 w-5 text-[var(--brand-600)]" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        Thông tin cơ bản
                    </h3>
                </div>

                <div className="space-y-4">
                    <Input
                        label="Tên dự án"
                        placeholder="Nhập tên dự án..."
                        required
                        error={form.formState.errors.name?.message}
                        disabled={isSubmitting}
                        {...form.register('name')}
                    />

                    <Textarea
                        label="Mô tả"
                        placeholder="Mô tả chi tiết về dự án..."
                        rows={4}
                        error={form.formState.errors.description?.message}
                        disabled={isSubmitting}
                        {...form.register('description')}
                    />
                </div>
            </div>

            {/* Team Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-[var(--brand-600)]" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        Nhóm làm việc
                    </h3>
                </div>

                {loadingTeams ? (
                    <div className="text-sm text-gray-500">Đang tải danh sách nhóm...</div>
                ) : (
                    <div className="space-y-3">
                        <Select
                            label="Chọn nhóm"
                            error={form.formState.errors.team?.message}
                            disabled={isSubmitting}
                            {...form.register('team')}
                        >
                            <option value="">Không thuộc nhóm nào (Dự án độc lập)</option>
                            {managedTeams.length > 0 ? (
                                managedTeams.map(team => (
                                    <option key={team._id} value={team._id}>
                                        {team.name}
                                    </option>
                                ))
                            ) : (
                                <option disabled>Bạn chưa quản lý nhóm nào</option>
                            )}
                        </Select>
                        <p className="text-xs text-gray-500">
                            {managedTeams.length > 0 
                                ? 'Chỉ hiển thị các nhóm mà bạn là quản lý. Nếu không chọn, dự án sẽ là dự án độc lập.'
                                : 'Bạn chưa là quản lý của nhóm nào. Dự án sẽ được tạo như dự án độc lập.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Schedule & Priority */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-5 w-5 text-[var(--brand-600)]" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        Lịch trình & Ưu tiên
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Ngày bắt đầu"
                        type="date"
                        error={form.formState.errors.startDate?.message}
                        disabled={isSubmitting}
                        {...form.register('startDate')}
                    />

                    <Input
                        label="Ngày kết thúc"
                        type="date"
                        error={form.formState.errors.dueDate?.message}
                        disabled={isSubmitting}
                        {...form.register('dueDate')}
                    />

                    <div className="md:col-span-2">
                        <Select
                            label="Độ ưu tiên"
                            error={form.formState.errors.priority?.message}
                            disabled={isSubmitting}
                            {...form.register('priority')}
                        >
                            {PRIORITIES.map(p => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Tag className="h-5 w-5 text-[var(--brand-600)]" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        Nhãn dự án
                    </h3>
                </div>

                <Input
                    label="Nhãn"
                    placeholder="VD: marketing, website, mobile (phân cách bởi dấu phẩy)"
                    error={form.formState.errors.tags?.message}
                    disabled={isSubmitting}
                    {...form.register('tags')}
                />
                <p className="text-xs text-gray-500 mt-1">
                    Nhập các nhãn phân cách bởi dấu phẩy
                </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                    type="button"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-offset-2 disabled:opacity-50"
                >
                    Hủy
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-[var(--brand-600)] rounded-lg hover:bg-[var(--brand-700)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-offset-2 disabled:opacity-50"
                >
                    {isSubmitting ? 'Đang tạo...' : 'Tạo dự án'}
                </button>
            </div>
        </form>
    );
}
