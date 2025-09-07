"use client";
import { SWRegister } from '../../app/sw-register';
import { RealtimeRegister } from '../../app/realtime-register';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className="header-gradient border-b">
      <div className="app-container py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Incident Mapper</h1>
            <p className="muted text-sm">Local-first reporting • offline-first • privacy aware</p>
          </div>
          <div className="hidden md:flex items-center gap-3 text-sm muted">
            <ThemeToggle />
            <span>Demo build</span>
          </div>
        </div>
      </div>
      {/* registers */}
      <SWRegister />
      <RealtimeRegister />
    </header>
  );
}
