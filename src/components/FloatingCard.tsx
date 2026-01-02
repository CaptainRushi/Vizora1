import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface FloatingCardProps {
  icon: LucideIcon;
  title: string;
  caption: string;
  className?: string;
  children?: ReactNode;
}

export function FloatingCard({ icon: Icon, title, caption, className = '', children }: FloatingCardProps) {
  return (
    <div className={`absolute rounded-xl bg-white p-4 shadow-xl shadow-gray-200/50 ring-1 ring-gray-100 backdrop-blur-sm ${className}`}>
      <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-[10px] text-gray-500">{caption}</p>
        </div>
      </div>
      <div className="pt-3">
        {children}
      </div>
    </div>
  );
}
