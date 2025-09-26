// FaceButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./facerecognition.module.css";
import faceimg from "../../assets/images/facerecognition.png";
import AnimatedSection from "./animated";
export default function FaceButton() {
  const navigate = useNavigate();

  return (
     <AnimatedSection
      left={
        <div className={styles.left}>
           <h1 className={styles.bigTitle}>Build an awesome portfolio</h1>
      <p className={styles.description}>
        Create interactive demos and test them locally.
      </p>
          <button
        className={styles.ctaButton}
        onClick={() => navigate("/face")}
      >
        face recognition
      </button>
          </div>
        
      }
      right={
        <div className={styles.right}>
          <img
            src={faceimg}
            alt="Practice Coding Chops"
            className={styles.demoImage}
          />
        </div>
      }

     />
  );
};


