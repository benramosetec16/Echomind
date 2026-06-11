'use client';

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  return (
    <header className="fixed top-0 right-0 w-[calc(100%-80px)] z-40 bg-transparent flex justify-between items-center px-16 py-8">
      <h1 className="font-sans text-xl font-medium text-on-background">{title}</h1>
      <div className="flex items-center gap-6">
        <button className="material-symbols-outlined text-on-surface-variant hover:opacity-80 transition-opacity active:opacity-70">
          sync
        </button>
        <button 
          className="material-symbols-outlined text-on-surface-variant hover:opacity-80 transition-opacity active:opacity-70"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          account_circle
        </button>
      </div>
    </header>
  );
}
