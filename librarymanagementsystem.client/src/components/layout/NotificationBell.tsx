import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../../api/notifications.ts';

/** Bell in the student header: due-soon and overdue reminders written by the daily reminder job. */
export function NotificationBell() {
    const { data: notifications = [] } = useNotifications();
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();
    const unread = notifications.filter(notification => !notification.isRead).length;

    return (
        <div className="dropdown dropdown-end">
            <button tabIndex={0} className="btn btn-ghost btn-sm btn-circle indicator" aria-label={`Notifications, ${unread} unread`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                    />
                </svg>
                {unread > 0 && <span className="indicator-item badge badge-error badge-xs">{unread}</span>}
            </button>
            <div tabIndex={0} className="dropdown-content z-40 mt-2 w-80 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
                <div className="flex items-center justify-between px-2 py-1">
                    <h2 className="font-bold">Notifications</h2>
                    <button className="btn btn-ghost btn-xs" disabled={unread === 0} onClick={() => markAllRead.mutate()}>
                        Mark all read
                    </button>
                </div>
                {notifications.length === 0 ? (
                    <p className="px-2 py-4 text-center text-sm opacity-70">No reminders. You are all caught up.</p>
                ) : (
                    <ul className="max-h-80 overflow-y-auto">
                        {notifications.map(notification => (
                            <li key={notification.id}>
                                <button
                                    className={`flex w-full flex-col gap-1 rounded-btn px-2 py-2 text-left text-sm hover:bg-base-200 ${
                                        notification.isRead ? 'opacity-60' : ''
                                    }`}
                                    onClick={() => !notification.isRead && markRead.mutate(notification.id)}
                                >
                                    <span className="flex items-center gap-2">
                                        <span
                                            className={`badge badge-xs ${notification.kind === 'Overdue' ? 'badge-error' : 'badge-warning'}`}
                                        />
                                        <span className="text-xs opacity-70">
                                            {notification.kind === 'Overdue' ? 'Overdue' : 'Due soon'} ·{' '}
                                            {new Date(notification.createdAtUtc).toLocaleDateString()}
                                        </span>
                                    </span>
                                    <span>{notification.message}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
