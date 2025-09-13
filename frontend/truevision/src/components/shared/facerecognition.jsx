import React from "react";
import styles from "./facerecognition.module.css";

const FaceRecognition = () => (
  <section className={styles.splitSection}>
    {/* Text on Left */}
    <div className={styles.left}>
      <h1 className={styles.bigTitle}>Build an awesome portfolio</h1>
      <p className={styles.description}>
        Create your own interactive websites, mini-games, mobile apps, data visualizations, and show them off to friends or the world—all with Face Recognition.
      </p>
     <button className={styles.ctaButton}>
    face recognition 
      </button>
    </div>
    {/* Image or Demo on Right */}
    <div className={styles.right}>
      <img
        src="/face-recognition-demo.png"  // Replace with your face recognition demo/image
        alt="Face Recognition Demo"
        className={styles.demoImage}
      />
    </div>
  </section>
);

export default FaceRecognition;
