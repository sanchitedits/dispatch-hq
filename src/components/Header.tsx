import { Package, Settings, Bell } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#0A0A0A] px-6 py-4">
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-[#00FF66]" />
        <span className="font-display font-bold tracking-tight text-xl">DispatchHQ</span>
        <span className="ml-4 px-2 py-0.5 rounded text-xs font-mono bg-white/10 text-gray-400">AWS / PRODUCTION</span>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-gray-400 hover:text-white transition-colors">
          <Bell className="h-5 w-5" />
        </button>
        <button className="text-gray-400 hover:text-white transition-colors">
          <Settings className="h-5 w-5" />
        </button>
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#00FF66] to-emerald-900 border border-white/20"></div>
      </div>
    </header>
  );
}

