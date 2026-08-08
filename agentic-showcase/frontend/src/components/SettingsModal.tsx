import React, { useState, useEffect } from 'react';
import { X, Settings, Cpu, Zap, Shield } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SettingsData {
    provider: string;
    groq_model_planner: string;
    groq_model_coder: string;
    groq_model_reviewer: string;
    has_groq_keys: boolean;
    has_openai_key: boolean;
    available_providers: string[];
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [settings, setSettings] = useState<SettingsData | null>(null);
    const [provider, setProvider] = useState('mock');
    const [plannerModel, setPlannerModel] = useState('');
    const [coderModel, setCoderModel] = useState('');
    const [reviewerModel, setReviewerModel] = useState('');
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetch('/api/settings').then(r => r.json()).then(data => {
                setSettings(data);
                setProvider(data.provider);
                setPlannerModel(data.groq_model_planner);
                setCoderModel(data.groq_model_coder);
                setReviewerModel(data.groq_model_reviewer);
            }).catch(console.error);
        }
    }, [isOpen]);

    const handleSave = async () => {
        setSaving(true);
        setStatus(null);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    groq_model_planner: plannerModel,
                    groq_model_coder: coderModel,
                    groq_model_reviewer: reviewerModel
                })
            });
            if (res.ok) {
                setStatus('Settings saved (this session only)');
                setTimeout(() => onClose(), 1200);
            }
        } catch (e) {
            setStatus('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const providerOptions = settings?.available_providers || ['mock', 'groq', 'openai', 'ollama'];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div 
                className="relative bg-[var(--panel)] border border-[var(--border)] rounded-xl w-[480px] max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2">
                        <Settings size={18} className="text-[var(--accent)]" />
                        <h2 className="font-semibold">Agent Settings</h2>
                    </div>
                    <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 space-y-5">
                    {/* Provider Selection */}
                    <div>
                        <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2 block">LLM Provider</label>
                        <div className="grid grid-cols-4 gap-2">
                            {providerOptions.map(p => (
                                <button
                                    key={p}
                                    onClick={() => setProvider(p)}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                                        provider === p 
                                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' 
                                            : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)]'
                                    }`}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                        {provider === 'groq' && !settings?.has_groq_keys && (
                            <p className="text-xs text-[var(--warning)] mt-2">⚠ No Groq API keys configured in .env</p>
                        )}
                        {provider === 'openai' && !settings?.has_openai_key && (
                            <p className="text-xs text-[var(--warning)] mt-2">⚠ No OpenAI API key configured in .env</p>
                        )}
                    </div>

                    {/* Model Assignments */}
                    {provider !== 'mock' && (
                        <div className="space-y-3">
                            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1 block">Agent Model Assignments</label>
                            
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 w-24 shrink-0">
                                        <Zap size={12} className="text-[var(--accent)]" />
                                        <span className="text-xs text-[var(--muted)]">Planner</span>
                                    </div>
                                    <input
                                        value={plannerModel}
                                        onChange={e => setPlannerModel(e.target.value)}
                                        className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-2.5 py-1.5 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                                        placeholder="llama-3.1-8b-instant"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 w-24 shrink-0">
                                        <Cpu size={12} className="text-[var(--accent)]" />
                                        <span className="text-xs text-[var(--muted)]">Coder</span>
                                    </div>
                                    <input
                                        value={coderModel}
                                        onChange={e => setCoderModel(e.target.value)}
                                        className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-2.5 py-1.5 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                                        placeholder="llama-3.3-70b-versatile"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 w-24 shrink-0">
                                        <Shield size={12} className="text-[var(--accent)]" />
                                        <span className="text-xs text-[var(--muted)]">Reviewer</span>
                                    </div>
                                    <input
                                        value={reviewerModel}
                                        onChange={e => setReviewerModel(e.target.value)}
                                        className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-2.5 py-1.5 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                                        placeholder="llama-3.1-8b-instant"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {status && (
                        <p className={`text-xs ${status.includes('Failed') ? 'text-[var(--danger)]' : 'text-[var(--accent)]'}`}>{status}</p>
                    )}
                </div>

                <div className="flex justify-end gap-2 p-4 border-t border-[var(--border)]">
                    <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>Save Settings</Button>
                </div>
            </div>
        </div>
    );
}
