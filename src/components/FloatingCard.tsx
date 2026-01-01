import { ReactNode } from 'react';

interface FloatingCardProps {
  children: ReactNode;
  className?: string;
  rotation?: string;
}

export default function FloatingCard({ children, className = '', rotation = '' }: FloatingCardProps) {
  return (
    <div
      className={`absolute bg-white rounded-xl shadow-lg p-4 transition-transform hover:-translate-y-1 ${rotation} ${className}`}
      style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}
    >
      {children}
    </div>
  );
}
