import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './ConfirmDialog.css';

const ConfirmDialog = ({
    isOpen,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    isDestructive = true
}) => {
    if (!isOpen) return null;

    return (
        <div className="confirm-modal-overlay">
            <div className="confirm-modal-panel">
                <div className="confirm-modal-header">
                    <div className="confirm-title-wrapper">
                        {isDestructive && <AlertTriangle size={20} className="confirm-warning-icon" />}
                        <h3 className="confirm-modal-title">{title}</h3>
                    </div>
                    <button className="confirm-modal-close" onClick={onCancel}>
                        <X size={18} />
                    </button>
                </div>

                <div className="confirm-modal-body">
                    <p>{message}</p>
                </div>

                <div className="confirm-modal-footer">
                    <button className="btn-cancel" onClick={onCancel}>
                        {cancelText}
                    </button>
                    <button
                        className={`btn-confirm ${isDestructive ? 'destructive' : ''}`}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
