import React from "react";
import styles from "./facerecognition.module.css";
import AnimatedSection from "./animated";

const FaceRecognition = () => (
  <AnimatedSection
    
    left = {
    <div className={styles.left}>
      <h1 className={styles.bigTitle}>Build an awesome portfolio</h1>
      <p className={styles.description}>
        Create your own interactive websites, mini-games, mobile apps, data visualizations, and show them off to friends or the world—all with Face Recognition.
      </p>
     <button className={styles.ctaButton}>
    face recognition 
      </button>
    </div>
    }
  
   right = {
   <div className={styles.right}>
      <img
        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfxPedWjxkXJc2auRUiKEWahf_7ONYV_JkFQ&s"  // Replace with your face recognition demo/image
        alt="Face Recognition Demo"
        className={styles.demoImage}
      />
    </div>
    }
    />
  
);

export default FaceRecognition;
