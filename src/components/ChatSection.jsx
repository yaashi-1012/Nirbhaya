import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, ArrowLeft, MessageCircle, Smile } from 'lucide-react';
import { listenToCircleMessages, sendCircleMessage } from '../utils/communityService';
import './ChatSection.css';

const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ChatSection = ({ circle, membershipRole, currentUser, onBack }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!membershipRole) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribe = listenToCircleMessages(circle.id, (fetchedMessages) => {
            setMessages(fetchedMessages);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [circle.id, membershipRole]);

    useEffect(() => {
        // Auto scroll to bottom when messages load or change
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            setSending(true);
            await sendCircleMessage(circle.id, {
                text: newMessage,
                isAnonymous: circle.allowAnonymous ? isAnonymous : false,
                role: membershipRole
            });
            setNewMessage("");
            // Scroll will happen automatically due to snapshot listener
        } catch (error) {
            console.error("Failed to send message:", error);
            alert("Failed to send message. Please try again.");
        } finally {
            setSending(false);
        }
    };

    if (!membershipRole) {
        return (
            <div className="chat-section-locked card">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageCircle size={18} /> Circle Chat
                </h3>
                <p>Join this circle to participate in the chat and connect with other sisters.</p>
            </div>
        );
    }

    return (
        <div className="chat-section card">
            <div className="chat-header">
                <div className="chat-header-info">
                    {onBack && (
                        <button className="chat-back-btn" onClick={onBack}>
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <span className="chat-header-icon">
                        {circle.icon && circle.icon.startsWith('http') ? (
                            <img src={circle.icon} alt="icon" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                            circle.icon
                        )}
                    </span>
                    <h3>{circle.name} Chat</h3>
                </div>
                <span className="live-badge">Live</span>
            </div>

            <div className="chat-messages-container">
                {loading ? (
                    <div className="chat-loading">
                        <Loader2 size={32} className="spinning" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="chat-empty">
                        <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            No messages yet. Say hello to your sisters! <Smile size={18} />
                        </p>
                    </div>
                ) : (
                    <div className="chat-messages">
                        {messages.map((msg, index) => {
                            const isMine = msg.userId === currentUser?.uid;
                            return (
                                <div key={msg.id || index} className={`chat-message ${isMine ? 'mine' : 'theirs'}`}>
                                    {!isMine && (
                                        <img src={msg.displayPhoto} alt={msg.displayName} className="chat-avatar" />
                                    )}
                                    <div className="chat-bubble-wrapper">
                                        {!isMine && (
                                            <span className="chat-name">
                                                {msg.displayName}
                                                {msg.isAdmin && <span style={{ padding: '2px 6px', background: 'var(--color-plum)', color: 'white', fontSize: '10px', borderRadius: '4px', marginLeft: '6px', fontWeight: '600' }}>Admin</span>}
                                            </span>
                                        )}
                                        <div className="chat-bubble">
                                            <p>{msg.text}</p>
                                        </div>
                                        <span className="chat-time">{formatTime(msg.createdAt)}</span>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            <form className="chat-input-area" onSubmit={handleSend}>
                {circle.allowAnonymous && (
                    <label className="anon-toggle" title="Post Anonymously">
                        <input
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            disabled={sending}
                        />
                        <span className={`anon-icon ${isAnonymous ? 'active' : ''}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={isAnonymous ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ghost"><path d="M9 10h.01" /><path d="M15 10h.01" /><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" /></svg>
                        </span>
                    </label>
                )}

                <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                />
                <button type="submit" disabled={!newMessage.trim() || sending} className="send-btn">
                    {sending ? <Loader2 size={18} className="spinning" /> : <Send size={18} />}
                </button>
            </form>
        </div>
    );
};

export default ChatSection;
