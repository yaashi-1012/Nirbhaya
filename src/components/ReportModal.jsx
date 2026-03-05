import React, { useState } from 'react';
import { X, ShieldAlert, Loader2 } from 'lucide-react';
import { reportPost } from '../utils/communityService';
import './NewPostModal.css'; // Reusing modal styles

const ReportModal = ({ postId, onClose, onReportSuccess }) => {
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const reasons = [
        "Spam or misleading",
        "Hate speech or harassment",
        "Graphic or violent content",
        "Self-harm or suicide",
        "Breaking community anonymity guidelines"
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason) {
            setError('Please select a reason for reporting.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await reportPost(postId, reason, details);
            onReportSuccess();
            onClose();
        } catch (err) {
            console.error("Failed to report:", err);
            setError(err.message || 'Failed to submit report. You may have already reported this post.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="new-post-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Report Content <ShieldAlert size={20} style={{ color: 'var(--status-error)', marginLeft: '8px' }} /></h2>
                    <button className="icon-btn" onClick={onClose}><X size={24} /></button>
                </div>

                <form className="new-post-form" onSubmit={handleSubmit}>
                    {error && <div className="error-banner">{error}</div>}

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>
                        Reporting helps keep our community safe. Your report will be completely anonymous.
                    </p>

                    <div className="form-group">
                        <label>Why are you reporting this post?</label>
                        <select
                            className="form-input"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                        >
                            <option value="" disabled>Select a reason...</option>
                            {reasons.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Additional Details (Optional)</label>
                        <textarea
                            className="form-textarea"
                            placeholder="Provide any additional context to help moderators review..."
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            style={{ minHeight: '80px' }}
                        />
                    </div>

                    <div className="modal-actions" style={{ justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ backgroundColor: 'var(--status-error)' }}>
                            {isSubmitting ? <><Loader2 size={18} className="spinning" /> Submitting...</> : "Submit Report"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReportModal;
