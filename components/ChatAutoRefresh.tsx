'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function ChatAutoRefresh({ messageCount }: { messageCount: number }) {
  const router = useRouter();

  useEffect(() => {
    const messagePanel = document.getElementById('chat-message-panel');
    if (messagePanel) messagePanel.scrollTop = messagePanel.scrollHeight;
  }, [messageCount]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [router]);

  return null;
}
