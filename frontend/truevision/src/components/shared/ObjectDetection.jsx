import React from "react";
import styles from "./objectdetection.module.css";
import AnimatedSection from "./animated";

const ObjectDetection = () => {
   return (
    <AnimatedSection
      left={
        <img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMZjq8BJoDzyxfMYdvn23J3hL1agyTEfmcsQ&s"
          alt="Object Detection Illustration"
          className={styles.demoImage}
        />
      }
      right={
        <>
          <h2 className={styles.title}>Object Detection</h2>
          <p className={styles.subtitle}>
            Detect real-world objects using deep learning.
          </p>
          <p className={styles.description}>
            Train and deploy models capable of identifying multiple objects within images or video. This section helps you understand the basics of object detection, apply pre-trained models, and visualize bounding boxes right in your browser.
          </p>
          <button className={styles.ctaButton}>Try Object Detection</button>
        </>
      }
    />
  );
}

export default ObjectDetection;
