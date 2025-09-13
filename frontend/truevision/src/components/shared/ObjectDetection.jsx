import React from "react";
import styles from "./objectdetection.module.css";

const ObjectDetection = () => {
  return (
    <section className={styles.splitSection}>
      {/* Left Side: Image */}
      <div className={styles.left}>
        <img
          src="/object-detection-demo.png"
          alt="Object Detection Illustration"
          className={styles.demoImage}
        />
      </div>
      {/* Right Side: Text */}
      <div className={styles.right}>
        <h2 className={styles.title}>Object Detection</h2>
        <p className={styles.subtitle}>
          Detect real-world objects using deep learning.
        </p>
        <p className={styles.description}>
          Train and deploy models capable of identifying multiple objects within images or video. This section helps you understand the basics of object detection, apply pre-trained models, and visualize bounding boxes right in your browser.
        </p>
        <button className={styles.ctaButton}>Try Object Detection</button>
      </div>
    </section>
  );
};

export default ObjectDetection;
