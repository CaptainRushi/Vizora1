import { Share2, Layers, FileText, FileCode, LogIn, Layout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Logo } from './VizoraLogo';
import { useAuth } from '../context/AuthContext';

export function Hero() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Handle OAuth callback redirects only
  useEffect(() => {
    const hasAuthParams =
      window.location.hash.includes('access_token') ||
      window.location.search.includes('code=');

    if (hasAuthParams) {
      navigate('/auth/signin' + window.location.search + window.location.hash, { replace: true });
      return;
    }
    // Note: We no longer auto-redirect authenticated users from the landing page
    // This allows them to view the Hero page when clicking the Vizora icon
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center relative overflow-hidden font-sans">

      {/* Subtle Grain/Dot Texture - Global Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.4]"
        style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      {/* Top Navigation */}
      <div className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-6 sm:px-12 z-20">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
          <Logo size={40} animated={false} withBackground={true} />
          <span className="vizora-brand text-2xl font-bold text-slate-900 tracking-tight">Vizora</span>
        </div>

        <div>
          {loading ? (
            <div className="flex items-center gap-2 px-5 py-2.5 text-slate-400">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold">Checking session...</span>
            </div>
          ) : user ? (
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-full text-sm font-bold shadow-lg shadow-slate-900/10 hover:bg-black transition-all active:scale-95"
            >
              <Layout className="w-4 h-4" />
              Open Dashboard
            </button>
          ) : (
            <button
              onClick={() => navigate('/auth/signin')}
              className="flex items-center gap-2 px-6 py-2.5 text-slate-600 hover:text-slate-900 text-sm font-bold transition-all"
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
          )}
        </div>
      </div>

      {/* Hero Content (Center) */}
      <div className="flex-1 flex flex-col items-center justify-center text-center z-10 px-4 mt-10 sm:mt-0 relative w-full max-w-4xl mx-auto">

        <h1 className="flex flex-col items-center gap-2 mb-8">
          <span className="text-5xl sm:text-7xl font-bold text-[#0f172a] tracking-tight leading-tight">
            Visualize, understand, and document
          </span>
          <span className="text-5xl sm:text-7xl font-bold text-[#9ca3af] tracking-tight leading-tight">
            your database in one place
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-[#6b7280] max-w-[600px] mx-auto mb-10 leading-relaxed font-normal">
          Paste your database schema and instantly generate diagrams, explanations, and living documentation.
        </p>

        <button
          onClick={() => navigate(user ? '/projects' : '/auth/signin')}
          className="px-10 py-5 bg-indigo-600 text-white rounded-full text-lg font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200/50 flex items-center justify-center gap-2 group transform hover:scale-105 duration-200 active:scale-95"
        >
          {user ? 'Open Dashboard' : 'Log in to start'}
        </button>
      </div>


      {/* --- FLOATING UI CARDS --- */}

      {/* Card 1: Schema Note (Top Left) */}
      <div className="hidden lg:flex absolute top-32 left-16 xl:left-24 bg-[#fff9c4] p-5 rounded-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] -rotate-3 w-56 flex-col gap-2 z-20 cursor-default selectable-none animate-float">
        <div className="w-3 h-3 rounded-full bg-red-400/20 mx-auto mb-1"></div>
        <p className="font-handwriting text-slate-700 text-sm leading-snug">
          "This table stores completed orders and links users to payments."
        </p>
      </div>

      {/* Card 2: ER Diagram Preview (Right) */}
      <div className="hidden lg:flex absolute top-40 right-10 xl:right-32 bg-white p-5 rounded-2xl shadow-[0_20px_50px_rgb(0,0,0,0.08)] rotate-2 z-20 w-64 flex-col gap-4 cursor-default animate-float-delayed-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-indigo-50 rounded-md">
            <Share2 className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">ER Diagram</span>
        </div>
        {/* Mini Mock Diagram */}
        <div className="relative h-28 border border-slate-100 rounded-lg bg-slate-50/50 p-3 overflow-hidden">
          <div className="absolute top-2 left-2 bg-white border border-slate-200 shadow-sm rounded px-2 py-1 text-[8px] font-bold text-slate-700 w-16 text-center">
            users
          </div>
          <div className="absolute top-12 right-4 bg-white border border-slate-200 shadow-sm rounded px-2 py-1 text-[8px] font-bold text-slate-700 w-16 text-center">
            orders
          </div>
          <div className="absolute bottom-2 left-8 bg-white border border-slate-200 shadow-sm rounded px-2 py-1 text-[8px] font-bold text-slate-700 w-16 text-center">
            payments
          </div>
          {/* Connector Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path d="M40 18 C 60 18, 80 40, 90 50" fill="none" stroke="#cbd5e1" strokeWidth="1" />
            <path d="M90 65 C 80 80, 60 90, 50 90" fill="none" stroke="#cbd5e1" strokeWidth="1" />
          </svg>
        </div>
      </div>

      {/* Card 3: Schema Changes (Bottom Left) */}
      <div className="hidden lg:flex absolute bottom-32 left-10 xl:left-32 bg-white p-5 rounded-2xl shadow-[0_20px_40px_rgb(0,0,0,0.06)] rotate-1 z-20 w-64 cursor-default animate-float-delayed-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-green-50 rounded-md">
            <Layers className="w-3.5 h-3.5 text-green-600" />
          </div>
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Schema Updates</span>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span className="font-mono text-slate-800">users.email</span>
            <span className="ml-auto text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">ADDED</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
            <span className="font-mono text-slate-800">orders.status</span>
            <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">MOD</span>
          </div>
        </div>
      </div>

      {/* Card 4: Export Options (Bottom Right) */}
      <div className="hidden lg:flex absolute bottom-24 right-16 xl:right-32 bg-white p-5 rounded-2xl shadow-[0_20px_40px_rgb(0,0,0,0.06)] -rotate-2 z-20 cursor-default animate-float-delayed-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-blue-50 rounded-md">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Export documentation</span>
        </div>
        <div className="flex gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 text-slate-400">
              <span className="text-[10px] font-bold">PNG</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 text-slate-400">
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

      {/* Disclaimer Footer (Optional) */}
      <div className="absolute bottom-2 text-center w-full text-[10px] text-gray-300 pointer-events-none">
        {/* Clean */}
      </div>
    </div>
  );
}
