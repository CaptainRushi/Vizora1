import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { FeedbackPrompt } from './FeedbackPrompt';

export function FeedbackButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 z-[80] flex items-center gap-2 bg-white border border-gray-100 px-5 py-3 rounded-full shadow-lg hover:shadow-xl hover:border-indigo-100 transition-all active:scale-95 group"
                title="Give Feedback"
            >
                <MessageSquarePlus className="w-5 h-5 text-indigo-600 group-hover:rotate-12 transition-transform" />
                <span className="text-xs font-black text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-widest px-1">Give Feedback</span>
            </button>

            {isOpen && (
                <FeedbackPrompt
                    onClose={() => setIsOpen(false)}
                    context="dashboard" // Global button defaults to dashboard context
                />
            )}
        </>
    );
}
