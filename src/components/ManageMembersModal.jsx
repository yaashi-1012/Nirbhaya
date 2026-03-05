import React, { useState, useEffect } from 'react';
import { X, Shield, UserX, Loader2 } from 'lucide-react';
import { fetchCircleMembers, removeMember } from '../utils/communityService';
import './EditCircleModal.css';

const ManageMembersModal = ({ circle, onClose, currentUser }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    useEffect(() => {
        const loadMembers = async () => {
            try {
                const data = await fetchCircleMembers(circle.id);
                setMembers(data);
            } catch (err) {
                console.error(err);
                alert("Failed to load members.");
            } finally {
                setLoading(false);
            }
        };
        loadMembers();
    }, [circle.id]);

    const handleRemove = async (memberUserId) => {
        if (!window.confirm("Are you sure you want to remove this member?")) return;

        setActionLoadingId(memberUserId);
        try {
            await removeMember(circle.id, memberUserId);
            // Optimistic active member list update
            setMembers(members.filter(m => m.userId !== memberUserId));
        } catch (err) {
            console.error(err);
            alert("Failed to remove member.");
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content admin-edit-modal" style={{ maxWidth: '500px' }}>
                <button className="close-btn" onClick={onClose}><X size={20} /></button>
                <h2>Manage Members</h2>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <Loader2 size={32} className="spinning" style={{ color: 'var(--color-plum)' }} />
                    </div>
                ) : (
                    <div className="members-list" style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '16px' }}>
                        {members.map(member => (
                            <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <img src={member.displayPhoto} alt={member.displayName} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                    <div>
                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                            {member.displayName}
                                            {member.userId === currentUser.uid && " (You)"}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {member.role === 'admin' ? <><Shield size={12} /> Admin</> : 'Member'}
                                        </div>
                                    </div>
                                </div>

                                {member.role !== 'admin' && (
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '6px 12px', color: '#dc3545', borderColor: '#ffcdd2', background: '#ffebee', display: 'flex', alignItems: 'center', gap: '6px' }}
                                        onClick={() => handleRemove(member.userId)}
                                        disabled={actionLoadingId === member.userId}
                                    >
                                        {actionLoadingId === member.userId ? <Loader2 size={14} className="spinning" /> : <><UserX size={14} /> Remove</>}
                                    </button>
                                )}
                            </div>
                        ))}
                        {members.length === 0 && !loading && (
                            <p style={{ textAlign: 'center', color: '#666' }}>No members found.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageMembersModal;
