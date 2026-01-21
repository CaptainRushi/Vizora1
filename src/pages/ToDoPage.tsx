
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Check, Calendar, Trash2, Plus, Inbox, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Todo {
    id: string;
    title: string;
    completed: boolean;
    due_date: string | null;
    created_at: string;
}

export function ToDoPage() {
    const { user } = useAuth();
    const [todos, setTodos] = useState<Todo[]>([]);
    const [loading, setLoading] = useState(true);
    const [inputValue, setInputValue] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            fetchTodos();
        }
    }, [user]);

    const fetchTodos = async () => {
        try {
            setLoading(true);
            const data = await api.todos.all(user!.id);
            setTodos(data);
        } catch (error) {
            console.error('Failed to fetch todos', error);
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAdd = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            const tempId = `temp-${Date.now()}`;
            const optimisticTask: Todo = {
                id: tempId,
                title: inputValue.trim(),
                completed: false,
                due_date: parseDate(inputValue.trim()), // Simple parsing
                created_at: new Date().toISOString()
            };

            // Optimistic update
            setTodos(prev => [optimisticTask, ...prev]);
            setInputValue('');

            try {
                const newTask = await api.todos.create(user!.id, {
                    title: optimisticTask.title,
                    due_date: optimisticTask.due_date || undefined
                });

                // Replace optimistic with real
                setTodos(prev => prev.map(t => t.id === tempId ? newTask : t));
                toast.success('Task added');
            } catch (error) {
                console.error('Failed to add task', error);
                setTodos(prev => prev.filter(t => t.id !== tempId)); // Rollback
                toast.error('Failed to add task');
            }
        } else if (e.key === 'Escape') {
            setInputValue('');
            inputRef.current?.blur();
        }
    };

    const handleToggle = async (todo: Todo) => {
        // Optimistic
        setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: !t.completed } : t));

        try {
            await api.todos.update(user!.id, todo.id, { completed: !todo.completed });
        } catch (error) {
            console.error('Failed to update task', error);
            setTodos(prev => prev.map(t => t.id === todo.id ? todo : t)); // Rollback
            toast.error('Failed to update task');
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this task?')) return;

        const original = todos.find(t => t.id === id);
        setTodos(prev => prev.filter(t => t.id !== id));

        try {
            await api.todos.delete(user!.id, id);
            toast.success('Task deleted');
        } catch (error) {
            setTodos(prev => original ? [...prev, original] : prev);
            toast.error('Failed to delete task');
        }
    };

    const startEditing = (todo: Todo) => {
        setEditingId(todo.id);
        setEditValue(todo.title);
    };

    const saveEdit = async (id: string) => {
        if (!editValue.trim()) return;

        const originalTitle = todos.find(t => t.id === id)?.title;
        setTodos(prev => prev.map(t => t.id === id ? { ...t, title: editValue } : t));
        setEditingId(null);

        try {
            await api.todos.update(user!.id, id, { title: editValue });
        } catch (error) {
            setTodos(prev => prev.map(t => t.id === id ? { ...t, title: originalTitle || t.title } : t));
            toast.error('Failed to update title');
        }
    };

    // Helper to parse dates (Simple logic)
    const parseDate = (text: string): string | null => {
        const lower = text.toLowerCase();
        const today = new Date();
        if (lower.includes('tomorrow')) {
            const tmrw = new Date(today);
            tmrw.setDate(today.getDate() + 1);
            return tmrw.toISOString().split('T')[0];
        }
        if (lower.includes('next week')) {
            const next = new Date(today);
            next.setDate(today.getDate() + 7);
            return next.toISOString().split('T')[0];
        }
        return null; // Implicit "today" or no date
    };

    // Grouping
    const todayStr = new Date().toISOString().split('T')[0];

    // Sort logic
    const sortedTodos = [...todos].sort((a, b) => {
        if (a.completed === b.completed) {
            // Both completed or both active
            if (!a.completed) {
                // Active: Due date asc, then created desc
                const dateA = a.due_date || '9999-99-99';
                const dateB = b.due_date || '9999-99-99';
                return dateA.localeCompare(dateB) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            } else {
                // Completed: Most recently created first (or completed_at if we had it in frontend state)
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
        }
        return a.completed ? 1 : -1; // Active first
    });

    const activeTodos = sortedTodos.filter(t => !t.completed);
    const completedTodos = sortedTodos.filter(t => t.completed);

    const todayTasks = activeTodos.filter(t => !t.due_date || t.due_date <= todayStr);
    const upcomingTasks = activeTodos.filter(t => t.due_date && t.due_date > todayStr);


    return (
        <div className="max-w-3xl mx-auto px-6 py-12">

            {/* Header */}
            <div className="mb-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 mb-4 shadow-sm">
                    <CheckCircle2 className="h-8 w-8" />
                </div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">My Tasks</h1>
                <p className="text-gray-500 font-medium">Capture ideas and track your daily progress.</p>
            </div>

            {/* Input */}
            <div className="relative mb-12 shadow-xl shadow-indigo-100/50 rounded-2xl bg-white border-2 border-indigo-50 group focus-within:border-indigo-500/50 transition-all">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400">
                    <Plus className="w-5 h-5" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleQuickAdd}
                    placeholder="Add a task... (try 'tomorrow', 'next week')"
                    className="w-full pl-14 pr-6 py-5 text-lg font-medium bg-transparent border-none focus:ring-0 rounded-2xl placeholder:text-gray-300 text-gray-900"
                    autoFocus
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-300 border border-gray-100 px-2 py-1 rounded bg-gray-50/50 uppercase tracking-widest hidden group-focus-within:block">
                    Enter to add
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <p className="tex-sm font-bold text-gray-400">Loading your list...</p>
                </div>
            )}

            {!loading && (
                <div className="space-y-10">
                    {/* Empty State */}
                    {todos.length === 0 && (
                        <div className="text-center py-16 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm mb-4">
                                <Inbox className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-gray-900 font-bold mb-1">Nothing here yet</h3>
                            <p className="text-sm text-gray-500">Add your first task above to get started.</p>
                        </div>
                    )}

                    {/* Today */}
                    {todayTasks.length > 0 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-xs font-bold text-indigo-500 uppercase tracking-widest px-2 mb-2">Today / Overdue</h2>
                            {todayTasks.map(t => (
                                <TaskItem
                                    key={t.id}
                                    todo={t}
                                    editingId={editingId}
                                    editValue={editValue}
                                    setEditValue={setEditValue}
                                    onToggle={handleToggle}
                                    onDelete={handleDelete}
                                    onStartEdit={startEditing}
                                    onSaveEdit={saveEdit}
                                    onCancelEdit={() => setEditingId(null)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Upcoming */}
                    {upcomingTasks.length > 0 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Upcoming</h2>
                            {upcomingTasks.map(t => (
                                <TaskItem
                                    key={t.id}
                                    todo={t}
                                    editingId={editingId}
                                    editValue={editValue}
                                    setEditValue={setEditValue}
                                    onToggle={handleToggle}
                                    onDelete={handleDelete}
                                    onStartEdit={startEditing}
                                    onSaveEdit={saveEdit}
                                    onCancelEdit={() => setEditingId(null)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Completed */}
                    {completedTodos.length > 0 && (
                        <div className="pt-8 border-t border-gray-100">
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-4">Completed</h2>
                            <div className="space-y-1 opacity-60 hover:opacity-100 transition-opacity">
                                {completedTodos.map(t => (
                                    <TaskItem
                                        key={t.id}
                                        todo={t}
                                        editingId={editingId}
                                        editValue={editValue}
                                        setEditValue={setEditValue}
                                        onToggle={handleToggle}
                                        onDelete={handleDelete}
                                        onStartEdit={startEditing}
                                        onSaveEdit={saveEdit}
                                        onCancelEdit={() => setEditingId(null)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function TaskItem({
    todo,
    editingId,
    editValue,
    setEditValue,
    onToggle,
    onDelete,
    onStartEdit,
    onSaveEdit,
    onCancelEdit
}: any) {
    const isEditing = editingId === todo.id;
    const isOverdue = !todo.completed && todo.due_date && todo.due_date < new Date().toISOString().split('T')[0];

    return (
        <div className={`group flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ${isEditing ? 'bg-white shadow-lg ring-2 ring-indigo-500/10' : 'bg-white border border-gray-100 hover:border-indigo-200 hover:shadow-md'}`}>

            {/* Checkbox */}
            <button
                onClick={() => onToggle(todo)}
                className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${todo.completed
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-gray-200 text-transparent hover:border-indigo-400'}`}
            >
                <Check className="w-4 h-4" strokeWidth={3} />
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => onSaveEdit(todo.id)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveEdit(todo.id);
                            if (e.key === 'Escape') onCancelEdit();
                        }}
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-gray-900 font-medium"
                        autoFocus
                    />
                ) : (
                    <div
                        onClick={() => onStartEdit(todo)}
                        className="cursor-text group/text"
                    >
                        <p className={`font-medium truncate transition-all ${todo.completed ? 'text-gray-400 line-through decoration-2 decoration-gray-200' : 'text-gray-900 group-hover/text:text-indigo-900'}`}>
                            {todo.title}
                        </p>
                        {(todo.due_date || isOverdue) && !todo.completed && (
                            <div className={`flex items-center gap-1.5 mt-0.5 text-xs font-bold ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                                <Calendar className="w-3 h-3" />
                                {isOverdue ? 'Overdue' : new Date(todo.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                {!isEditing && (
                    <button
                        onClick={(e) => onDelete(todo.id, e)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
                {isEditing && (
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mr-2">
                        Enter to save
                    </span>
                )}
            </div>
        </div>
    );
}
