import React, { useState } from 'react';
import { Camera, User, MapPin, Briefcase, ChevronRight, Check } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import './ProfileCreation.css';

const ProfileCreation = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    const [formData, setFormData] = useState({
        name: auth.currentUser?.displayName || '',
        username: '',
        bio: '',
        location: '',
        category: '',
        interests: []
    });

    const [avatarPreview, setAvatarPreview] = useState(null);

    const categories = [
        { id: 'student', label: 'Student' },
        { id: 'professional', label: 'Professional' },
        { id: 'entrepreneur', label: 'Entrepreneur' },
        { id: 'homemaker', label: 'Homemaker' },
        { id: 'creator', label: 'Creator' },
        { id: 'other', label: 'Other/Exploring' }
    ];

    const availableInterests = [
        "Career Growth", "Financial Literacy", "Mental Wellness",
        "Entrepreneurship", "Legal Awareness", "Motherhood",
        "Tech & Coding", "Arts & Culture", "Fitness"
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const toggleInterest = (interest) => {
        setFormData(prev => {
            if (prev.interests.includes(interest)) {
                return { ...prev, interests: prev.interests.filter(i => i !== interest) };
            } else {
                return { ...prev, interests: [...prev.interests, interest] };
            }
        });
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // In a real app, upload this to Firebase Storage. 
            // For now, we'll just create a local preview URL.
            const url = URL.createObjectURL(file);
            setAvatarPreview(url);
        }
    };

    const nextStep = () => {
        if (!formData.name || !formData.username) {
            alert("Please fill out your name and a username to continue.");
            return;
        }
        setStep(2);
    };

    const saveProfile = async () => {
        if (!auth.currentUser) return;
        setIsSaving(true);
        setSaveError("");
        try {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await setDoc(userRef, {
                ...formData,
                profileCompleted: true,
                onboardingStep: 2
            }, { merge: true });
            onComplete('/profile'); // Triggers App.jsx to render Profile
        } catch (error) {
            console.error("Error saving profile:", error);
            setSaveError("Failed to save profile. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="profile-creation-container">
            <div className="profile-creation-card fade-in">

                <div className="progress-indicator">
                    Step {step} of 2
                </div>

                {step === 1 ? (
                    <>
                        <div className="creation-header">
                            <h1>Complete Your Profile</h1>
                            <p>Let the sisterhood know a bit about you.</p>
                        </div>

                        <div className="avatar-upload-section">
                            <div className="avatar-preview-wrapper">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Preview" className="avatar-preview-image" />
                                ) : (
                                    <User size={40} color="#9ca3af" />
                                )}
                                <label htmlFor="avatar-upload" className="avatar-upload-label">
                                    <Camera size={16} />
                                </label>
                                <input
                                    type="file"
                                    id="avatar-upload"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    style={{ display: 'none' }}
                                />
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Upload Photo (Optional)</span>
                        </div>

                        <div className="form-group">
                            <label>Full Name</label>
                            <input type="text" name="name" className="creation-input" value={formData.name} onChange={handleInputChange} placeholder="E.g. Aisha Sharma" required />
                        </div>

                        <div className="form-group">
                            <label>Username</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '12px', color: '#9ca3af' }}>@</span>
                                <input type="text" name="username" className="creation-input" style={{ paddingLeft: '1.8rem' }} value={formData.username} onChange={handleInputChange} placeholder="aisha_speaks" required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Bio (Max 200 chars)</label>
                            <textarea name="bio" className="creation-textarea" value={formData.bio} onChange={handleInputChange} maxLength="200" placeholder="A short blurb about you..."></textarea>
                        </div>

                        <div className="form-group">
                            <label>Location</label>
                            <input type="text" name="location" className="creation-input" value={formData.location} onChange={handleInputChange} placeholder="E.g. Mumbai, India" />
                        </div>

                        <div className="step-actions">
                            <button className="btn-primary full-width" onClick={nextStep}>
                                Continue <ChevronRight size={18} />
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="creation-header fade-in">
                            <h1>Personalize Your Space</h1>
                            <p>What category best describes you?</p>
                        </div>

                        <div className="category-grid fade-in">
                            {categories.map(cat => (
                                <div
                                    key={cat.id}
                                    className={`category-card ${formData.category === cat.id ? 'selected' : ''}`}
                                    onClick={() => setFormData({ ...formData, category: cat.id })}
                                >
                                    <strong>{cat.label}</strong>
                                </div>
                            ))}
                        </div>

                        <div className="creation-header fade-in" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                            <p>What would you like to explore? (Select multiple)</p>
                        </div>

                        <div className="interests-container fade-in">
                            {availableInterests.map(interest => (
                                <div
                                    key={interest}
                                    className={`interest-pill ${formData.interests.includes(interest) ? 'selected' : ''}`}
                                    onClick={() => toggleInterest(interest)}
                                >
                                    {formData.interests.includes(interest) && <Check size={14} style={{ display: 'inline', marginRight: '4px' }} />}
                                    {interest}
                                </div>
                            ))}
                        </div>

                        <div className="step-actions fade-in" style={{ flexDirection: 'column', gap: '8px' }}>
                            {saveError && <div style={{ color: '#ff4d4d', fontSize: '0.85rem', textAlign: 'center', marginBottom: '8px' }}>{saveError}</div>}
                            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                                <button className="btn-secondary" onClick={() => setStep(1)} disabled={isSaving}>Back</button>
                                <button className="btn-primary full-width" onClick={saveProfile} disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save & Enter Community'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
};

export default ProfileCreation;
