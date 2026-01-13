import { Share2, Layers, FileText, FileCode, Layout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, ReactNode } from 'react';
import { Logo } from './VizoraLogo';
import { useAuth } from '../context/AuthContext';
import { motion, useSpring, useReducedMotion, useScroll, useTransform } from 'framer-motion';

interface CursorReactiveCardProps {
  children: ReactNode;
  className?: string;
  depth?: 'near' | 'far';
  id: string;
  activeId: string | null;
  onDistanceChange: (id: string, distance: number) => void;
}

function CursorReactiveCard({ children, className = '', depth = 'near', id, activeId, onDistanceChange }: CursorReactiveCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Return to idle: ~400ms (Exit behavior)
  const springConfig = { stiffness: 80, damping: 22 };
  const tx = useSpring(0, springConfig);
  const ty = useSpring(0, springConfig);
  const sc = useSpring(1, springConfig);
  const rot = useSpring(0, springConfig);
  const op = useSpring(0.85, springConfig);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distX = e.clientX - centerX;
      const distY = e.clientY - centerY;
      const distance = Math.sqrt(distX * distX + distY * distY);

      onDistanceChange(id, distance);

      const radius = 160;
      const isActive = activeId === id && distance < radius;

      if (isActive) {
        const strength = 1 - distance / radius;
        const dirX = distX === 0 ? 0 : distX / distance;
        const dirY = distY === 0 ? 0 : distY / distance;

        const maxMove = depth === 'near' ? 6 : 3;
        tx.set(-dirX * maxMove * strength);
        ty.set(-dirY * maxMove * strength);
        sc.set(1 + 0.03 * strength);
        rot.set(dirX * 1.5 * strength);
        op.set(0.85 + 0.07 * strength);
      } else {
        tx.set(0);
        ty.set(0);
        sc.set(1);
        rot.set(0);
        op.set(0.85);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [id, activeId, depth, tx, ty, sc, rot, op, prefersReducedMotion, onDistanceChange]);

  return (
    <motion.div
      ref={cardRef}
      style={{
        x: tx,
        y: ty,
        scale: sc,
        rotateZ: rot,
        opacity: op,
      }}
      className={`absolute z-10 select-none ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function Hero() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [, setDistances] = useState<Record<string, number>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const { scrollY } = useScroll();
  const flyOutLeft = useTransform(scrollY, [0, 500], [0, -300]);
  const flyOutRight = useTransform(scrollY, [0, 500], [0, 300]);
  const flyOutUp = useTransform(scrollY, [0, 500], [0, -200]);
  const flyOutDown = useTransform(scrollY, [0, 500], [0, 200]);
  const scrollOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  const handleDistanceChange = (id: string, distance: number) => {
    setDistances(prev => {
      const newDistances = { ...prev, [id]: distance };
      // Find the card with the minimum distance among those within 160px
      let minDistance = 160;
      let closestId = null;

      Object.entries(newDistances).forEach(([key, dist]) => {
        if (dist < minDistance) {
          minDistance = dist;
          closestId = key;
        }
      });

      if (closestId !== activeId) {
        setActiveId(closestId);
      }
      return newDistances;
    });
  };

  // Handle OAuth callback redirects only
  useEffect(() => {
    const hasAuthParams =
      window.location.hash.includes('access_token') ||
      window.location.search.includes('code=');

    if (hasAuthParams) {
      navigate('/auth/signin' + window.location.search + window.location.hash, { replace: true });
      return;
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center relative overflow-hidden font-sans">

      {/* Subtle Grain/Dot Texture - Global Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.4]"
        style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      {/* Top Navigation */}
      <div className="absolute top-0 left-0 right-0 h-24 z-40">
        <div className="app-container h-full flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
            <Logo size={40} animated={false} withBackground={true} />
            <span className="vizora-brand text-2xl font-bold text-slate-900 tracking-tight">Vizora</span>
          </div>

          <div className="flex items-center gap-8">
            {!loading && !user && (
              <button
                onClick={() => navigate('/auth/signin')}
                className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Sign In
              </button>
            )}
            {loading ? (
              <div className="flex items-center gap-2 px-5 py-2.5 text-slate-400">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : user ? (
              <button
                onClick={() => navigate('/projects')}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-full text-sm font-bold shadow-xl shadow-slate-900/10 hover:bg-black transition-all active:scale-95"
              >
                <Layout className="w-4 h-4" />
                Open Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate('/auth/signin')}
                className="px-8 py-3 bg-indigo-600 text-white rounded-full text-sm font-bold shadow-xl shadow-indigo-200/50 hover:bg-indigo-700 transition-all active:scale-95"
              >
                Join Private Beta
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating cards wrapper - Behind text layer */}
      <div className="absolute inset-0 pointer-events-none z-0 hidden lg:block opacity-80">
        <div className="app-container h-full relative">
          {/* Card 1: Schema Note (Top Left) - FAR - Visible behind text */}
          <motion.div style={{ x: flyOutLeft, y: flyOutUp, opacity: scrollOpacity }} className="absolute inset-0">
            <CursorReactiveCard id="note" activeId={activeId} onDistanceChange={handleDistanceChange} depth="far" className="top-32 left-8">
              <div className="bg-[#fffde7] p-5 rounded-sm shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-yellow-200/50 -rotate-6 w-56 flex-col gap-2 cursor-default select-none transition-transform pointer-events-auto">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400 mx-auto mb-1 shadow-sm"></div>
                <p className="font-handwriting text-slate-700 text-sm leading-snug">
                  "This table stores completed orders and links users to payments."
                </p>
              </div>
            </CursorReactiveCard>
          </motion.div>

          {/* Card 2: ER Diagram Preview (Top Right) - NEAR - Visible behind text */}
          <motion.div style={{ x: flyOutRight, y: flyOutUp, opacity: scrollOpacity }} className="absolute inset-0">
            <CursorReactiveCard id="diagram" activeId={activeId} onDistanceChange={handleDistanceChange} depth="near" className="top-36 right-8">
              <div className="bg-white p-5 rounded-2xl shadow-[0_20px_50px_rgb(0,0,0,0.08)] ring-1 ring-slate-200/60 rotate-6 w-64 flex-col gap-4 cursor-default transition-transform pointer-events-auto">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-indigo-50 rounded-md">
                    <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">ER Diagram</span>
                </div>
                <div className="relative h-28 border border-slate-100 rounded-lg bg-slate-50 p-3 overflow-hidden">
                  <div className="absolute top-2 left-2 bg-white border border-slate-200 shadow-sm rounded px-2 py-1 text-[8px] font-bold text-slate-700 w-16 text-center z-10">
                    users
                  </div>
                  <div className="absolute top-12 right-4 bg-white border border-slate-200 shadow-sm rounded px-2 py-1 text-[8px] font-bold text-slate-700 w-16 text-center z-10">
                    orders
                  </div>
                  <div className="absolute bottom-2 left-8 bg-white border border-slate-200 shadow-sm rounded px-2 py-1 text-[8px] font-bold text-slate-700 w-16 text-center z-10">
                    payments
                  </div>
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    <path d="M40 18 C 60 18, 80 40, 90 50" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M90 65 C 80 80, 60 90, 50 90" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </CursorReactiveCard>
          </motion.div>

          {/* Card 3: Schema Changes (Bottom Left) - NEAR - Visible behind text */}
          <motion.div style={{ x: flyOutLeft, y: flyOutDown, opacity: scrollOpacity }} className="absolute inset-0">
            <CursorReactiveCard id="updates" activeId={activeId} onDistanceChange={handleDistanceChange} depth="near" className="bottom-32 left-8">
              <div className="bg-white p-5 rounded-2xl shadow-[0_20px_40px_rgb(0,0,0,0.06)] ring-1 ring-slate-200/60 rotate-3 w-64 cursor-default transition-transform pointer-events-auto">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-green-50 rounded-md">
                    <Layers className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Schema Updates</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className="font-mono text-slate-800">users.email</span>
                    <span className="ml-auto text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">ADDED</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    <span className="font-mono text-slate-800">orders.status</span>
                    <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">MOD</span>
                  </div>
                </div>
              </div>
            </CursorReactiveCard>
          </motion.div>

          {/* Card 4: Export Options (Bottom Right) - FAR - Visible behind text */}
          <motion.div style={{ x: flyOutRight, y: flyOutDown, opacity: scrollOpacity }} className="absolute inset-0">
            <CursorReactiveCard id="export" activeId={activeId} onDistanceChange={handleDistanceChange} depth="far" className="bottom-28 right-8">
              <div className="bg-white p-5 rounded-2xl shadow-[0_20px_40px_rgb(0,0,0,0.06)] ring-1 ring-slate-200/60 -rotate-6 cursor-default transition-transform pointer-events-auto">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-blue-50 rounded-md">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Export documentation</span>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400">
                      <span className="text-[10px] font-bold">PNG</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400">
                      <span className="text-[10px] font-bold">SVG</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100 text-indigo-600 shadow-sm">
                      <FileCode className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            </CursorReactiveCard>
          </motion.div>
        </div>
      </div>

      {/* Hero Content (Center) */}
      <div className="flex-1 flex flex-col items-center justify-center z-20 relative w-full pt-20">
        <div className="app-container text-center">
          <h1 className="flex flex-col items-center gap-3 mb-8 pointer-events-none">
            <span className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#0f172a] tracking-tight leading-[1.1]">
              Understand, review, and document
            </span>
            <span className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#9ca3af] tracking-tight leading-[1.1]">
              your database schema
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-[#6b7280] max-w-[800px] mx-auto mb-12 leading-relaxed font-medium">
            Vizora turns raw database schemas into ER diagrams, schema reviews, versioned documentation, and verifiable AI answers — without connecting to your database.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              onClick={() => navigate(user ? '/projects' : '/auth/signin')}
              className="px-10 py-5 bg-indigo-600 text-white rounded-full text-lg font-bold hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200/50 flex items-center justify-center gap-2 group transform hover:scale-105 duration-200 active:scale-95"
            >
              {user ? 'Open Dashboard' : 'Join Private Beta'}
            </button>

            <button
              className="px-10 py-5 text-slate-600 font-bold hover:text-slate-900 transition-all flex items-center justify-center gap-2 group"
            >
              View Example
              <Share2 className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>


      </div>

      {/* Disclaimer Footer (Optional) */}
      <div className="absolute bottom-2 text-center w-full text-[10px] text-gray-300 pointer-events-none">
        {/* Clean */}
      </div>
    </div>
  );
}
