// Navbar.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // added for navigation
import styles from './Navbar.module.css';

// Enhanced SVG icons for hover effect, updated About and Contact icons
const HoverIcons = {
  Home: (
    <svg width="20" height="20" fill="#37fc9c" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12l9-9 9 9-1.5 1.5L12 5.5 4.5 13.5z" />
      <path d="M12 6.5v11.5h6v-6h3v9H3v-9h3v6z" />
    </svg>
  ),
  AboutUs: (
    <svg width="20" height="20" fill="none" stroke="#37fc9c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="8" />
    </svg>
  ),
  Featured: (
    <svg width="20" height="20" fill="#37fc9c" viewBox="0 0 24 24" aria-hidden="true">
      <polygon points="12,2 15,11 24,11 17,17 20,26 12,20 4,26 7,17 0,11 9,11" stroke="#37fc9c" strokeWidth="2" fill="none" />
    </svg>
  ),
  ContactMe: (
    <svg width="20" height="20" fill="none" stroke="#37fc9c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 8V7a4 4 0 0 0-8 0v1" />
      <rect x="3" y="11" width="18" height="10" rx="2" ry="2" />
      <path d="M16 13l-4 4-4-4" />
    </svg>
  ),
};

const links = [
  { name: 'Home', to: '/' },
  { name: 'About Us', to: '/about' },         // React Router path for about page
  { name: 'Featured', href: '#featured' },    // keep hash link as anchor
  { name: 'Contact Me', to: '/contact' },     // React Router path for contact page
];

const Navbar = () => {
  const [hoveredLink, setHoveredLink] = useState(null);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContainer}>

        {/* LEFT GROUP: Logo */}
        <div className={styles.leftGroup}>
          <div className={styles.navbarLogo}>
            <img src="./images/logo2.png" className={styles.logo} alt="Logo" />
          </div>
        </div>

        {/* CENTER: Page links with icon hover effect */}
        <div className={styles.navbarLinks}>
          {links.map(({ name, to, href }) => {
            // Adjust key to match updated HoverIcons keys
            const key = name.replace(/\s/g, '');
            const isHovered = hoveredLink === name;

            // If 'to' is defined, use React Router Link, else fallback to anchor (for hash links)
            if (to) {
              return (
                <Link
                  key={name}
                  to={to}
                  className={styles.navLink}
                  onMouseEnter={() => setHoveredLink(name)}
                  onMouseLeave={() => setHoveredLink(null)}
                >
                  <span className={`${styles.text} ${isHovered ? styles.hiddenText : ''}`}>
                    {name}
                  </span>
                  <span className={`${styles.icon} ${isHovered ? styles.showIcon : ''}`}>
                    {HoverIcons[key] || null}
                  </span>
                </Link>
              );
            } else {
              // href case (e.g., #featured)
              return (
                <a
                  key={name}
                  href={href}
                  className={styles.navLink}
                  onMouseEnter={() => setHoveredLink(name)}
                  onMouseLeave={() => setHoveredLink(null)}
                >
                  <span className={`${styles.text} ${isHovered ? styles.hiddenText : ''}`}>
                    {name}
                  </span>
                  <span className={`${styles.icon} ${isHovered ? styles.showIcon : ''}`}>
                    {HoverIcons[key] || null}
                  </span>
                </a>
              );
            }
          })}
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
