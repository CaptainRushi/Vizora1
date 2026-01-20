import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Send,
    Users,
    Smile,
    GripHorizontal,
    X,
    ArrowRight
} from 'lucide-react';
import { useCollaborationContext } from '../../context/CollaborationContext';

interface WorkspaceChatProps {
    currentUser: {
        id: string;
        username: string;
        role: string;
        color: string;
    };
    onClose?: () => void;
}

const COMMON_EMOJIS = [
    '😀', '😂', '🙂', '😊', '😍', '🤔', '😮', '😢',
    '👍', '👎', '👏', '🙌', '🎉', '🔥', '💡', '💯',
    '✨', '⭐', '❤️', '💪', '🚀', '🎯', '⚡', '🌟',
    '👀', '💬', '📌', '🔗', '📝', '✏️', '🗂️', '📊'
];

export function WorkspaceChat({ currentUser, onClose }: WorkspaceChatProps) {
    const {
        users,
        messages,
        sendMessage,
        promoteMessage,
        typingUsers,
        sendTyping
    } = useCollaborationContext();

    const [inputText, setInputText] = useState('');
    const [isHoveringMessage, setIsHoveringMessage] = useState<string | null>(null);
    const [size, setSize] = useState({ width: 320, height: 380 });
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const isAtBottom = useRef(true);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEmojiPicker]);

    const insertEmoji = (emoji: string) => {
        setInputText(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const threshold = 10;
        isAtBottom.current = target.scrollHeight - target.scrollTop - target.clientHeight < threshold;
    };

    useEffect(() => {
        if (scrollRef.current && isAtBottom.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!inputText.trim()) return;
        sendMessage(inputText);
        setInputText('');

        // Clear typing indicator
        sendTyping(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };

    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(e.target.value);

        // Handle typing indicator
        sendTyping(true);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            sendTyping(false);
        }, 2000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const [isResizing, setIsResizing] = useState(false);
    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    useEffect(() => {
        if (!isResizing) return;
        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = Math.max(280, window.innerWidth - e.clientX);
            const newHeight = Math.max(200, window.innerHeight - e.clientY);
            setSize({ width: newWidth, height: newHeight });
        };
        const handleMouseUp = () => setIsResizing(false);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const startDragging = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }, [position]);

    useEffect(() => {
        if (!isDragging) return;
        const handleMouseMove = (e: MouseEvent) => {
            const newX = e.clientX - dragStart.x;
            const newY = e.clientY - dragStart.y;
            const maxX = window.innerWidth - size.width - 16;
            const maxY = window.innerHeight - size.height - 16;
            setPosition({
                x: Math.max(-maxX + 16, Math.min(0, newX)),
                y: Math.max(-maxY + 16, Math.min(0, newY))
            });
        };
        const handleMouseUp = () => setIsDragging(false);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart, size]);

    const isViewer = currentUser.role === 'viewer';

    return (
        <div
            className={`workspace-chat-wrapper fixed bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 flex flex-col z-[100] shadow-2xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${isDragging ? 'cursor-grabbing' : ''}`}
            style={{
                width: `${size.width}px`,
                height: `${size.height}px`,
                right: `${16 - position.x}px`,
                bottom: `${16 - position.y}px`
            }}
        >
            <div
                className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-50 group"
                onMouseDown={startResizing}
            >
                <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-gray-300 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div
                className={`px-3 py-2.5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={startDragging}
            >
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <GripHorizontal className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-gray-100">Live Session Chat</span>
                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/40 rounded-full border border-emerald-100 dark:border-emerald-800/50">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{users.length} active</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {onClose && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-3 space-y-4 bg-gray-50/30 dark:bg-slate-950/20 custom-scrollbar"
            >
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-3">
                            <Users className="w-5 h-5 text-indigo-400" />
                        </div>
                        <p className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Live session chat</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 max-w-[180px] leading-relaxed font-medium">
                            Discuss changes while editing.<br />
                            <span className="text-indigo-500 dark:text-indigo-400 font-bold">Messages disappear when the session ends.</span>
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender.id === currentUser.id;
                        return (
                            <div
                                key={msg.id}
                                className={`group relative flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                onMouseEnter={() => setIsHoveringMessage(msg.id)}
                                onMouseLeave={() => setIsHoveringMessage(null)}
                            >
                                <div className="flex items-center gap-1.5 mb-1 mx-1">
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isMe ? 'text-indigo-500' : 'text-gray-500'}`}>
                                        {msg.sender.name}
                                    </span>
                                </div>

                                <div className={`
                                    relative px-2.5 py-1.5 rounded-xl text-[12px] leading-relaxed max-w-[90%]
                                    ${isMe
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-700 dark:text-gray-200 shadow-sm'
                                    }
                                    ${msg.isPromoted ? 'border-2 border-indigo-400 dark:border-indigo-500 ring-4 ring-indigo-500/10' : ''}
                                `}>
                                    {msg.content.value}
                                </div>

                                <div className={`
                                    absolute top-0 flex items-center gap-0.5 p-0.5 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 transition-all z-10
                                    ${isMe ? 'right-full mr-2' : 'left-full ml-2'}
                                    ${isHoveringMessage === msg.id && !msg.isPromoted && !isViewer ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}
                                `}>
                                    {['owner', 'admin'].includes(currentUser.role) && !isMe && (
                                        <button
                                            onClick={() => promoteMessage(msg.id)}
                                            className="w-5 h-5 flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                                            title="Promote to Intent"
                                        >
                                            <ArrowRight className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                    <div className="flex items-center gap-2 px-1 animate-in fade-in slide-in-from-bottom-1 duration-200">
                        <div className="flex gap-0.5">
                            <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" />
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 italic">
                            {typingUsers.length <= 2
                                ? `${typingUsers.join(', ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`
                                : `${typingUsers[0]}, ${typingUsers[1]} and ${typingUsers.length - 2} others are typing...`
                            }
                        </span>
                    </div>
                )}
            </div>

            <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
                <div className="relative flex items-center gap-1">
                    {!isViewer && (
                        <div className="relative" ref={emojiPickerRef}>
                            <button
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={`p-1.5 rounded-lg transition-colors ${showEmojiPicker
                                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <Smile className="w-4 h-4" />
                            </button>

                            {showEmojiPicker && (
                                <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="grid grid-cols-8 gap-0.5">
                                        {COMMON_EMOJIS.map((emoji) => (
                                            <button
                                                key={emoji}
                                                onClick={() => insertEmoji(emoji)}
                                                className="w-7 h-7 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={inputText}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            disabled={isViewer}
                            maxLength={500}
                            placeholder={isViewer ? "Read-only workspace" : "Type a message..."}
                            className="w-full pl-3 pr-8 py-2 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 rounded-lg text-[12px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none text-gray-900 dark:text-white placeholder:text-gray-400 transition-all font-medium disabled:opacity-60"
                        />
                        {!isViewer && (
                            <button
                                onClick={handleSend}
                                disabled={!inputText.trim()}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-0 transition-all"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
