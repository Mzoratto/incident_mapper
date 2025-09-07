"use client";
import { useEffect } from 'react';
import { db } from '../src/db/dexie';

export function SWRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(async () => {
        try {
          // Persist API base for SW usage in background sync
          await db.kv.put({ key: 'apiBase', value: process.env.NEXT_PUBLIC_API_URL || '' });
        } catch {}
        // Bridge SW messages to window events for app consumers
        navigator.serviceWorker.addEventListener('message', (evt: MessageEvent) => {
          const data = (evt as any).data || {};
          if (data && data.type === 'incidents-updated') {
            try { window.dispatchEvent(new CustomEvent('incidents-updated')); } catch {}
          }
        });
      }).catch(() => {});
    }
  }, []);
  return null;
}
