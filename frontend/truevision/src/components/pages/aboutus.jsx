import React from 'react';
import styles from './AboutUs.module.css';

// Sample images - replace these URLs with your actual images or imports
const memberImages = {
  alex: 'https://randomuser.me/api/portraits/men/32.jpg',
  sarah: 'https://randomuser.me/api/portraits/women/44.jpg',
  mike: 'https://randomuser.me/api/portraits/men/65.jpg',
  emily: 'https://randomuser.me/api/portraits/women/50.jpg',
  david: 'https://randomuser.me/api/portraits/men/41.jpg'
};

const AboutUs = () => {
  // Team Invader members data
  const teamMembers = [
    {
      id: 1,
      name: "Alex Johnson",
      role: "Lead Developer",
      bio: "Full-stack developer specializing in React, Node.js, and cloud technologies.",
      image: memberImages.alex,
      linkedin: "https://linkedin.com/in/alexjohnson",
      email: "alex.johnson@invader.com",
      github: "https://github.com/alexjohnson"
    },
    {
      id: 2,
      name: "Sarah Chen",
      role: "UI/UX Designer",
      bio: "Creative designer passionate about intuitive and beautiful user experiences.",
      image: memberImages.sarah,
      linkedin: "https://linkedin.com/in/sarahchen",
      email: "sarah.chen@invader.com",
      github: "https://github.com/sarahchen"
    },
    {
      id: 3,
      name: "Mike Rodriguez",
      role: "Project Manager",
      bio: "Experienced project manager ensuring smooth delivery and client satisfaction.",
      image: memberImages.mike,
      linkedin: "https://linkedin.com/in/mikerodriguez",
      email: "mike.rodriguez@invader.com",
      github: "https://github.com/mikerodriguez"
    },
    {
      id: 4,
      name: "Emily Davis",
      role: "Backend Engineer",
      bio: "Database optimization expert with Python, MongoDB, and microservices expertise.",
      image: memberImages.emily,
      linkedin: "https://linkedin.com/in/emilydavis",
      email: "emily.davis@invader.com",
      github: "https://github.com/emilydavis"
    },
    {
      id: 5,
      name: "David Kim",
      role: "DevOps Engineer",
      bio: "Cloud infrastructure specialist focused on CI/CD pipelines and system scalability.",
      image: memberImages.david,
      linkedin: "https://linkedin.com/in/davidkim",
      email: "david.kim@invader.com",
      github: "https://github.com/davidkim"
    }
  ];

  // Company values data
  const companyValues = [
    {
      id: 1,
      icon: "🚀",
      title: "Innovation",
      description: "We constantly push boundaries and embrace new technologies to deliver groundbreaking solutions."
    },
    {
      id: 2,
      icon: "🤝",
      title: "Collaboration",
      description: "We believe in the power of teamwork and building strong relationships with our clients and partners."
    },
    {
      id: 3,
      icon: "⭐",
      title: "Excellence",
      description: "We strive for perfection in everything we do, from code quality to customer service."
    }
  ];

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <h1 className={styles.title}>About Us</h1>
        <p className={styles.subtitle}>
          We're passionate about creating innovative solutions that make a difference in people's lives.
        </p>
      </div>

      {/* Mission Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Our Mission</h2>
        <p className={styles.content}>
          To empower individuals and businesses through cutting-edge technology and exceptional user experiences. 
          We believe in the power of innovation to solve real-world problems and create meaningful connections.
        </p>
      </div>

      {/* Values Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Our Values</h2>
        <div className={styles.valuesContainer}>
          {companyValues.map((value) => (
            <div key={value.id} className={styles.valueCard}>
              <div className={styles.valueIcon}>{value.icon}</div>
              <h3 className={styles.valueTitle}>{value.title}</h3>
              <p className={styles.valueDescription}>{value.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Team Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Meet Team Invader</h2>
        <div className={styles.teamContainer}>
          {teamMembers.map((member) => (
            <div key={member.id} className={styles.teamMember}>
              <img src={member.image} alt={member.name} className={styles.memberPhoto} />
              <h3 className={styles.memberName}>{member.name}</h3>
              <p className={styles.memberRole}>{member.role}</p>
              <p className={styles.memberBio}>{member.bio}</p>
              <div className={styles.contactInfo}>
                <a 
                  href={member.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`${styles.contactLink} ${styles.linkedinLink}`}
                >
                  <span className={styles.contactIcon}>💼</span>
                  LinkedIn
                </a>
                <a 
                  href={member.github} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`${styles.contactLink} ${styles.githubLink}`}
                >
                  <span className={styles.contactIcon}>🐙</span>
                  GitHub
                </a>
                <a 
                  href={`mailto:${member.email}`}
                  className={`${styles.contactLink} ${styles.emailLink}`}
                >
                  <span className={styles.contactIcon}>✉️</span>
                  Email
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action Section */}
      <div className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>Ready to Work Together?</h2>
        <p className={styles.ctaText}>
          Let's discuss how we can help bring your ideas to life and create something amazing together.
        </p>
        
      </div>
    </div>
  );
};

export default AboutUs;
