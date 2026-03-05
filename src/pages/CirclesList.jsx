import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Users, Shield, Lock, EyeOff, Loader2 } from 'lucide-react';
import { fetchCircles, checkMembership } from '../utils/communityService';
import CreateCommunityModal from '../components/CreateCommunityModal';
import { useNavigate } from 'react-router-dom';
import './CirclesList.css';

const categories = ["All", "Career", "Health", "Mental Health", "Relationships", "Entrepreneurship", "Safety", "Education", "Hobbies", "Motherhood"];

const CirclesList = () => {
    const [circles, setCircles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const navigate = useNavigate();

    const loadCircles = async () => {
        try {
            setLoading(true);
            const data = await fetchCircles(searchQuery, activeCategory);
            setCircles(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadCircles();
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery, activeCategory]);

    const handleCircleCreated = (newCircle) => {
        navigate(`/circles/${newCircle.id}`);
    };

    return (
        <div className="page-container circles-page">
            <div className="circles-header">
                <div>
                    <h1 className="section-title">Sister Circles ⭕</h1>
                    <p className="section-subtitle">Discover and join private, specialized micro-communities built by sisters, for sisters.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                    <PlusCircle size={20} />
                    <span>Create Circle</span>
                </button>
            </div>

            <div className="circles-controls">
                <div className="search-bar-container">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        className="form-input search-input"
                        placeholder="Search for a community..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="category-filters">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`filter-pill ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="empty-state">
                    <Loader2 size={32} className="spinning" style={{ color: 'var(--color-plum)' }} />
                    <p>Discovering circles...</p>
                </div>
            ) : circles.length === 0 ? (
                <div className="empty-state">
                    <p>No circles found matching your criteria.</p>
                    <button className="btn-secondary mt-3" onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}>Clear Filters</button>
                </div>
            ) : (
                <div className="circles-grid">
                    {circles.map(circle => (
                        <div key={circle.id} className="circle-card" onClick={() => navigate(`/circles/${circle.id}`)}>
                            <div className="circle-card-header">
                                <div className="circle-icon-large">
                                    {circle.icon && circle.icon.startsWith('http') ? (
                                        <img src={circle.icon} alt={circle.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                    ) : (
                                        circle.icon
                                    )}
                                </div>
                                <div className="circle-privacy-badge">
                                    {circle.privacyType === 'public' && <><Shield size={14} /> Public</>}
                                    {circle.privacyType === 'private' && <><Lock size={14} /> Private</>}
                                    {circle.privacyType === 'secret' && <><EyeOff size={14} /> Secret</>}
                                </div>
                            </div>
                            <h3 className="circle-name">{circle.name}</h3>
                            <p className="circle-description">{circle.description}</p>

                            <div className="circle-card-footer">
                                <span className="circle-category">{circle.category}</span>
                                <span className="circle-members">
                                    <Users size={16} /> {circle.memberCount}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isCreateModalOpen && (
                <CreateCommunityModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onCircleCreated={handleCircleCreated}
                />
            )}
        </div>
    );
};

export default CirclesList;
