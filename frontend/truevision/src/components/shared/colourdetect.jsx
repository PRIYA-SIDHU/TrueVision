import React from "react";
import styles from "./colourdetect.module.css";
import AnimatedSection from "./animated";
import { useNavigate } from "react-router-dom";
import colourimg from "../../assets/images/colourdetect.png";

const ColourDetection= () => {
  const navigate = useNavigate()
  return (
    <AnimatedSection

   left = {
    <div className={styles.left}>
      <img
        src={colourimg}// Replace with your actual image path
        alt="Lets Find Demo"
        className={styles.demoImage}
      />
    </div>
   }
    
   right = {
    <div className={styles.right}>
      <h1 className={styles.bigTitle}>Colour Detection</h1>
      <p className={styles.description}>
        Explore the world of discovery with Lets Find. Search for interesting facts, uncover hidden details, and expand your knowledge through an interactive and engaging experience tailored for curious minds.
      </p>
       <button className={styles.ctaButton}
        onClick={() => navigate("/color")}>
      colour detection
      </button>
    </div>
   }
  />
  )
}

export default ColourDetection ;