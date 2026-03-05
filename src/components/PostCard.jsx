import React, { useState, useEffect, useRef } from 'react';
import { ThumbsUp, MessageSquare, Bookmark, ShieldAlert, UserX, Share2, Globe, Lock, Edit3, MoreVertical, Trash2, EyeOff } from 'lucide-react';
import { toggleLike, hasUserLikedPost, toggleSavePost, hasUserSavedPost, deletePostForEveryone, hidePostForMe, incrementPostShareCount } from '../utils/communityService';
import { auth } from '../firebase';
import { formatTimeAgo } from '../utils/timeAgo';
import ReplySection from './ReplySection';
import ReportModal from './ReportModal';
import ConfirmDialog from './ConfirmDialog';
import './ThreadCard.css';

const PostCard = ({ post }) => {
    // For Phase 1, we just use local state to mirror engagement visually, 
    // actual Phase 3 will handle Firestore updates.
    const [likes, setLikes] = useState(post.likesCount || 0);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [showReplies, setShowReplies] = useState(false);
    const [localRepliesCount, setLocalRepliesCount] = useState(post.repliesCount || 0);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null); // 'deleteForEveryone', 'deleteForMe', or null
    const menuRef = useRef(null);

    const isAuthor = auth.currentUser?.uid === post.userId;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    useEffect(() => {
        const checkStatuses = async () => {
            const [liked, saved] = await Promise.all([
                hasUserLikedPost(post.id),
                hasUserSavedPost(post.id)
            ]);
            setIsLiked(liked);
            setIsSaved(saved);
        };
        checkStatuses();
    }, [post.id]);

    const handleLike = async () => {
        // Optimistic update
        const previousLikedState = isLiked;
        setIsLiked(!previousLikedState);
        setLikes(prev => previousLikedState ? prev - 1 : prev + 1);

        const success = await toggleLike(post.id, previousLikedState);
        if (!success) {
            // Revert if API fails
            setIsLiked(previousLikedState);
            setLikes(prev => previousLikedState ? prev + 1 : prev - 1);
        }
    };

    const handleSave = async () => {
        const previousSavedState = isSaved;
        setIsSaved(!previousSavedState);

        const success = await toggleSavePost(post.id, previousSavedState);
        if (!success) {
            setIsSaved(previousSavedState);
        }
    };

    const isEdited = !!post.editedAt;

    const handleDeleteForEveryoneClick = () => {
        setShowMenu(false);
        setConfirmAction('deleteForEveryone');
    };

    const handleDeleteForMeClick = () => {
        setShowMenu(false);
        setConfirmAction('deleteForMe');
    };

    const confirmDeleteAction = async () => {
        const actionType = confirmAction;
        setConfirmAction(null);
        setIsDeleting(true);

        if (actionType === 'deleteForEveryone') {
            try {
                await deletePostForEveryone(post.id);
            } catch (error) {
                alert(error.message || "Could not delete post.");
                setIsDeleting(false);
            }
        } else if (actionType === 'deleteForMe') {
            try {
                await hidePostForMe(post.id);
            } catch (error) {
                alert(error.message || "Could not hide post.");
                setIsDeleting(false);
            }
        }
    };

    const handleShare = async () => {
        const postUrl = `${window.location.origin}/community`; // Fallback route, ideally /post/:id
        const shareData = {
            title: post.title || 'Sisterhood Q&A Post',
            text: post.content ? post.content.substring(0, 100) + '...' : 'Check out this post on Nirbhaya!',
            url: postUrl
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(postUrl);
                alert("Post link copied to clipboard!");
            }

            // Increment in the backend (listener will update UI)
            await incrementPostShareCount(post.id);
        } catch (error) {
            console.error("Error sharing post:", error);
        }
    };

    if (isDeleting && !isAuthor) {
        return null; // Optimistically hide it for "Delete for Me" instantly
    }

    return (
        <article className={`thread-card card ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="thread-header">
                <div className="thread-meta">
                    <span className="badge category-badge">{post.category}</span>

                    <span className="thread-author">
                        {post.isAnonymous ? (
                            <><UserX size={14} className="mr-1" /> Anonymous Sister</>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {post.displayPhoto && (
                                    <img
                                        src={post.displayPhoto}
                                        alt={post.displayName}
                                        style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                                    />
                                )}
                                <span>{post.displayName}</span>
                            </div>
                        )}
                    </span>

                    <span className="thread-time" title={post.createdAt ? new Date(post.createdAt.toDate ? post.createdAt.toDate() : post.createdAt).toLocaleString() : ''}>
                        {formatTimeAgo(post.createdAt)}
                        {isEdited && <span style={{ marginLeft: '4px', fontStyle: 'italic', fontSize: '0.8rem' }}>(edited)</span>}
                    </span>

                    {post.visibility === 'circle' ? (
                        <span className="thread-time" title="Visible to Circle only" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Lock size={12} /> Circle
                        </span>
                    ) : (
                        <span className="thread-time" title="Public" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Globe size={12} /> Public
                        </span>
                    )}
                </div>

                <div className="thread-actions-top" style={{ position: 'relative' }}>
                    <button
                        className={`icon-btn ${isSaved ? 'active-save' : ''}`}
                        onClick={handleSave}
                        title={isSaved ? "Saved" : "Save post"}
                    >
                        <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
                    </button>
                    <div style={{ display: 'inline-block' }} ref={menuRef}>
                        <button className="icon-btn" onClick={() => setShowMenu(!showMenu)}>
                            <MoreVertical size={18} className="text-gray-500" />
                        </button>

                        {showMenu && (
                            <div style={{
                                position: 'absolute', top: '100%', right: '0', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10, width: '180px', overflow: 'hidden'
                            }}>
                                {isAuthor ? (
                                    <button
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onClick={handleDeleteForEveryoneClick}
                                    >
                                        <Trash2 size={14} /> Delete for Everyone
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#4b5563', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', textAlign: 'left' }}
                                            onClick={handleDeleteForMeClick}
                                        >
                                            <EyeOff size={14} /> Delete for Me (Hide)
                                        </button>
                                        <button
                                            style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#4b5563', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                            onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                                        >
                                            <ShieldAlert size={14} /> Report Post
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <h3 className="thread-title">{post.title}</h3>
            <p className="thread-content">{post.content}</p>

            {post.hashtags && post.hashtags.length > 0 && (
                <div className="thread-tags">
                    {post.hashtags.map(tag => (
                        <span key={tag} className="tag">#{tag}</span>
                    ))}
                </div>
            )}

            <div className="thread-footer">
                <button
                    className={`action-pill ${isLiked ? 'active-upvote' : ''}`}
                    onClick={handleLike}
                >
                    <ThumbsUp size={16} fill={isLiked ? "currentColor" : "none"} />
                    <span>{likes}</span>
                </button>

                <button
                    className={`action-pill ${showReplies ? 'active' : ''}`}
                    onClick={() => setShowReplies(!showReplies)}
                >
                    <MessageSquare size={16} />
                    <span>{localRepliesCount} Replies</span>
                </button>

                <button className="action-pill" onClick={handleShare}>
                    <Share2 size={16} />
                    <span>{post.shareCount || 0}</span>
                </button>
            </div>

            {showReplies && (
                <ReplySection
                    postId={post.id}
                    onReplyAdded={() => setLocalRepliesCount(prev => prev + 1)}
                />
            )}

            {showReportModal && (
                <ReportModal
                    postId={post.id}
                    onClose={() => setShowReportModal(false)}
                    onReportSuccess={() => alert('Report submitted successfully. Thank you for keeping our community safe.')}
                />
            )}

            <ConfirmDialog
                isOpen={!!confirmAction}
                title={confirmAction === 'deleteForEveryone' ? "Delete Post" : "Hide Post from Feed"}
                message={
                    confirmAction === 'deleteForEveryone'
                        ? "Are you sure you want to delete this post for everyone? This action cannot be undone."
                        : "Are you sure you want to hide this post from your feed? It will remain visible to others."
                }
                confirmText={isDeleting ? "Processing..." : confirmAction === 'deleteForEveryone' ? "Delete" : "Hide Post"}
                cancelText="Cancel"
                onConfirm={confirmDeleteAction}
                onCancel={() => setConfirmAction(null)}
                isDestructive={true}
            />
        </article>
    );
};

export default PostCard;
