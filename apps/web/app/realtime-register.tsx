"use client";
import { useEffect } from 'react';
import { initRealtime } from '../src/realtime/ws';

export function RealtimeRegister() {
  useEffect(() => {
    initRealtime();
  }, []);
  return null;
}

