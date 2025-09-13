import React from "react";
import styles from "./bookreader.module.css";

const BookReader = () => (
  <section className={styles.splitSection}>
    {/* Picture on Left */}
    <div className={styles.left}>
      <img
        src="/booker-reader-demo.png"  // Replace with your image path
        alt="Booker Reader Demo"
        className={styles.demoImage}
      />
    </div>
    {/* Text on Right */}
    <div className={styles.right}>
      <h1 className={styles.bigTitle}>Booker Reader</h1>
      <p className={styles.description}>
        Discover and read thousands of digital books with a single click.<br />
        Booker Reader helps you organize your library, track your reading progress, and share your favorite books with friends — all in one streamlined dashboard.
      </p>
      <button className={styles.ctaButton}>
        Explore Booker Reader
      </button>
    </div>
  </section>
);

export default BookReader;
