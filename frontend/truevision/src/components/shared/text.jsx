import styles from "./text.module.css";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function Text() {
  const letterT = useRef(null);
  const letterE = useRef(null);
  const letterU = useRef(null);
  const letterEBounce = useRef(null);
  const flower = useRef(null);
  const visionV = useRef(null);
  const visionI1 = useRef(null);
  const visionS = useRef(null);
  const visionI2 = useRef(null);
  const visionO = useRef(null);
  const visionN = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline();

    // T
    tl.fromTo(
      letterT.current,
      { rotationX: -90, transformOrigin: "center bottom", opacity: 0 },
      { rotationX: 0, opacity: 1, duration: 0.8, ease: "bounce.out" }
    );

    // Flower
    tl.fromTo(
      flower.current,
      { scale: 0, opacity: 0 },
      { scale: 1.5, opacity: 1, duration: 0.5, ease: "elastic.out(1,0.5)" }
    )
    .to(
      flower.current,
       { opacity: 0, scale: 0, duration: 0.3, ease: "power1.inOut" });

    // E → R
    tl.fromTo(
      letterE.current,
      { y: 100, opacity: 0, rotationY: 180, transformOrigin: "center" },
      { y: 0, opacity: 1, rotationY: 0, duration: 0.7, ease: "back.out(1.7)" },
      "+=0.1"
    )
      .to(letterE.current, {
        opacity: 0,
        duration: 0.2,
        onComplete: () => { 
          letterE.current.innerText = "R"; 
        },
      })
      .to(
        letterE.current, 
        {  opacity: 1, duration: 0.2 });

    // U
    tl.fromTo(
      letterU.current,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.2, ease: "power1.out" },
      "<"
    );

    // E bounce
    tl.fromTo(
      letterEBounce.current,
      { y: -500, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "bounce.out" },
      "+=0.5"
    );

    // VISION
    const visionTimeline = gsap.timeline({ delay: 0.3 });

    visionTimeline.fromTo(
      visionV.current,
      { x: -800, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, ease: "power4.out" }
    );

    visionTimeline.fromTo(
      visionI1.current,
      { y: -200, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: "bounce.out" },
      "+=0.1"
    );

    visionTimeline.to(
      visionS.current, 
      { opacity: 1, rotation: -90, duration: 0.15 }
    )
      .to (
        visionS.current, 
        { duration: 1.2 }
      );

    visionTimeline.fromTo(
      visionI2.current,
      { y: -200, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: "bounce.out" }
    );

    visionTimeline.to(
      visionS.current, 
      {rotation: 0,duration: 0.4,ease: "power2.out",
      onStart: () => visionS.current.classList.add(styles['glow-yellow']),
      onComplete: () => setTimeout(() => visionS.current.classList.remove(styles['glow-yellow']), 800),
    });

    visionTimeline.fromTo(
      visionO.current,
      { x: 300, rotation: 720, opacity: 0 },
      { x: 0, rotation: 0, opacity: 1, duration: 0.8, ease: "back.out(1.7)" }
    );

    visionTimeline.fromTo(
      visionN.current,
      { x: 200, opacity: 0, rotationY: 180 },
      { x: 0, opacity: 1, rotationY: 0, duration: 0.7, ease: "back.out(1.7)" },
      "+=0.2"
    );
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.true}>
        <span ref={letterT} className={styles["letter-t"]}>T</span>
        <span ref={letterE} className={styles["letter-e"]}>E</span>
        <span ref={letterU} className={styles["letter-u"]}>U</span>
        <span ref={letterEBounce} className={styles["letter-e-bounce"]}>E</span>
      </div>

      <div className={styles.vision}>
        <span ref={visionV} className={styles["vision-v"]}>V</span>
        <span ref={visionI1} className={styles["vision-i1"]}>I</span>
        <span ref={visionS} className={styles["vision-s"]}>S</span>
        <span ref={visionI2} className={styles["vision-i2"]}>I</span>
        <span ref={visionO} className={styles["vision-o"]}>O</span>
        <span ref={visionN} className={styles["vision-n"]}>N</span>
      </div>

      <div ref={flower} className={styles.flower}>🌸</div>
    </div>
  );
}
