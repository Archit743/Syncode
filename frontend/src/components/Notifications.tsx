import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

interface NotificationItem {
    id: string;
    type: string;
    message: string;
    metadata: string | null;
    read: boolean;
    createdAt: string;
}

export const Notifications = () => {
    const { getAccessTokenSilently } = useAuth0();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [actionBusy, setActionBusy] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const apiUrl = import.meta.env.VITE_API_URL;

    const fetchNotifications = useCallback(async () => {
        try {
            const token = await getAccessTokenSilently();
            const response = await axios.get(`${apiUrl}/me/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(response.data.notifications);
            setUnreadCount(response.data.unreadCount);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    }, [getAccessTokenSilently, apiUrl]);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAllRead = async () => {
        try {
            const token = await getAccessTokenSilently();
            await axios.patch(`${apiUrl}/me/notifications/read-all`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all read", error);
        }
    };

    const handleMarkRead = async (id: string) => {
        try {
            const token = await getAccessTokenSilently();
            await axios.patch(`${apiUrl}/me/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };

    const handleAcceptRequest = async (notif: NotificationItem) => {
        if (!notif.metadata) return;
        const meta = JSON.parse(notif.metadata);
        setActionBusy(notif.id);
        try {
            const token = await getAccessTokenSilently();
            await axios.post(`${apiUrl}/collaboration-requests/${meta.requestId}/accept`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await handleMarkRead(notif.id);
            await fetchNotifications();
        } catch (error) {
            console.error("Failed to accept request", error);
            alert("Failed to accept request");
        } finally {
            setActionBusy(null);
        }
    };

    const handleRejectRequest = async (notif: NotificationItem) => {
        if (!notif.metadata) return;
        const meta = JSON.parse(notif.metadata);
        setActionBusy(notif.id);
        try {
            const token = await getAccessTokenSilently();
            await axios.post(`${apiUrl}/collaboration-requests/${meta.requestId}/reject`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await handleMarkRead(notif.id);
            await fetchNotifications();
        } catch (error) {
            console.error("Failed to reject request", error);
            alert("Failed to reject request");
        } finally {
            setActionBusy(null);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon */}
            <button
                className="relative bg-transparent border-none cursor-pointer p-1 flex items-center justify-center transition-all duration-200 group"
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen && unreadCount > 0) {
                        // Don't auto-mark-read, let user do it
                    }
                }}
                title="Notifications"
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-syncode-gray-300 group-hover:text-white transition-colors duration-200"
                >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-[380px] max-h-[480px] bg-syncode-dark border border-syncode-gray-700 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-[200] overflow-hidden animate-fade-in">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-syncode-gray-700">
                        <span className="text-xs uppercase tracking-widest font-mono text-white">Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                className="text-[10px] uppercase tracking-wide text-syncode-gray-400 hover:text-white transition-colors duration-200 bg-transparent border-none cursor-pointer font-mono"
                                onClick={handleMarkAllRead}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto max-h-[420px]">
                        {notifications.length === 0 ? (
                            <div className="text-center text-syncode-gray-500 py-8 text-xs font-mono">
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    className={`px-4 py-3 border-b border-syncode-gray-700/50 transition-colors duration-200 ${notif.read
                                            ? "bg-transparent"
                                            : "bg-syncode-gray-900"
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Unread dot */}
                                        <div className="mt-1.5 flex-shrink-0">
                                            {!notif.read ? (
                                                <div className="w-2 h-2 rounded-full bg-blue-400" />
                                            ) : (
                                                <div className="w-2 h-2" />
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] text-syncode-gray-200 leading-relaxed m-0">
                                                {notif.message}
                                            </p>
                                            <span className="text-[10px] text-syncode-gray-500 mt-1 block">
                                                {formatTime(notif.createdAt)}
                                            </span>

                                            {/* Accept/Reject buttons for collab requests */}
                                            {notif.type === "collab_request" && !notif.read && (
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        className="bg-white text-black border-none px-3 py-1 text-[10px] uppercase tracking-wide font-mono cursor-pointer rounded transition-all duration-200 hover:bg-syncode-gray-200 disabled:opacity-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAcceptRequest(notif);
                                                        }}
                                                        disabled={actionBusy === notif.id}
                                                    >
                                                        {actionBusy === notif.id ? "..." : "Accept"}
                                                    </button>
                                                    <button
                                                        className="bg-transparent border border-syncode-gray-600 text-syncode-gray-300 px-3 py-1 text-[10px] uppercase tracking-wide font-mono cursor-pointer rounded transition-all duration-200 hover:border-white hover:text-white disabled:opacity-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRejectRequest(notif);
                                                        }}
                                                        disabled={actionBusy === notif.id}
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Mark as read button */}
                                        {!notif.read && notif.type !== "collab_request" && (
                                            <button
                                                className="bg-transparent border-none cursor-pointer text-syncode-gray-500 hover:text-white transition-colors p-0 flex-shrink-0 mt-1"
                                                onClick={() => handleMarkRead(notif.id)}
                                                title="Mark as read"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
