import React, { useState } from 'react';
import { X, Send, User, UserX, Loader2 } from 'lucide-react';
import './NewPostModal.css';

const CATEGORIES = ["Career", "Health", "Mental Health", "Relationships", "Entrepreneurship", "Safety", "Education"];
const CIRCLES = [
    { id: "public", name: "Public (Everyone)" },
    { id: "women-in-tech", name: "Women in Tech" },
    { id: "new-mothers", name: "New Mothers" }
];

const NewPostModal = ({ onClose, onSubmit }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [visibility, setVisibility] = useState('public');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!title.trim() || !content.trim()) {
            setError("Title and content are required.");
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                title: title.trim(),
                content: content.trim(),
                category,
                visibility: visibility === 'public' ? 'public' : 'circle',
                circleId: visibility === 'public' ? null : visibility,
                isAnonymous
            });
            onClose();
        } catch (err) {
            console.error(err);
            setError("Failed to create post. Please try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="new-post-modal">
                <div className="modal-header">
                    <h2>Create New Post</h2>
                    <button className="icon-btn" onClick={onClose} disabled={isSubmitting}>
                        <X size={24} />
                    </button>
                </div>

                {error && <div className="error-banner">{error}</div>}

                <form onSubmit={handleSubmit} className="new-post-form">
                    <div className="form-group">
                        <label>Title</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="What's on your mind?"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={100}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-group">
                        <label>Content (add #hashtags anywhere!)</label>
                        <textarea
                            className="form-textarea"
                            placeholder="Share your experience, ask a question, support a sister..."
                            rows="5"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            disabled={isSubmitting}
                        ></textarea>
                    </div>

                    <div className="form-row">
                        <div className="form-group half">
                            <label>Category</label>
                            <select
                                className="form-input"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                disabled={isSubmitting}
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group half">
                            <label>Post To (Visibility)</label>
                            <select
                                className="form-input"
                                value={visibility}
                                onChange={(e) => setVisibility(e.target.value)}
                                disabled={isSubmitting}
                            >
                                {CIRCLES.map(circle => (
                                    <option key={circle.id} value={circle.id}>{circle.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <label className="toggle-label">
                            <input
                                type="checkbox"
                                className="toggle-input"
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                                disabled={isSubmitting}
                            />
                            <div className="toggle-switch"></div>
                            <span className="toggle-text" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {isAnonymous ? <UserX size={16} /> : <User size={16} />}
                                Post Anonymously
                            </span>
                        </label>

                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <><Loader2 size={18} className="spinning" /> Posting...</>
                            ) : (
                                <><Send size={18} /> Publish Post</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewPostModal;
