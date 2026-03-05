import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { searchUsers } from '../utils/userService';
import { useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import './Header.css';

const Header = () => {
    const [avatarUrl, setAvatarUrl] = useState("https://ui-avatars.com/api/?name=User&background=E6E6FA&color=4A0E4E");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const searchRef = useRef(null);
    const navigate = useNavigate();

    // Debounce search effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length >= 1) {
                setIsSearching(true);
                const results = await searchUsers(searchQuery);
                setSearchResults(results);
                setShowDropdown(true);
                setIsSearching(false);
            } else {
                setSearchResults([]);
                setShowDropdown(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, user => {
            if (user) {
                const userRef = doc(db, "users", user.uid);
                const unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setAvatarUrl(data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.username || 'Sister')}&background=E6E6FA&color=4A0E4E`);
                        setCurrentUser({ ...user, username: data.username || user.uid });
                    }
                });
                return () => unsubscribeDoc();
            } else {
                setAvatarUrl("https://ui-avatars.com/api/?name=User&background=E6E6FA&color=4A0E4E");
                setCurrentUser(null);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const handleResultClick = (userId) => {
        setShowDropdown(false);
        setSearchQuery("");
        navigate(`/user/${userId}`);
    };

    return (
        <header className="main-header">
            <div className="header-search" ref={searchRef}>
                <input
                    type="text"
                    placeholder="Search sisters by username or name..."
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                        if (searchResults.length > 0 || isSearching) {
                            setShowDropdown(true);
                        }
                    }}
                />

                {/* Search Dropdown */}
                {showDropdown && (
                    <div className="search-dropdown">
                        {isSearching ? (
                            <div className="search-dropdown-message">Searching...</div>
                        ) : searchResults.length > 0 ? (
                            searchResults.map((user) => (
                                <div
                                    className="search-result-item"
                                    key={user.id}
                                    onClick={() => handleResultClick(user.id)}
                                >
                                    <img src={user.photoURL} alt={user.name} className="search-result-avatar" />
                                    <div className="search-result-info">
                                        <div className="search-result-name">{user.name || "Sister"}</div>
                                        {user.username && <div className="search-result-username">@{user.username}</div>}
                                    </div>
                                </div>
                            ))
                        ) : searchQuery.length >= 1 ? (
                            <div className="search-dropdown-message">No sisters found.</div>
                        ) : null}
                    </div>
                )}
            </div>

            <div className="header-actions">
                <NotificationBell />

                <div
                    className="user-profile cursor-pointer"
                    onClick={() => {
                        navigate('/profile');
                    }}
                >
                    <img
                        src={avatarUrl}
                        alt="User profile"
                        className="avatar"
                    />
                </div>
            </div>
        </header>
    );
};

export default Header;
