import { FileText, Download, GitBranch, Box } from 'lucide-react';
import FloatingCard from './FloatingCard';

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-6 py-20 overflow-hidden">
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
          <span className="text-gray-900">Understand your database</span>
          <br />
          <span className="text-gray-400">visually, clearly, and always up to date</span>
        </h1>

        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Auto-generate ER diagrams, explain schemas in plain English, and keep
          documentation in sync with your database.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium text-lg transition-colors shadow-sm">
            Connect your database
          </button>
          <button className="text-gray-700 hover:text-gray-900 font-medium text-lg transition-colors">
            View example diagram →
          </button>
        </div>
      </div>

      <FloatingCard
        className="hidden lg:block top-32 left-12 w-72 rotate-[-3deg]"
        rotation="hover:rotate-[-2deg]"
      >
        <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200 font-handwriting">
          <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-3"></div>
          <p className="text-sm text-gray-700 italic leading-relaxed">
            "This table stores completed customer orders and links users to payments."
          </p>
        </div>
      </FloatingCard>

      <FloatingCard
        className="hidden lg:block top-24 right-12 w-80 rotate-[2deg]"
        rotation="hover:rotate-[1deg]"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Auto-generated ER diagram
            </span>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 bg-white border-2 border-blue-500 rounded p-2 text-center">
                <Box className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                <div className="text-xs font-semibold">users</div>
              </div>
              <div className="text-gray-400">→</div>
              <div className="flex-1 bg-white border-2 border-green-500 rounded p-2 text-center">
                <Box className="w-4 h-4 mx-auto mb-1 text-green-600" />
                <div className="text-xs font-semibold">orders</div>
              </div>
              <div className="text-gray-400">→</div>
              <div className="flex-1 bg-white border-2 border-purple-500 rounded p-2 text-center">
                <Box className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                <div className="text-xs font-semibold">payments</div>
              </div>
            </div>
          </div>
        </div>
      </FloatingCard>

      <FloatingCard
        className="hidden lg:block bottom-32 left-20 w-72 rotate-[2deg]"
        rotation="hover:rotate-[1deg]"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-900">Schema changes detected</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">New column: <code className="text-xs bg-gray-100 px-1 rounded">status</code></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-gray-700">Removed table: <code className="text-xs bg-gray-100 px-1 rounded">old_logs</code></span>
            </div>
          </div>
        </div>
      </FloatingCard>

      <FloatingCard
        className="hidden lg:block bottom-36 right-24 w-64 rotate-[-2deg]"
        rotation="hover:rotate-[-1deg]"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-900">Export documentation</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 hover:bg-gray-100 rounded-lg p-3 text-center cursor-pointer transition-colors">
              <FileText className="w-5 h-5 mx-auto mb-1 text-gray-600" />
              <div className="text-xs font-medium text-gray-700">PNG</div>
            </div>
            <div className="bg-gray-50 hover:bg-gray-100 rounded-lg p-3 text-center cursor-pointer transition-colors">
              <FileText className="w-5 h-5 mx-auto mb-1 text-gray-600" />
              <div className="text-xs font-medium text-gray-700">SVG</div>
            </div>
            <div className="bg-gray-50 hover:bg-gray-100 rounded-lg p-3 text-center cursor-pointer transition-colors">
              <FileText className="w-5 h-5 mx-auto mb-1 text-gray-600" />
              <div className="text-xs font-medium text-gray-700">MD</div>
            </div>
          </div>
        </div>
      </FloatingCard>
    </section>
  );
}
