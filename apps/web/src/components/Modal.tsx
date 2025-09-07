"use client";
import { useEffect } from 'react';

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 top-16 mx-auto w-full max-w-lg">
        <div className="rounded-md bg-white shadow-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">{title}</h3>
            <button className="text-sm underline" onClick={onClose}>Close</button>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

