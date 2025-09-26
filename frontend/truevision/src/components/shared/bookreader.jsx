import React from "react";
import AnimatedSection from "./animated";
import styles from "./bookreader.module.css";
import { useNavigate } from "react-router-dom";
import bookimg from "../../assets/images/bookreader.png";

const bookreader = () => {
  const navigate = useNavigate()
  return (
    <AnimatedSection
    left={
      <img
        src={bookimg}  // Replace with your image path
        alt="Booker Reader Demo"
        className={styles.demoImage}
      />
    }
    right={
      <>
        <h1 className={styles.bigTitle}>Booker Reader</h1>
        <p className={styles.description}>
          Discover and read thousands of digital books with a single click.<br />
          Booker Reader helps you organize your library, track your reading progress, and share your favorite books with friends — all in one streamlined dashboard.
        </p>
        <button className={styles.ctaButton}
        onClick={()=>navigate('/book')}
        >
          Explore Booker Reader
        </button>
      </>
    }
    />
  )
}

export default bookreader