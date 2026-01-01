import { Database } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 transition-shadow">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">SchemaViz</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 font-normal transition-colors">
              Features
            </a>
            <a href="#use-cases" className="text-gray-600 hover:text-gray-900 font-normal transition-colors">
              Use Cases
            </a>
            <a href="#docs" className="text-gray-600 hover:text-gray-900 font-normal transition-colors">
              Docs
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 font-normal transition-colors">
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-4">
            <button className="text-gray-700 hover:text-gray-900 font-normal transition-colors">
              Sign in
            </button>
            <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors">
              Get demo
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
