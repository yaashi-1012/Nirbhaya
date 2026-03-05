import React, { useState } from 'react';
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadToCloudinary } from '../cloudinaryUpload';
import './EditCircleModal.css';

const CATEGORIES = [
    "All", "Career", "Health", "Mental Health",
    "Relationships", "Entrepreneurship", "Safety"
];

const EditCircleModal = ({ circle, onClose, onSave, onDelete }) => {
    const [name, setName] = useState(circle.name || "");
    const [description, setDescription] = useState(circle.description || "");
    const [category, setCategory] = useState(circle.category || "General");
    const [privacyType, setPrivacyType] = useState(circle.privacyType || "public");
    const [allowAnonymous, setAllowAnonymous] = useState(circle.allowAnonymous || false);

    const [iconFile, setIconFile] = useState(null);
    const [coverFile, setCoverFile] = useState(null);

    // For previewing existing or new images
    const [iconPreview, setIconPreview] = useState(circle.icon || "");
    const [coverPreview, setCoverPreview] = useState(circle.coverImage || "");

    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this circle? This action cannot be undone.")) {
            setDeleting(true);
            try {
                await onDelete();
            } catch (err) {
                console.error("Failed to delete circle:", err);
                setError("Failed to delete circle. Please try again.");
                setDeleting(false);
            }
        }
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError(`File too large (max 5MB)`);
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        if (type === 'icon') {
            setIconFile(file);
            setIconPreview(previewUrl);
        } else {
            setCoverFile(file);
            setCoverPreview(previewUrl);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!name.trim()) return setError("Circle name is required.");
        if (!description.trim()) return setError("Description is required.");

        setLoading(true);

        try {
            let iconUrl = circle.icon;
            let coverUrl = circle.coverImage;

            const uploadTasks = [];

            if (iconFile) {
                uploadTasks.push(uploadToCloudinary(iconFile).then(url => iconUrl = url || circle.icon));
            }
            if (coverFile) {
                uploadTasks.push(uploadToCloudinary(coverFile).then(url => coverUrl = url || circle.coverImage));
            }

            await Promise.all(uploadTasks);

            const updatedData = {
                name,
                description,
                category,
                privacyType,
                allowAnonymous,
                icon: iconUrl,
                coverImage: coverUrl
            };

            await onSave(updatedData);
            onClose();
        } catch (err) {
            console.error("Failed to update circle:", err);
            setError(err.message || "Failed to update circle. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content admin-edit-modal">
                <button className="close-btn" onClick={onClose}><X size={20} /></button>
                <h2>Edit Circle</h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="edit-circle-form">
                    <div className="form-group images-group">
                        <div className="image-upload-wrapper icon-upload">
                            <label>Circle Icon / Logo</label>
                            <div className="image-preview" style={{ backgroundImage: `url(${iconPreview})`, backgroundColor: iconPreview && !iconPreview.startsWith('http') && !iconPreview.startsWith('blob') ? 'transparent' : '#eee' }}>
                                {!iconPreview.startsWith('http') && !iconPreview.startsWith('blob') && <span className="text-icon">{iconPreview}</span>}
                                <div className="upload-overlay">
                                    <Upload size={16} />
                                </div>
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'icon')} />
                            </div>
                        </div>

                        <div className="image-upload-wrapper cover-upload">
                            <label>Banner Image</label>
                            <div className="image-preview cover-preview" style={{ backgroundImage: `url(${coverPreview})` }}>
                                {!coverPreview && <ImageIcon size={24} color="#999" />}
                                <div className="upload-overlay">
                                    <Upload size={16} /> Change Banner
                                </div>
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'cover')} />
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Circle Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={50}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={300}
                            rows={3}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Category</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={loading}>
                                {CATEGORIES.filter(c => c !== "All").map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Privacy Type</label>
                            <select value={privacyType} onChange={(e) => setPrivacyType(e.target.value)} disabled={loading}>
                                <option value="public">🌍 Public (Anyone can find and join)</option>
                                <option value="private">🔒 Private (Must request to join)</option>
                                <option value="secret">🕵️‍♀️ Secret (Hidden from search)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={allowAnonymous}
                                onChange={(e) => setAllowAnonymous(e.target.checked)}
                                disabled={loading}
                            />
                            <span className="checkbox-text">
                                <strong>Allow Anonymous Posts</strong>
                                <span className="help-text">Members can hide their identity when posting in this circle.</span>
                            </span>
                        </label>
                    </div>

                    <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                        {onDelete ? (
                            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={loading || deleting} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none' }}>
                                {deleting ? "Deleting..." : "Delete Circle"}
                            </button>
                        ) : (
                            <div></div>
                        )}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading || deleting}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={loading || deleting}>
                                {loading ? <><Loader2 size={16} className="spinning" /> Saving...</> : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCircleModal;
