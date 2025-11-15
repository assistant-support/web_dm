'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import DialogComponent from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAsyncNotifier } from '@/hooks/loading.hook';
import { findUidByPhone, updateUid } from '@/data/appUser/uid-actions';
import { Phone, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * UidSetupDialog - Dialog để người dùng cung cấp số điện thoại tìm UID
 * @param {Object} props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onClose - Close callback
 * @param {Function} props.onSuccess - Success callback after UID is updated
 */
export default function UidSetupDialog({ open, onClose, onSuccess }) {
    const { run, Overlays } = useAsyncNotifier();

    const [step, setStep] = useState('input'); // 'input' | 'confirm' | 'success'
    const [phoneNumber, setPhoneNumber] = useState('');
    const [foundUid, setFoundUid] = useState(null); // Sẽ chứa { uid, name, avatar, phone }
    const [error, setError] = useState('');

    const handleClose = () => {
        setStep('input');
        setPhoneNumber('');
        setFoundUid(null);
        setError('');
        onClose();
    };

    const handleFindUid = async (e) => {
        e.preventDefault();
        setError('');

        if (!phoneNumber.trim()) {
            setError('Vui lòng nhập số điện thoại');
            return;
        }

        await run(
            () => findUidByPhone(phoneNumber),
            {
                loadingMessage: 'Đang tìm kiếm UID...',
                notify: 'none',
                onSuccess: (result) => {
                    if (result.ok && result.data) {
                        setFoundUid(result.data); // Lưu cả object
                        setStep('confirm');
                    } else {
                        setError(result.message || 'Không tìm thấy UID với số điện thoại này');
                    }
                },
                onError: (err) => {
                    setError(err.message || 'Có lỗi xảy ra khi tìm kiếm');
                }
            }
        );
    };

    const handleConfirmUpdate = async () => {
        if (!foundUid?.uid) return;

        // Cập nhật: Truyền cả object foundUid (chứa uid, name, avatar)
        await run(
            () => updateUid(foundUid), 
            {
                loadingMessage: 'Đang cập nhật UID...',
                notify: 'none',
                onSuccess: (result) => {
                    if (result.ok) {
                        setStep('success');
                        setTimeout(() => {
                            onSuccess?.(result.data); // Truyền data lên parent
                            handleClose();
                        }, 2000);
                    } else {
                        setError(result.message || 'Không thể cập nhật UID');
                        setStep('input');
                    }
                },
                onError: (err) => {
                    setError(err.message || 'Có lỗi xảy ra khi cập nhật');
                    setStep('input');
                }
            }
        );
    };

    const handleBack = () => {
        setStep('input');
        setFoundUid(null);
        setError('');
    };

    return (
        <>
            <Overlays />

            <DialogComponent
                open={open}
                onOpenChange={(isOpen) => !isOpen && handleClose()}
                title="Cập nhật thông tin liên hệ Zalo"
                size="md"
            >
                {/* Step 1: Input phone number */}
                {step === 'input' && (
                    <form onSubmit={handleFindUid} className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800">
                                <p className="font-medium mb-1">Tại sao cần số điện thoại Zalo?</p>
                                <p>Chúng tôi sử dụng Zalo để gửi thông báo quan trọng về công việc, dự án và cập nhật hệ thống đến bạn.</p>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        <Input
                            label="Số điện thoại Zalo"
                            type="tel"
                            required
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="Ví dụ: 0912345678"
                            icon={<Phone className="w-4 h-4" />}
                        />

                        <div className="text-xs text-gray-500 space-y-1">
                            <p>• Nhập số điện thoại đang sử dụng Zalo</p>
                            <p>• Hệ thống sẽ tìm UID Zalo liên kết với số này</p>
                            <p>• Thông tin được bảo mật và chỉ dùng để gửi thông báo công việc</p>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Để sau
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-[var(--brand-600)] rounded-lg hover:bg-[var(--brand-700)] transition-colors shadow-sm"
                            >
                                Tìm UID
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 2: Confirm UID */}
                {step === 'confirm' && foundUid && (
                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-green-800">
                                <p className="font-medium mb-1">Tìm thấy UID!</p>
                                <p>Chúng tôi đã tìm thấy tài khoản Zalo liên kết với số điện thoại này.</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                            {/* Cập nhật: Hiển thị Avatar */}
                            <AvatarPreview avatar={foundUid.avatar} />

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Số điện thoại</label>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{foundUid.phone}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Tên tài khoản Zalo</label>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{foundUid.name}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">UID</label>
                                    <p className="text-sm font-mono text-gray-900 mt-1 break-all">{foundUid.uid}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-yellow-800">
                                Vui lòng kiểm tra kỹ thông tin. Bạn chỉ có thể cập nhật UID một lần.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={handleBack}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Quay lại
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmUpdate}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                            >
                                Xác nhận cập nhật
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Success */}
                {step === 'success' && (
                    <div className="space-y-4 py-8 text-center">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Cập nhật thành công!</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Bạn sẽ nhận được thông báo qua Zalo từ bây giờ.
                            </p>
                        </div>
                    </div>
                )}
            </DialogComponent>
        </>
    );
}

function AvatarPreview({ avatar }) {
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        setLoadError(false);
    }, [avatar]);

    if (!avatar || loadError) {
        return null;
    }

    return (
        <div className="flex justify-center">
            <Image
                src={avatar}
                alt="Avatar Zalo"
                width={80}
                height={80}
                className="h-20 w-20 rounded-full border-2 border-gray-200 object-cover"
                sizes="80px"
                onError={() => setLoadError(true)}
            />
        </div>
    );
}