import React, { useState } from 'react';
import { User, UserX, CornerDownRight, Heart } from 'lucide-react';
import { formatTimeAgo } from '../utils/timeAgo';

const ReplyCard = ({ reply, depth = 0, onReply }) => {
    const [likes, setLikes] = useState(reply.likesCount || 0);
    const [isLiked, setIsLiked] = useState(false);

    // In a full implementation, we'd have a toggleReplyLike analogous to toggleLike in communityService
    const handleLike = () => {
        setIsLiked(!isLiked);
        setLikes(prev => isLiked ? prev - 1 : prev + 1);
    };

    return (
        <div style={{
            marginLeft: depth > 0 ? `${depth * 20}px` : '0',
            marginTop: '12px',
            padding: '12px',
            backgroundColor: depth > 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            borderLeft: depth > 0 ? '2px solid var(--border-light)' : 'none',
            fontSize: '0.9rem'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    {reply.isAnonymous ? (
                        <><UserX size={14} /> Anonymous Sister</>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {reply.displayPhoto && (
                                <img
                                    src={reply.displayPhoto}
                                    alt={reply.displayName}
                                    style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                            )}
                            <span>{reply.displayName}</span>
                        </div>
                    )}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {formatTimeAgo(reply.createdAt)}
                </span>
            </div>

            <p style={{ color: 'var(--text-primary)', marginBottom: '12px', lineHeight: '1.4' }}>
                {reply.content}
            </p>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <button
                    onClick={handleLike}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                        color: isLiked ? 'var(--status-error)' : 'var(--text-muted)',
                        fontSize: '0.85rem'
                    }}
                >
                    <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} /> {likes}
                </button>

                {depth < 2 && (
                    <button
                        onClick={() => onReply(reply.id)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            color: 'var(--text-secondary)', fontSize: '0.85rem'
                        }}
                    >
                        <CornerDownRight size={14} /> Reply
                    </button>
                )}
            </div>
        </div>
    );
};

export default ReplyCard;
