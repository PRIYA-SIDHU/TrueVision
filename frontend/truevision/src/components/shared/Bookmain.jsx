import React from "react";
import styles from "./bookmain.module.css";
import { useNavigate } from "react-router-dom";

export default function Boxes() {
    const navigate = useNavigate()
  return (
    <div className={styles.container}>
      {/* First Row */}
      <div className={styles.row}>
        <div className={styles.wrapper}>
          <div className={styles.box}>
            <img
              src="\src\assets\images\pdf.png"
              alt="Box 1"
              className={styles.image}
            />
          </div>
          <button className={styles.btn} onClick={()=>navigate('/book/pdf')}>Start</button>
        </div>

        <div className={styles.wrapper}>
          <div className={styles.box}>
            <img
              src="https://via.placeholder.com/150"
              alt="Box 2"
              className={styles.image}
            />
          </div>
          <button className={styles.btn}>Start</button>
        </div>
      </div>

      {/* Second Row */}
      <div className={styles.centerRow}>
        <div className={styles.wrapper}>
          <div className={styles.box}>
            <img
              src="https://via.placeholder.com/150"
              alt="Box 3"
              className={styles.image}
            />
          </div>
          <button className={styles.btn}>Start</button>
        </div>
      </div>
    </div>
  );
}
