import React, { useState } from 'react';
import { ThumbsUp, MessageSquare, Bookmark, ShieldAlert, UserX } from 'lucide-react';
import './ThreadCard.css';

const ThreadCard = ({ thread }) => {
    const [upvotes, setUpvotes] = useState(thread.upvotes);
    const [isUpvoted, setIsUpvoted] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const handleUpvote = () => {
        if (isUpvoted) {
            setUpvotes(prev => prev - 1);
            setIsUpvoted(false);
        } else {
            setUpvotes(prev => prev + 1);
            setIsUpvoted(true);
        }
    };

    return (
        <article className="thread-card card">
            <div className="thread-header">
                <div className="thread-meta">
                    <span className="badge category-badge">{thread.category}</span>
                    <span className="thread-author">
                        <UserX size={14} className="mr-1" />
                        Anonymous Sister
                    </span>
                    <span className="thread-time">{thread.timeAgo}</span>
                </div>

                <div className="thread-actions-top">
                    <button
                        className={`icon-btn ${isSaved ? 'active-save' : ''}`}
                        onClick={() => setIsSaved(!isSaved)}
                        title="Save thread"
                    >
                        <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
                    </button>
                    <button className="icon-btn report-btn" title="Report content">
                        <ShieldAlert size={18} />
                    </button>
                </div>
            </div>

            <h3 className="thread-title">{thread.title}</h3>
            <p className="thread-content">{thread.content}</p>

            {thread.tags && thread.tags.length > 0 && (
                <div className="thread-tags">
                    {thread.tags.map(tag => (
                        <span key={tag} className="tag">#{tag}</span>
                    ))}
                </div>
            )}

            <div className="thread-footer">
                <button
                    className={`action-pill ${isUpvoted ? 'active-upvote' : ''}`}
                    onClick={handleUpvote}
                >
                    <ThumbsUp size={16} fill={isUpvoted ? "currentColor" : "none"} />
                    <span>{upvotes}</span>
                </button>

                <button className="action-pill">
                    <MessageSquare size={16} />
                    <span>{thread.replies} Replies</span>
                </button>
            </div>
        </article>
    );
};

export default ThreadCard;
