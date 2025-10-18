'use client';

import { useMemo, useRef, useState, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Loading from '@/components/ui/loading';
import Image from 'next/image';
import Button from '@/components/ui/button';
import AnimatedBackground from '@/components/background/animatedBg.ui';

function useLoginIntent() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');
    const callbackUrl = searchParams.get('callbackUrl') || '/';
    const accessDenied = error === 'AccessDenied';
    return { accessDenied, error, callbackUrl };
}

const ErrorMessage = () => {
    const { accessDenied } = useLoginIntent();
    if (!accessDenied) return null;
    return (
        <div className="my-2 w-full rounded-[--radius-md] border border-muted bg-danger-light p-3" role="alert">
            <p className="text-sm font-medium text-danger">
                Bạn đã từ chối cấp quyền. Vui lòng đăng nhập lại để tiếp tục.
            </p>
        </div>
    );
};

export default function LoginCard() {
    const { status } = useSession();
    const router = useRouter();
    const { accessDenied, callbackUrl } = useLoginIntent();

    const [isLoading, setIsLoading] = useState(false);
    const didClickRef = useRef(false);
    const providerId = useMemo(() => 'my-provider', []);

    // KHÔNG auto signIn ở trang này
    // -> chỉ khi bấm nút mới chuyển hướng sang 3000
    const handleSignIn = async () => {
        if (didClickRef.current) return;
        didClickRef.current = true;
        setIsLoading(true);
        try {
            await signIn(providerId, { callbackUrl, prompt: accessDenied ? 'login' : undefined });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('SignIn failed:', err);
            setIsLoading(false);
            didClickRef.current = false;
        }
    };

    // (Tuỳ chọn) Nếu đã authenticated rồi, cho phép bấm “Tiếp tục” quay về callbackUrl
    const handleContinue = () => router.replace(callbackUrl);

    return (
        <>
            <Loading open={isLoading} message="Đang chuyển hướng" theme="dark" />
            <AnimatedBackground />
            <div
                className="relative z-10 flex w-full max-w-lg flex-col items-center gap-4 rounded-2xl border border-white/50 bg-white/85 p-8 text-center shadow-soft backdrop-blur-md sm:p-10"
                aria-hidden={isLoading}
            >
                <div className="mb-2 rounded-full border border-(--muted-100) bg-brand-light p-6">
                    <Image
                        src="https://lh3.googleusercontent.com/d/1PNcTJhUTzndZaHAe4s19sbjZyV6S80d0"
                        alt="Logo"
                        width={48}
                        height={48}
                        unoptimized
                        priority
                    />
                </div>

                <h1 className="text-2xl font-bold text-heading">Yêu Cầu Đăng Nhập</h1>
                <p className="-mt-2 max-w-[90%] text-body">
                    Để tiếp tục, vui lòng đăng nhập bằng tài khoản từ hệ thống xác thực của chúng tôi.
                </p>

                <Suspense>
                    <ErrorMessage />
                </Suspense>

                <div className="w-full pt-4 pb-2 space-y-3">
                    {status !== 'authenticated' ? (
                        <Button
                            variant="primary"
                            onClick={handleSignIn}
                            disabled={isLoading}
                            className="w-full shadow-brand"
                        >
                            {isLoading ? 'Đang xử lý...' : 'Đăng nhập với Dịch vụ Xác thực'}
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            onClick={handleContinue}
                            className="w-full shadow-brand"
                        >
                            Tiếp tục vào ứng dụng
                        </Button>
                    )}
                </div>

                <p className="pt-2 text-sm text-muted">
                    Đây là phương thức đăng nhập duy nhất được hỗ trợ để đảm bảo an toàn.
                </p>
            </div>
        </>
    );
}
