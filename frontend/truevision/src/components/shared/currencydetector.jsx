import React from "react";
import styles from "./currencydetector.module.css";

const CurrencyDetector= () => (
  <section className={styles.splitSection}>
    <div className={styles.left}>
      <h1 className={styles.bigTitle}>Practice your coding chops</h1>
      <div className={styles.textColumn}>
        <span className={styles.highlight}>Take your skills further with code challenges and project tutorials.</span>
        <p>
          Apply what you learn to real-world problems with hands-on challenges designed to reinforce your understanding and grow your practical coding ability.
        </p>
        <button className={styles.ctaButton}>Start Practicing</button>
      </div>
    </div>
    <div className={styles.right}>
      <img
        src="/images/priya.jpeg" // Ensure the image exists at this path
        alt="Practice Coding Chops"
        className={styles.demoImage}
      />
    </div>
  </section>
);

export default CurrencyDetector;
