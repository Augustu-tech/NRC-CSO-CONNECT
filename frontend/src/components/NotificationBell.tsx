import { useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import { getNotifications, markNotificationRead, markAllNotificationsRead, type Notification } from "../api/client";
import { Link } from "react-router-dom";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const load = () => {
    getNotifications()
      .then((r) => setNotifications(r.data.results || r.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    // Poll every 60 seconds for new notifications
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRead = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-faith-600 hover:text-faith-800 flex items-center gap-1"
              >
                <Check size={14} /> Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                You're all caught up!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((n) => {
                  const content = (
                    <div className={`p-4 ${!n.is_read ? "bg-faith-50/50" : "bg-white"} hover:bg-slate-50 transition`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`text-sm ${!n.is_read ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.body}</p>
                          <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-wide">
                            {new Date(n.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {!n.is_read && (
                          <button
                            onClick={(e) => handleRead(n.id, e)}
                            className="text-faith-600 hover:text-faith-800 p-1"
                            title="Mark as read"
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );

                  if (n.link) {
                    return (
                      <Link key={n.id} to={n.link} onClick={() => setIsOpen(false)}>
                        {content}
                      </Link>
                    );
                  }
                  return <div key={n.id}>{content}</div>;
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
