import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./currencydetector.module.css";
import AnimatedSection from "./animated";

const CurrencyDetector = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/currency-detector");
  };

  return (
    <AnimatedSection
      left={
        <div className={styles.left}>
          <h1 className={styles.bigTitle}>Currency Detector</h1>
          <div className={styles.textColumn}>
            <span className={styles.highlight}>
              Take your skills further with code challenges and project tutorials.
            </span>
            <p>
              Apply what you learn to real-world problems with hands-on challenges designed to reinforce your understanding and grow your practical coding ability.
            </p>
            <button className={styles.ctaButton} onClick={handleClick}>
              Open Currency Detector
            </button>
          </div>
        </div>
      }
      right={
        <div className={styles.right}>
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7rd-L1O08jT63q1yKavoQA200iJbxFbKzhg&s"
            alt="Practice Coding Chops"
            className={styles.demoImage}
          />
        </div>
      }
    />
  );
};

export default CurrencyDetector;
