// FaceButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./facerecognition.module.css";

export default function FaceButton() {
  const navigate = useNavigate();

  return (
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
  );
}
