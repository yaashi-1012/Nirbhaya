import React, { useState } from 'react';
import { X, Image as ImageIcon, Loader2, BookOpen } from 'lucide-react';
import { createStory } from '../utils/storyService';
import { uploadToCloudinaryAdvanced } from '../cloudinaryUpload';
import './ShareStoryModal.css';

const CATEGORIES = ["Inspiration", "Career", "Motherhood", "Financial Independence", "Health & Wellness", "Technology"];

const ShareStoryModal = ({ onClose, onPublishSuccess }) => {
    const [formData, setFormData] = useState({
        title: '',
        designation: '',
        category: 'Inspiration',
        content: ''
    });

    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);

    const [mediaFiles, setMediaFiles] = useState([]);
    const [mediaPreviews, setMediaPreviews] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCoverChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    const handleMediaChange = (e) => {
        const files = Array.from(e.target.files);
        if (mediaFiles.length + files.length > 4) {
            alert("You can only upload up to 4 additional media images.");
            return;
        }

        const newFiles = [...mediaFiles, ...files];
        setMediaFiles(newFiles);
        setMediaPreviews(newFiles.map(f => URL.createObjectURL(f)));
    };

    const removeMedia = (index) => {
        const newFiles = [...mediaFiles];
        newFiles.splice(index, 1);
        setMediaFiles(newFiles);

        const newPreviews = [...mediaPreviews];
        newPreviews.splice(index, 1);
        setMediaPreviews(newPreviews);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!coverFile) {
            setError('A cover image is required for a story.');
            setLoading(false);
            return;
        }

        try {
            // Upload Cover Image
            const coverResult = await uploadToCloudinaryAdvanced(coverFile, "sisterhood/stories/covers");

            // Upload additional media concurrent
            const mediaUploadPromises = mediaFiles.map(file =>
                uploadToCloudinaryAdvanced(file, "sisterhood/stories/media")
            );
            const mediaResults = await Promise.all(mediaUploadPromises);

            const storyData = {
                title: formData.title,
                designation: formData.designation,
                category: formData.category,
                content: formData.content,
                coverImageUrl: coverResult.url,
                coverImagePublicId: coverResult.publicId,
                media: mediaResults.map(res => ({ url: res.url, publicId: res.publicId }))
            };

            const newStory = await createStory(storyData);

            if (onPublishSuccess) {
                onPublishSuccess(newStory);
            }
            onClose();
        } catch (err) {
            console.error("Failed to publish story:", err);
            setError(err.message || 'Failed to publish story. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="story-modal-overlay">
            <div className="story-modal-panel">
                <div className="story-modal-header">
                    <h2 className="story-modal-title">
                        <BookOpen size={24} />
                        Share Your Story
                    </h2>
                    <button className="story-modal-close" onClick={onClose} disabled={loading}><X size={20} /></button>
                </div>

                <div className="story-modal-body">
                    {error && <div className="story-error-banner">{error}</div>}

                    <form onSubmit={handleSubmit}>

                        <div className="story-form-group">
                            <label className="story-form-label">Cover Image *</label>
                            <div className="cover-dropzone" onClick={() => !coverPreview && document.getElementById('cover-upload').click()}>
                                {coverPreview ? (
                                    <>
                                        <img src={coverPreview} alt="Cover" className="cover-preview-img" />
                                        <label htmlFor="cover-upload" className="cover-change-btn">
                                            Change Cover
                                        </label>
                                    </>
                                ) : (
                                    <div className="cover-dropzone-placeholder">
                                        <ImageIcon size={32} />
                                        <span className="upload-main-text">Upload Cover Image</span>
                                        <span className="upload-sub-text">Recommended: 1200x600</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    id="cover-upload"
                                    accept="image/*"
                                    onChange={handleCoverChange}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </div>

                        <div className="story-form-group">
                            <label className="story-form-label">Title *</label>
                            <input
                                type="text"
                                name="title"
                                className="story-form-input"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="A Journey to Financial Independence"
                                required
                            />
                        </div>

                        <div className="story-row">
                            <div className="story-form-group">
                                <label className="story-form-label">Your Designation / Subtitle</label>
                                <input
                                    type="text"
                                    name="designation"
                                    className="story-form-input"
                                    value={formData.designation}
                                    onChange={handleInputChange}
                                    placeholder="E.g. Full Stack Developer"
                                />
                            </div>
                            <div className="story-form-group">
                                <label className="story-form-label">Category *</label>
                                <select
                                    name="category"
                                    className="story-form-select"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    required
                                >
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="story-form-group">
                            <label className="story-form-label">Story Content *</label>
                            <textarea
                                name="content"
                                className="story-form-textarea"
                                value={formData.content}
                                onChange={handleInputChange}
                                placeholder="Write your beautiful story here..."
                                rows={8}
                                required
                            ></textarea>
                        </div>

                        <div className="story-form-group">
                            <label className="story-form-label">Additional Media (Max 4)</label>
                            <div className="media-grid">
                                {mediaPreviews.map((preview, index) => (
                                    <div key={index} className="media-thumb">
                                        <img src={preview} alt="Media" />
                                        <button
                                            type="button"
                                            className="media-remove-btn"
                                            onClick={() => removeMedia(index)}>
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                {mediaFiles.length < 4 && (
                                    <label htmlFor="media-upload" className="media-add-btn">
                                        <ImageIcon size={24} />
                                    </label>
                                )}
                            </div>
                            <input
                                type="file"
                                id="media-upload"
                                accept="image/*"
                                multiple
                                onChange={handleMediaChange}
                                style={{ display: 'none' }}
                            />
                        </div>

                        <div className="story-modal-footer">
                            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
                            <button type="submit" className="btn-publish" disabled={loading}>
                                {loading ? <><Loader2 size={16} className="spin" /> Publishing...</> : "Publish Story"}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default ShareStoryModal;
