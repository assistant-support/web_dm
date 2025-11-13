'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { MessageSquare } from 'lucide-react';
import Dialog from '@/components/ui/dialog';

const ChatDataProvider = dynamic(() => import('./ChatDataProvider.client'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[320px] items-center justify-center text-sm text-gray-500">
      Đang khởi tạo chat bot...
    </div>
  ),
});

export default function ChatBotLauncher() {
  const [open, setOpen] = useState(false);

  const handleOpenChange = useCallback((next) => {
    if (typeof next === 'boolean') {
      setOpen(next);
    } else {
      setOpen(false);
    }
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-[var(--brand-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--brand-600)] shadow-sm transition-colors hover:border-[var(--brand-300)] hover:bg-[var(--brand-50)]"
      >
        <MessageSquare className="h-4 w-4" />
        <span>Chat bot</span>
      </button>

      <Dialog
        open={open}
        onOpenChange={handleOpenChange}
        title="DM-Agent Chat"
        size="5xl"
        className="max-h-[90vh] overflow-hidden"
      >
        <div className="max-h-[70vh] overflow-hidden flex">
          <ChatDataProvider />
        </div>
      </Dialog>
    </>
  );
}
