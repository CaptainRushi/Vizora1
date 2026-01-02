
import { Database, Share2, Sparkles, GitBranch, FileDown } from 'lucide-react';
import { FloatingCard } from './FloatingCard';

export function Hero() {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] w-full items-center justify-center overflow-hidden px-4 py-20">

      {/* Background decoration - radial gradient glow */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-50/50 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        {/* Floating Cards - Desktop Only positions */}
        <div className="hidden lg:block">
          {/* Top Left: Schema Explanation */}
          <div className="absolute left-0 top-0 -translate-x-1/4 -translate-y-1/4">
            <FloatingCard
              icon={Sparkles}
              title="Schema Explanation"
              caption="AI-generated explanations"
              className="animate-float"
            >
              <div className="w-56 space-y-2">
                <div className="h-2 w-full rounded bg-gray-100" />
                <div className="h-2 w-3/4 rounded bg-gray-100" />
                <div className="h-2 w-5/6 rounded bg-gray-100" />
              </div>
            </FloatingCard>
          </div>

          {/* Top Right: ER Diagram Preview */}
          <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4">
            <FloatingCard
              icon={Share2}
              title="ER Diagram Preview"
              caption="Auto-generated diagrams"
              className="animate-float-delayed"
            >
              <div className="flex w-56 justify-center gap-2 p-2">
                <div className="flex flex-col gap-2">
                  <div className="h-8 w-16 rounded border border-indigo-200 bg-indigo-50" />
                  <div className="h-8 w-16 rounded border border-indigo-200 bg-indigo-50" />
                </div>
                <div className="mt-4 h-8 w-16 rounded border border-indigo-200 bg-indigo-50" />
              </div>
            </FloatingCard>
          </div>

          {/* Bottom Left: Change Detection */}
          <div className="absolute bottom-0 left-0 -translate-x-1/4 translate-y-1/4">
            <FloatingCard
              icon={GitBranch}
              title="Change Detection"
              caption="Always in sync"
              className="animate-float-delayed"
            >
              <div className="w-56 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span>Added 'users' table</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-yellow-500" />
                  <span>Modified 'posts'</span>
                </div>
              </div>
            </FloatingCard>
          </div>

          {/* Bottom Right: Export Options */}
          <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4">
            <FloatingCard
              icon={FileDown}
              title="Export Options"
              caption="Share anywhere"
              className="animate-float"
            >
              <div className="flex w-56 gap-2">
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">PNG</span>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">SVG</span>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">MD</span>
              </div>
            </FloatingCard>
          </div>
        </div>

        {/* Main Hero Content */}
        <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl">
          Understand your database
          <span className="block font-medium text-gray-500">visually and clearly</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-500">
          Generate ER diagrams, explain schemas in plain English, and keep documentation automatically in sync.
        </p>

        <div className="flex justify-center gap-4">
          <button className="flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">
            <Database className="h-5 w-5" />
            Paste Schema Code
          </button>
        </div>

      </div>
    </div>
  );
}
