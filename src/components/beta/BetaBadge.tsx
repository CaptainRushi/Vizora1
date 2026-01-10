import { useState } from 'react';
import { Beaker } from 'lucide-react';
import { AboutBetaModal } from './AboutBetaModal';

export function BetaBadge() {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all group active:scale-95"
            >
                <Beaker className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-wider">Private Beta</span>
            </button>

            {showModal && <AboutBetaModal onClose={() => setShowModal(false)} />}
        </>
    );
}
