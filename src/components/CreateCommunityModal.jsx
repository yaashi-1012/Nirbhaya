import React, { useState } from 'react';
import { X, Shield, Users, EyeOff, Loader2 } from 'lucide-react';
import { createCircle } from '../utils/communityService';
import './NewPostModal.css'; // Reusing base modal styles

const categories = ["Career", "Health", "Mental Health", "Relationships", "Entrepreneurship", "Safety", "Education", "Hobbies", "Motherhood"];

const CreateCommunityModal = ({ onClose, onCircleCreated }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'Career',
        privacyType: 'public',
        allowAnonymous: true,
        rules: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.description.trim()) {
            setError('Please provide a name and description for your circle.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            // Process rules from newline to array
            const rulesArray = formData.rules.split('\n').filter(r => r.trim() !== '');

            const newCircleData = {
                ...formData,
                rules: rulesArray
            };

            const newCircle = await createCircle(newCircleData);
            onCircleCreated(newCircle);
            onClose();
        } catch (err) {
            console.error("Failed to create circle:", err);
            setError(err.message || 'Failed to create community. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="new-post-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create a Sister Circle ⭕</h2>
                    <button className="icon-btn" onClick={onClose}><X size={24} /></button>
                </div>

                <form className="new-post-form" onSubmit={handleSubmit} style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '8px' }}>
                    {error && <div className="error-banner">{error}</div>}

                    <div className="form-group">
                        <label>Circle Name *</label>
                        <input
                            type="text"
                            name="name"
                            className="form-input"
                            placeholder="e.g. Women in Tech Seattle"
                            value={formData.name}
                            onChange={handleChange}
                            maxLength={50}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Description *</label>
                        <textarea
                            name="description"
                            className="form-textarea"
                            placeholder="What is this circle about? Who is it for?"
                            value={formData.description}
                            onChange={handleChange}
                            maxLength={300}
                            style={{ minHeight: '80px' }}
                            required
                        />
                    </div>

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label>Category</label>
                            <select
                                name="category"
                                className="form-input"
                                value={formData.category}
                                onChange={handleChange}
                            >
                                {categories.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Privacy Type</label>
                            <select
                                name="privacyType"
                                className="form-input"
                                value={formData.privacyType}
                                onChange={handleChange}
                            >
                                <option value="public">🌍 Public (Open to all)</option>
                                <option value="private">🔒 Private (Request to join)</option>
                                <option value="secret">🕵️‍♀️ Secret (Invite only)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Community Rules (Optional)</label>
                        <textarea
                            name="rules"
                            className="form-textarea"
                            placeholder="Enter rules separated by new lines... e.g.&#10;1. Be kind&#10;2. No self-promotion"
                            value={formData.rules}
                            onChange={handleChange}
                            style={{ minHeight: '100px' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginTop: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: 'var(--color-beige)', padding: '16px', borderRadius: '12px' }}>
                            <input
                                type="checkbox"
                                name="allowAnonymous"
                                checked={formData.allowAnonymous}
                                onChange={handleChange}
                                style={{ transform: 'scale(1.2)' }}
                            />
                            <div>
                                <span style={{ fontWeight: 600, display: 'block' }}>Allow Anonymous Posts</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>If enabled, members can choose to hide their identity when posting in this circle.</span>
                            </div>
                        </label>
                    </div>

                    <div className="modal-actions" style={{ justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 size={18} className="spinning" /> Creating...</> : "Create Circle"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCommunityModal;
