import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import './Notifications.css';

export const NotificationDropdown = ({ notifications, onClose, onMarkAllRead }) => {
    const navigate = useNavigate();

    const handleNotificationClick = async (notif) => {
        // Mark as read
        if (!notif.isRead) {
            try {
                const batch = writeBatch(db);
                const notifRef = doc(db, 'notifications', notif.id);
                batch.update(notifRef, { isRead: true });
                await batch.commit();
            } catch (err) {
                console.error("Error marking read", err);
            }
        }

        // Navigation logic based on type
        switch (notif.type) {
            case 'follow':
                if (notif.senderUsername) {
                    navigate(`/profile/${notif.senderUsername}`);
                } else if (notif.senderId) {
                    navigate(`/user/${notif.senderId}`); // fallback
                }
                break;
            case 'like_post':
            case 'comment_post':
            case 'new_post_from_following':
                if (notif.referenceId) navigate(`/community`); // Replace with specific post route if available
                break;
            case 'like_story':
            case 'comment_story':
            case 'repost_story':
                if (notif.referenceId) navigate(`/stories`); // Replace with exact route
                break;
            case 'circle_join':
                navigate(`/circles`);
                break;
            default:
                break;
        }
        onClose();
    };

    const getMessage = (notif) => {
        const sender = notif.senderName || 'Someone';
        switch (notif.type) {
            case 'follow': return `${sender} followed you`;
            case 'like_post': return `${sender} liked your post`;
            case 'like_story': return `${sender} liked your story`;
            case 'comment_post': return `${sender} commented on your post`;
            case 'comment_story': return `${sender} commented on your story`;
            case 'repost_story': return `${sender} reposted your story`;
            case 'mention': return `${sender} mentioned you`;
            case 'circle_join': return `${sender} joined your circle`;
            case 'new_post_from_following': return `${sender} published a new post`;
            default: return `New notification from ${sender}`;
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
        return `${Math.floor(diffInSeconds / 86400)}d`;
    };

    return (
        <div className="notification-dropdown">
            <div className="notification-dropdown-header">
                <h3>Notifications</h3>
                <button onClick={onMarkAllRead} className="mark-read-btn">Mark all read</button>
            </div>
            <div className="notification-list">
                {notifications.length === 0 ? (
                    <div className="no-notifications">No notifications yet</div>
                ) : (
                    notifications.map(notif => (
                        <div
                            key={notif.id}
                            className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                            onClick={() => handleNotificationClick(notif)}
                        >
                            <img
                                src={notif.senderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(notif.senderName || 'U')}&background=E6E6FA&color=4A0E4E`}
                                alt="avatar"
                                className="notification-avatar"
                            />
                            <div className="notification-content">
                                <span className="notification-message">{getMessage(notif)}</span>
                                <span className="notification-time">{formatTime(notif.createdAt)}</span>
                            </div>
                            {!notif.isRead && <div className="unread-dot"></div>}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, user => {
            setCurrentUser(user);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!currentUser) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        const notifsRef = collection(db, 'notifications');
        const q = query(
            notifsRef,
            where('recipientId', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedNotifications = [];
            let unread = 0;
            snapshot.forEach((doc) => {
                const data = doc.data();
                fetchedNotifications.push({ id: doc.id, ...data });
                if (!data.isRead) {
                    unread++;
                }
            });
            setNotifications(fetchedNotifications);
            setUnreadCount(unread);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const markAllAsRead = async () => {
        if (!currentUser || unreadCount === 0) return;

        try {
            const batch = writeBatch(db);
            notifications.forEach(notif => {
                if (!notif.isRead) {
                    const notifRef = doc(db, 'notifications', notif.id);
                    batch.update(notifRef, { isRead: true });
                }
            });
            await batch.commit();
        } catch (error) {
            console.error("Error marking all as read", error);
        }
    };

    return (
        <div className="notification-bell-container" ref={dropdownRef}>
            <button className="action-button ml-2" onClick={toggleDropdown}>
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="badge-count">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <NotificationDropdown
                    notifications={notifications}
                    onClose={() => setIsOpen(false)}
                    onMarkAllRead={markAllAsRead}
                />
            )}
        </div>
    );
};

export default NotificationBell;
