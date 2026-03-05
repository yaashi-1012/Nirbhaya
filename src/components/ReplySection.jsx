import React, { useState, useEffect } from 'react';
import { Send, User, UserX, Loader2 } from 'lucide-react';
import { listenToReplies, addReply } from '../utils/communityService';
import ReplyCard from './ReplyCard';

const ReplySection = ({ postId, onReplyAdded }) => {
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newReplyContent, setNewReplyContent] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingToId, setReplyingToId] = useState(null);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = listenToReplies(postId, (liveReplies) => {
            setReplies(liveReplies);
            setLoading(false);
        }, (error) => {
            console.error(error);
            setLoading(false);
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [postId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newReplyContent.trim()) return;

        setIsSubmitting(true);
        try {
            const replyData = {
                content: newReplyContent.trim(),
                isAnonymous,
                parentReplyId: replyingToId
            };

            await addReply(postId, replyData);

            // Listener handles UI update
            setNewReplyContent('');
            setReplyingToId(null);

            if (onReplyAdded) onReplyAdded();
        } catch (error) {
            console.error("Failed to post reply:", error);
            alert("Failed to post reply. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Organize replies into a tree for rendering nested threads
    const buildReplyTree = (flatReplies) => {
        const replyMap = {};
        const roots = [];

        flatReplies.forEach(r => {
            replyMap[r.id] = { ...r, children: [] };
        });

        flatReplies.forEach(r => {
            if (r.parentReplyId && replyMap[r.parentReplyId]) {
                replyMap[r.parentReplyId].children.push(replyMap[r.id]);
            } else {
                roots.push(replyMap[r.id]);
            }
        });

        return roots;
    };

    const renderReplyTree = (nodes, depth = 0) => {
        return nodes.map(node => (
            <div key={node.id}>
                <ReplyCard
                    reply={node}
                    depth={depth}
                    onReply={(id) => setReplyingToId(id)}
                />
                {node.children && node.children.length > 0 && (
                    <div style={{ paddingLeft: '8px' }}>
                        {renderReplyTree(node.children, depth + 1)}
                    </div>
                )}
            </div>
        ));
    };

    const roots = buildReplyTree(replies);

    return (
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--text-primary)' }}>Replies ({replies.length})</h4>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    <Loader2 size={24} className="spinning" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : replies.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                    No replies yet. Be the first to share your thoughts!
                </p>
            ) : (
                <div style={{ marginBottom: '24px' }}>
                    {renderReplyTree(roots)}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                marginTop: '16px'
            }}>
                {replyingToId && (
                    <div style={{
                        fontSize: '0.85rem', color: 'var(--accent-primary)', marginBottom: '8px',
                        display: 'flex', justifyContent: 'space-between'
                    }}>
                        <span>Replying to thread...</span>
                        <button
                            type="button"
                            onClick={() => setReplyingToId(null)}
                            style={{ background: 'none', border: 'none', color: 'var(--status-error)', cursor: 'pointer' }}
                        >
                            Cancel Reply
                        </button>
                    </div>
                )}

                <textarea
                    value={newReplyContent}
                    onChange={(e) => setNewReplyContent(e.target.value)}
                    placeholder="Write a supportive reply..."
                    disabled={isSubmitting}
                    style={{
                        width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'vertical',
                        minHeight: '80px', marginBottom: '12px'
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <input
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            disabled={isSubmitting}
                            style={{ accentColor: 'var(--accent-primary)' }}
                        />
                        {isAnonymous ? <UserX size={16} /> : <User size={16} />}
                        Reply Anonymously
                    </label>

                    <button
                        type="submit"
                        disabled={isSubmitting || !newReplyContent.trim()}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                    >
                        {isSubmitting ? <><Loader2 size={16} className="spinning" /> Posting...</> : <><Send size={16} /> Reply</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ReplySection;
