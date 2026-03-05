import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Heart, MessageSquare, Repeat, Clock, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { toggleStoryLike, hasUserLikedStory, repostStory, undoRepostStory, deleteStory, hasUserRepostedStory } from '../utils/storyService';
import { auth } from '../firebase';
import { formatTimeAgo } from '../utils/timeAgo';
import EditStoryModal from './EditStoryModal';
import ConfirmDialog from './ConfirmDialog';
import './StoryCard.css';

const StoryCard = ({ story, onReadMore }) => {
    const [likes, setLikes] = useState(story.likesCount || 0);
    const [isLiked, setIsLiked] = useState(false);
    const [reposts, setReposts] = useState(story.repostCount || 0);
    const [isReposting, setIsReposting] = useState(false);
    const [hasReposted, setHasReposted] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const menuRef = useRef(null);

    const isAuthor = auth.currentUser?.uid === story.userId;
    const isEdited = !!story.editedAt;

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
        const checkInteractions = async () => {
            const [liked, reposted] = await Promise.all([
                hasUserLikedStory(story.id),
                hasUserRepostedStory(story.id)
            ]);
            setIsLiked(liked);
            setHasReposted(reposted);
        };
        checkInteractions();
    }, [story.id]);

    const handleLike = async () => {
        const previousState = isLiked;
        setIsLiked(!previousState);
        setLikes(prev => previousState ? prev - 1 : prev + 1);

        const success = await toggleStoryLike(story.id, previousState);
        if (!success) {
            setIsLiked(previousState);
            setLikes(prev => previousState ? prev + 1 : prev - 1);
        }
    };

    const handleRepost = async () => {
        if (isReposting) return;
        setIsReposting(true);

        if (hasReposted) {
            try {
                await undoRepostStory(story.id);
                setReposts(prev => Math.max(0, prev - 1));
                setHasReposted(false);
            } catch (error) {
                alert(error.message || "Could not undo repost.");
            }
        } else {
            try {
                await repostStory(story.id);
                setReposts(prev => prev + 1);
                setHasReposted(true);
            } catch (error) {
                alert(error.message || "Could not repost story.");
            }
        }
        setIsReposting(false);
    };

    const handleDeleteClick = () => {
        setShowMenu(false);
        setShowDeleteConfirm(true);
    };

    const executeDelete = async () => {
        setShowDeleteConfirm(false);
        setIsDeleting(true);
        try {
            await deleteStory(story.id, story.coverImagePublicId, story.media);
            // Story will be removed from feed via onSnapshot automatically
        } catch (error) {
            alert(error.message || "Could not delete story.");
            setIsDeleting(false);
        }
    };

    // Cloudinary transformation for feed cards: w_600,f_auto,q_auto
    const getOptimizedUrl = (url) => {
        if (!url || !url.includes("cloudinary.com")) return url;
        const parts = url.split("upload/");
        if (parts.length === 2) {
            return `${parts[0]}upload/w_600,f_auto,q_auto/${parts[1]}`;
        }
        return url;
    };

    return (
        <article className="card story-card">
            <div className="story-image-container" style={{ height: '200px' }}>
                <img
                    src={getOptimizedUrl(story.coverImageUrl) || "https://images.unsplash.com/photo-1542314831-c6a4d14d8c7c?q=80&w=600&auto=format&fit=crop"}
                    alt={story.title}
                    className="story-image"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1542314831-c6a4d14d8c7c?q=80&w=600&auto=format&fit=crop"; }}
                />
                <span className="badge category-badge-abs">{story.category}</span>
            </div>

            <div className="story-content-section">
                <div className="story-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                    <div>
                        <h3 className="story-name" style={{ fontSize: '1.2rem', marginBottom: '4px' }}>
                            {story.title}
                            {isEdited && <span style={{ fontSize: '0.8rem', fontStyle: 'italic', fontWeight: 'normal', color: '#9ca3af', marginLeft: '6px' }}>(edited)</span>}
                        </h3>
                        <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>
                            <span style={{ fontWeight: '600' }}>{story.authorName}</span>
                            {story.designation && <span> • {story.designation}</span>}
                        </div>
                    </div>

                    {isAuthor && (
                        <div style={{ position: 'relative' }} ref={menuRef}>
                            <button className="icon-btn" onClick={() => setShowMenu(!showMenu)} disabled={isDeleting}>
                                <MoreVertical size={18} className="text-gray-500" />
                            </button>
                            {showMenu && (
                                <div style={{
                                    position: 'absolute', top: '100%', right: '0', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10, width: '140px', overflow: 'hidden'
                                }}>
                                    <button
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#4b5563', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', textAlign: 'left' }}
                                        onClick={() => { setShowMenu(false); setShowEditModal(true); }}
                                    >
                                        <Edit2 size={14} /> Edit
                                    </button>
                                    <button
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onClick={handleDeleteClick}
                                    >
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="story-text" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: '16px'
                }}>
                    {story.content}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button className={`icon-btn flex items-center gap-1 ${isLiked ? 'text-red-500' : 'text-gray-500'}`} onClick={handleLike} style={{ color: isLiked ? '#e11d48' : '#6b7280', fontSize: '0.9rem' }}>
                            <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                            <span>{likes}</span>
                        </button>
                        <button className="icon-btn flex items-center gap-1 text-gray-500" onClick={onReadMore} style={{ fontSize: '0.9rem' }}>
                            <MessageSquare size={16} />
                            <span>{story.repliesCount || 0}</span>
                        </button>
                        <button className={`icon-btn flex items-center gap-1 ${hasReposted ? 'text-green-500' : 'text-gray-500'}`} onClick={handleRepost} disabled={isReposting} style={{ color: hasReposted ? '#10b981' : '#6b7280', fontSize: '0.9rem' }}>
                            <Repeat size={16} />
                            <span>{reposts}</span>
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#9ca3af' }}>
                        <Clock size={12} />
                        {formatTimeAgo(story.createdAt)}
                    </div>
                </div>

                <button className="btn btn-outline read-more-btn" onClick={onReadMore} style={{ width: '100%', marginTop: '16px' }}>
                    <span>Read Full Story</span>
                    <ExternalLink size={16} />
                </button>
            </div>

            {showEditModal && (
                <EditStoryModal
                    story={story}
                    onClose={() => setShowEditModal(false)}
                />
            )}

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Delete Story"
                message="Are you sure you want to delete this story for everyone? This action cannot be undone."
                confirmText={isDeleting ? "Deleting..." : "Delete"}
                cancelText="Cancel"
                onConfirm={executeDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                isDestructive={true}
            />
        </article>
    );
};

export default StoryCard;
