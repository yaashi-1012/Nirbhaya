import React, { useState } from 'react';
import { X, Loader2, Edit3 } from 'lucide-react';
import { editStory } from '../utils/storyService';
import './ShareStoryModal.css'; // Reusing the same CSS for consistent layout

const EditStoryModal = ({ story, onClose, onEditSuccess }) => {
    const [formData, setFormData] = useState({
        title: story.title || '',
        designation: story.designation || '',
        content: story.content || ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await editStory(story.id, {
                title: formData.title,
                designation: formData.designation,
                content: formData.content
            });

            if (onEditSuccess) {
                onEditSuccess(); // Usually you'd pass updated data or rely on onSnapshot to automatically refresh
            }
            onClose();
        } catch (err) {
            console.error("Failed to edit story:", err);
            setError(err.message || 'Failed to edit story. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="story-modal-overlay">
            <div className="story-modal-panel" style={{ maxWidth: '600px' }}>
                <div className="story-modal-header">
                    <h2 className="story-modal-title">
                        <Edit3 size={24} />
                        Edit Your Story
                    </h2>
                    <button className="story-modal-close" onClick={onClose} disabled={loading}><X size={20} /></button>
                </div>

                <div className="story-modal-body">
                    {error && <div className="story-error-banner">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="story-form-group">
                            <label className="story-form-label">Title *</label>
                            <input
                                type="text"
                                name="title"
                                className="story-form-input"
                                value={formData.title}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="story-form-group">
                            <label className="story-form-label">Your Designation / Subtitle</label>
                            <input
                                type="text"
                                name="designation"
                                className="story-form-input"
                                value={formData.designation}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="story-form-group">
                            <label className="story-form-label">Story Content *</label>
                            <textarea
                                name="content"
                                className="story-form-textarea"
                                value={formData.content}
                                onChange={handleInputChange}
                                rows={8}
                                required
                            ></textarea>
                        </div>

                        <div className="story-modal-footer">
                            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
                            <button type="submit" className="btn-publish" disabled={loading}>
                                {loading ? <><Loader2 size={16} className="spin" /> Saving...</> : "Save Changes"}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditStoryModal;
