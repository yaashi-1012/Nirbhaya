import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageCircle, HeartPulse, LineChart, BookOpen, User, LogOut, Users } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <aside className="sidebar tour-sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">🌷</span>
        <span className="logo-text">NIRBHAYA</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/community" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
          <MessageCircle size={24} />
          <span>Community Q&A</span>
        </NavLink>

        <NavLink to="/circles" className={({ isActive }) => isActive ? "nav-item active tour-communities" : "nav-item tour-communities"}>
          <Users size={24} />
          <span>Sister Circles</span>
        </NavLink>

        <NavLink to="/health" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
          <HeartPulse size={24} />
          <span>Health & Wellness</span>
        </NavLink>

        <NavLink to="/finance" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
          <LineChart size={24} />
          <span>Financial Independence</span>
        </NavLink>

        <NavLink to="/stories" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
          <BookOpen size={24} />
          <span>Stories & Inspiration</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/profile" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
          <User size={24} />
          <span>My Profile</span>
        </NavLink>
        <button className="nav-item" onClick={() => signOut(auth)} style={{ color: 'var(--danger-color, #ef4444)' }}>
          <LogOut size={24} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
