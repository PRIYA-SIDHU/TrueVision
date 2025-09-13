import React from "react";
import styles from "./letsfind.module.css";

const LetsFind = () => (
  <section className={styles.splitSection}>
    {/* Picture on Left */}
    <div className={styles.left}>
      <img
        src="/lets-find-demo.png" // Replace with your actual image path
        alt="Lets Find Demo"
        className={styles.demoImage}
      />
    </div>
    {/* Text on Right */}
    <div className={styles.right}>
      <h1 className={styles.bigTitle}>Lets Find</h1>
      <p className={styles.description}>
        Explore the world of discovery with Lets Find. Search for interesting facts, uncover hidden details, and expand your knowledge through an interactive and engaging experience tailored for curious minds.
      </p>
      <button className={styles.ctaButton}>
        Start Exploring
      </button>
    </div>
  </section>
);

export default LetsFind;
