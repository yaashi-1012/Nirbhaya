import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { Mail, Lock, User as UserIcon, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import './AuthGateway.css';
import illustration from '../assets/unity_profiles.png';
import { signInWithPopup, fetchSignInMethodsForEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const AuthGateway = ({ onLoginSuccess }) => {
    const [step, setStep] = useState(1); // 1: Email, 2: Login or Signup Details
    const [mode, setMode] = useState('login'); // 'login' or 'signup'
    const [authMessage, setAuthMessage] = useState('');
    const [authError, setAuthError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState(null); // 'google'
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        interests: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (e.target.name === 'email') {
            setStep(1);
            setAuthError('');
            setAuthMessage('');
        } else if (e.target.name === 'password' || e.target.name === 'confirmPassword') {
            setAuthError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthMessage('');

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setAuthError("Please enter a valid email.");
            return;
        }

        setIsLoading(true);

        try {
            if (step === 1) {
                const methods = await fetchSignInMethodsForEmail(auth, formData.email);
                if (methods && methods.length > 0) {
                    setMode('login');
                    setStep(2);
                } else {
                    setMode('signup');
                    setStep(2);
                    setAuthMessage("It looks like you don't have an account yet. Let's create one.");
                }
            } else {
                if (mode === 'login') {
                    await signInWithEmailAndPassword(auth, formData.email, formData.password);
                    onLoginSuccess();
                } else {
                    if (formData.password.length < 6) {
                        setAuthError("Password should be at least 6 characters.");
                        setIsLoading(false);
                        return;
                    }
                    if (formData.password !== formData.confirmPassword) {
                        setAuthError("Passwords do not match.");
                        setIsLoading(false);
                        return;
                    }

                    const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                    const user = userCredential.user;

                    // Initialize their profile in Firestore
                    await setDoc(doc(db, "users", user.uid), {
                        email: user.email,
                        name: formData.name || "",
                        username: "",
                        bio: "",
                        location: "",
                        photoURL: "",
                        profileCompleted: false, // MANDATORY ONBOARDING FLAG
                        onboardingStep: 1, // Track where they left off if they abandon
                        stats: {
                            posts: 0,
                            answers: 0,
                            followers: 0,
                            following: 0,
                            points: 0
                        },
                        badges: [],
                        createdAt: serverTimestamp()
                    });

                    onLoginSuccess();
                }
            }
        } catch (error) {
            console.error("Auth error:", error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                setAuthError("Incorrect password.");
            } else if (error.code === 'auth/invalid-email') {
                setAuthError("Please enter a valid email.");
            } else if (error.code === 'auth/weak-password') {
                setAuthError("Password should be at least 6 characters.");
            } else if (error.code === 'auth/network-request-failed') {
                setAuthError("Network error. Please check your connection.");
            } else {
                setAuthError(error.message || "Authentication failed. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (providerName) => {
        setSocialLoading(providerName);
        setAuthError('');

        try {
            const provider = googleProvider;
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if this is their first time logging in with Google
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                await setDoc(userDocRef, {
                    email: user.email,
                    name: user.displayName || '',
                    username: "",
                    bio: "",
                    location: "",
                    photoURL: "", // Specifically ignoring user.photoURL per requirements
                    profileCompleted: false, // MANDATORY ONBOARDING FLAG
                    onboardingStep: 1,
                    stats: {
                        posts: 0,
                        answers: 0,
                        followers: 0,
                        following: 0,
                        points: 0
                    },
                    badges: [],
                    createdAt: serverTimestamp()
                });
            }

            onLoginSuccess();
        } catch (error) {
            console.error(`${providerName} login error:`, error);
            if (error.code === 'auth/popup-closed-by-user') {
                // User simply closed the popup, don't show a scary error message.
                return;
            } else if (error.code === 'auth/network-request-failed') {
                setAuthError("Network error. Please check your connection.");
            } else {
                setAuthError(`Failed to sign in with Google. Please try again.`);
            }
        } finally {
            setSocialLoading(null);
        }
    };

    return (
        <div className="auth-gateway-container fade-in">
            <div className="auth-background animate-gradient"></div>

            <div className="auth-card-wrapper">
                <div className="auth-logo-area">
                    <div className="auth-logo-icon">
                        <img src={illustration} alt="Women Unity Illustration" className="auth-logo-image" />
                    </div>
                    <h1 className="auth-title">Welcome to Your Safe Space.</h1>
                    <p className="auth-subtitle">
                        {step === 1 ? 'A community built for women, by women.' : (mode === 'login' ? 'Welcome back! Please enter your password.' : 'Join our empowering sisterhood.')}
                    </p>
                </div>

                <div className="auth-glass-card">
                    {step === 2 && (
                        <button
                            type="button"
                            className="back-btn fade-in"
                            onClick={() => { setStep(1); setAuthError(''); setAuthMessage(''); }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginBottom: '16px', padding: 0, fontSize: '0.9rem' }}
                        >
                            <ArrowLeft size={16} /> Back
                        </button>
                    )}

                    {authMessage && <div className="auth-info-message fade-in" style={{ color: '#6d28d9', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center', backgroundColor: '#f3e8ff', padding: '10px', borderRadius: '8px' }}>{authMessage}</div>}
                    {authError && <div className="auth-error-message fade-in" style={{ color: '#ff4d4d', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>{authError}</div>}

                    <form className="auth-form" onSubmit={handleSubmit}>

                        {/* SIGNUP ONLY FIELDS */}
                        <div className={`form-section ${(step === 2 && mode === 'signup') ? 'open' : 'closed'}`}>
                            <div className="input-group">
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder=" "
                                    required={step === 2 && mode === 'signup'}
                                />
                                <label htmlFor="name"><UserIcon size={16} /> Full Name</label>
                                <div className="focus-bg"></div>
                            </div>

                            <div className="input-group">
                                <select
                                    name="interests"
                                    value={formData.interests}
                                    onChange={handleChange}
                                    className="auth-select"
                                >
                                    <option value="" disabled>Select your focus (Optional)</option>
                                    <option value="student">Student</option>
                                    <option value="professional">Professional</option>
                                    <option value="entrepreneur">Entrepreneur</option>
                                    <option value="creator">Creator</option>
                                    <option value="mother">Mother</option>
                                </select>
                                <Sparkles size={16} className="select-icon" />
                            </div>
                        </div>

                        {/* COMMON FIELD: EMAIL */}
                        <div className="input-group" style={{ opacity: step === 2 ? 0.7 : 1, transition: 'opacity 0.3s' }}>
                            <input
                                type="email"
                                name="email"
                                id="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder=" "
                                required
                            />
                            <label htmlFor="email"><Mail size={16} /> Email Address</label>
                            <div className="focus-bg"></div>
                        </div>

                        {/* COMPOSITE PASSWORD FIELDS */}
                        {step === 2 && (
                            <>
                                <div className="input-group fade-in">
                                    <input
                                        type="password"
                                        name="password"
                                        id="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder=" "
                                        required
                                        autoFocus
                                    />
                                    <label htmlFor="password"><Lock size={16} /> Password</label>
                                    <div className="focus-bg"></div>

                                    {mode === 'signup' && formData.password.length > 0 && (
                                        <div className="password-strength">
                                            <div className={`str-bar ${formData.password.length > 3 ? 'active weak' : ''}`}></div>
                                            <div className={`str-bar ${formData.password.length > 5 ? 'active medium' : ''}`}></div>
                                            <div className={`str-bar ${formData.password.length > 8 ? 'active strong' : ''}`}></div>
                                        </div>
                                    )}
                                </div>

                                {mode === 'signup' && (
                                    <div className="input-group fade-in">
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            id="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            placeholder=" "
                                            required
                                        />
                                        <label htmlFor="confirmPassword"><Lock size={16} /> Confirm Password</label>
                                        <div className="focus-bg"></div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* FORM OPTIONS */}
                        {step === 2 && mode === 'login' && (
                            <div className="form-options fade-in">
                                <label className="checkbox-label">
                                    <input type="checkbox" />
                                    <span>Remember Me</span>
                                </label>
                                <a href="#" className="forgot-link">Forgot Password?</a>
                            </div>
                        )}

                        {step === 2 && mode === 'signup' && (
                            <div className="form-options fade-in">
                                <label className="checkbox-label agreement">
                                    <input type="checkbox" required />
                                    <span>I confirm I identify as a woman and agree to the <a href="#">community guidelines</a>.</span>
                                </label>
                            </div>
                        )}

                        <button type="submit" className="auth-submit-btn" disabled={isLoading || socialLoading}>
                            <span>
                                {isLoading ? 'Please wait...' : (step === 1 ? 'Continue' : (mode === 'login' ? 'Sign In' : 'Join the Sisterhood'))}
                            </span>
                            {!isLoading && <ArrowRight size={18} />}
                        </button>

                        <div className="social-divider">
                            <span>Or continue with</span>
                        </div>

                        <div className="social-logins">
                            <button
                                type="button"
                                className={`social-btn google ${socialLoading === 'google' ? 'loading' : ''}`}
                                onClick={() => handleSocialLogin('google')}
                                disabled={isLoading || socialLoading}
                            >
                                {socialLoading === 'google' ? '...' : 'G'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default AuthGateway;
