import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { ConfirmDialog } from './ConfirmDialog';

interface SnapshotFile {
    path: string;
    versionId: string;
    size: number;
}

interface SnapshotUser {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
}

interface Snapshot {
    id: string;
    label: string | null;
    files: SnapshotFile[];
    user: SnapshotUser;
    createdAt: string;
}

interface SnapshotPanelProps {
    replId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const SnapshotPanel = ({ replId, isOpen, onClose }: SnapshotPanelProps) => {
    const { getAccessTokenSilently } = useAuth0();
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [restoring, setRestoring] = useState<string | null>(null);
    const [label, setLabel] = useState('');
    const [showLabelInput, setShowLabelInput] = useState(false);
    const [snapshotToRestore, setSnapshotToRestore] = useState<Snapshot | null>(null);
    const apiUrl = import.meta.env.VITE_API_URL;

    const fetchSnapshots = useCallback(async () => {
        if (!replId) return;
        setLoading(true);
        try {
            const token = await getAccessTokenSilently();
            const response = await axios.get(`${apiUrl}/projects/${replId}/snapshots`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSnapshots(response.data);
        } catch (error) {
            console.error("Failed to fetch snapshots", error);
        } finally {
            setLoading(false);
        }
    }, [replId, getAccessTokenSilently, apiUrl]);

    useEffect(() => {
        if (isOpen) {
            fetchSnapshots();
        }
    }, [isOpen, fetchSnapshots]);

    const handleCreate = async () => {
        setCreating(true);
        try {
            const token = await getAccessTokenSilently();
            await axios.post(
                `${apiUrl}/projects/${replId}/snapshots`,
                { label: label.trim() || undefined },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setLabel('');
            setShowLabelInput(false);
            await fetchSnapshots();
        } catch (error: any) {
            console.error("Failed to create snapshot", error);
            const msg = error?.response?.data || "Failed to create snapshot";
            alert(msg);
        } finally {
            setCreating(false);
        }
    };

    const handleRestore = async () => {
        if (!snapshotToRestore) return;
        setRestoring(snapshotToRestore.id);
        try {
            const token = await getAccessTokenSilently();
            await axios.post(
                `${apiUrl}/projects/${replId}/snapshots/${snapshotToRestore.id}/restore`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("Snapshot restored! Refresh the page to see updated files.");
            setSnapshotToRestore(null);
        } catch (error: any) {
            console.error("Failed to restore snapshot", error);
            const msg = error?.response?.data || "Failed to restore snapshot";
            alert(msg);
        } finally {
            setRestoring(null);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString(undefined, {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getTotalSize = (files: SnapshotFile[]) => {
        return files.reduce((sum, f) => sum + (f.size || 0), 0);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[900]"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 h-screen w-[400px] bg-syncode-dark border-l border-syncode-gray-700 z-[901] flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.8)] animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-syncode-gray-700 shrink-0">
                    <h2 className="text-xs uppercase tracking-widest font-mono text-white m-0">Snapshots</h2>
                    <button
                        className="bg-transparent border-none cursor-pointer text-syncode-gray-400 hover:text-white transition-colors text-lg p-0"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                {/* Create Snapshot */}
                <div className="px-5 py-4 border-b border-syncode-gray-700 shrink-0">
                    {showLabelInput ? (
                        <div className="flex flex-col gap-2">
                            <input
                                className="p-2 bg-syncode-black border border-syncode-gray-700 text-white font-mono text-xs rounded focus:outline-none focus:border-white"
                                placeholder="Snapshot label (optional)"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                maxLength={100}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreate();
                                    if (e.key === 'Escape') { setShowLabelInput(false); setLabel(''); }
                                }}
                            />
                            <div className="flex gap-2">
                                <button
                                    className="flex-1 bg-white text-black border-none px-3 py-2 text-[10px] uppercase tracking-wide font-mono cursor-pointer rounded transition-all duration-200 hover:bg-syncode-gray-200 disabled:opacity-50"
                                    onClick={handleCreate}
                                    disabled={creating}
                                >
                                    {creating ? "Creating..." : "Create Snapshot"}
                                </button>
                                <button
                                    className="bg-transparent border border-syncode-gray-600 text-syncode-gray-300 px-3 py-2 text-[10px] uppercase tracking-wide font-mono cursor-pointer rounded transition-all duration-200 hover:border-white hover:text-white"
                                    onClick={() => { setShowLabelInput(false); setLabel(''); }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            className="w-full bg-white text-black border-none px-4 py-2.5 text-[10px] uppercase tracking-widest font-mono cursor-pointer rounded transition-all duration-200 hover:bg-syncode-gray-200 hover:-translate-y-0.5 disabled:opacity-50"
                            onClick={() => setShowLabelInput(true)}
                            disabled={creating}
                        >
                            + Create Snapshot
                        </button>
                    )}
                </div>

                {/* Snapshot List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-syncode-gray-700 border-t-white rounded-full animate-spin" />
                        </div>
                    ) : snapshots.length === 0 ? (
                        <div className="text-center text-syncode-gray-500 py-12 text-xs font-mono px-5">
                            No snapshots yet. Create one to save the current state of your project.
                        </div>
                    ) : (
                        snapshots.map((snapshot) => (
                            <div
                                key={snapshot.id}
                                className="px-5 py-4 border-b border-syncode-gray-700/50 hover:bg-syncode-gray-900/50 transition-colors duration-200"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs text-white font-mono">
                                            {snapshot.label || "Unnamed snapshot"}
                                        </div>
                                        <div className="text-[10px] text-syncode-gray-500 mt-1 flex items-center gap-2">
                                            <span>{formatTime(snapshot.createdAt)}</span>
                                            <span>·</span>
                                            <span>{(snapshot.files as SnapshotFile[]).length} files</span>
                                            <span>·</span>
                                            <span>{formatSize(getTotalSize(snapshot.files as SnapshotFile[]))}</span>
                                        </div>
                                        <div className="text-[10px] text-syncode-gray-500 mt-0.5">
                                            by {snapshot.user.name || snapshot.user.email}
                                        </div>
                                    </div>
                                    <button
                                        className="bg-transparent border border-syncode-gray-600 text-syncode-gray-300 px-2 py-1 text-[10px] uppercase tracking-wide font-mono cursor-pointer rounded transition-all duration-200 hover:border-white hover:text-white flex-shrink-0 disabled:opacity-50"
                                        onClick={() => setSnapshotToRestore(snapshot)}
                                        disabled={restoring === snapshot.id}
                                    >
                                        {restoring === snapshot.id ? "..." : "Restore"}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Restore Confirmation Dialog */}
            <ConfirmDialog
                open={Boolean(snapshotToRestore)}
                title="Restore Snapshot"
                message={`Restore project to "${snapshotToRestore?.label || "Unnamed snapshot"}" from ${snapshotToRestore ? formatTime(snapshotToRestore.createdAt) : ""}? Current files will be overwritten.`}
                confirmText="Restore"
                cancelText="Cancel"
                danger
                busy={Boolean(restoring)}
                onCancel={() => { if (!restoring) setSnapshotToRestore(null); }}
                onConfirm={handleRestore}
            />
        </>
    );
};
