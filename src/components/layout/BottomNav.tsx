import { NavLink } from 'react-router-dom';
import { CalendarHeart, Users, CheckCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const links = [
    { to: '/today', icon: CalendarHeart, label: 'Today' },
    { to: '/people', icon: Users, label: 'People' },
    { to: '/loops', icon: CheckCircle, label: 'Loops' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav aria-label="Primary navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 pb-safe-bottom backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-around px-2 sm:px-6">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "relative flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg text-muted transition-colors after:absolute after:inset-x-6 after:top-0 after:h-0.5 after:rounded-full after:bg-transparent hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
                isActive && "text-primary after:bg-primary"
              )
            }
          >
            <Icon aria-hidden="true" size={21} strokeWidth={2} />
            <span className="text-[11px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}