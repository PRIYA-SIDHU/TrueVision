import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./animated.module.css";

gsap.registerPlugin(ScrollTrigger);

const AnimatedSection = ({ left, right }) => {
  const leftRef = useRef();
  const rightRef = useRef();
  const sectionRef = useRef();

  useEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 80%",
        toggleActions: "play reverse play reverse",
      },
    });

    // Fade + scale + slide up for left element
    tl.fromTo(
      leftRef.current,
      { opacity: 0, y: 80, scale: 0.8 },
      { opacity: 1, y: 0, scale: 1, duration: 3.5, ease: "power2.out" }
    )
    // Fade + scale + slide up for right element, with overlap
    .fromTo(
      rightRef.current,
      { opacity: 0, y: 80, scale: 0.8 },
      { opacity: 1, y: 0, scale: 1, duration: 4.0, ease: "power2.out" },
      "-=3"
    );

    // After main timeline completes, add subtle infinite pulse bounce on whole section
    tl.to(sectionRef.current, {
      scale: 1.03,
      duration: 1.2,
      ease: "power1.inOut",
      yoyo: true,
      repeat: -1,
      delay: 0.6, // Delay to let entrance animation settle
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.splitSection}>
      <div ref={leftRef} className={styles.left}>
        {left}
      </div>
      <div ref={rightRef} className={styles.right}>
        {right}
      </div>
    </section>
  );
};

export default AnimatedSection;
