import NotificationList from '@/components/notifications/NotificationList.client';

export const metadata = {
    title: 'Thông báo | Web DM',
    description: 'Xem tất cả thông báo của bạn',
};

export default function NotificationsPage() {
    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <NotificationList />
        </div>
    );
}
