import React from "react";
import styles from "./letsfind.module.css";
import AnimatedSection from "./animated";

const LetsFind = () => (
 
   <AnimatedSection

   left = {
    <div className={styles.left}>
      <img
        src="https://st.depositphotos.com/2001755/3622/i/450/depositphotos_36220949-stock-photo-beautiful-landscape.jpg" // Replace with your actual image path
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
      <button className={styles.ctaButton}>
      colour detection
      </button>
    </div>
   }
  />
);

export default LetsFind;
