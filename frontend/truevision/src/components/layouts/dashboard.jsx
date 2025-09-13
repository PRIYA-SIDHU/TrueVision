import styles from "./dashboard.module.css";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import colorspin from "../../assets/images/colorspin.png";
import eyeImg from "../../assets/images/eye.png";




export default function App() {
  const letterT = useRef(null);
  const letterE = useRef(null);
  const letterU = useRef(null);
  const letterEBounce = useRef(null);
  const flower = useRef(null);
  const spinner = useRef(null);
  const visionV = useRef(null);
  const visionI1 = useRef(null);
  const visionS = useRef(null);
  const visionI2 = useRef(null);
  const visionO = useRef(null);
  const visionN = useRef(null);
  const eye = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline();

    // 🔹 Step 1: T appears first
    tl.fromTo(
      letterT.current,
      { rotationX: -90, transformOrigin: "center bottom", opacity: 0 },
      { rotationX: 0, opacity: 1, duration: 1.2, ease: "bounce.out" }
    );

    // 🔹 Step 2: Flower blooms right after T
    tl.fromTo(
      flower.current,
      { scale: 0, opacity: 0 },
      { scale: 1.5, opacity: 1, duration: 0.8, ease: "elastic.out(1,0.5)" }
    ).to(flower.current, { opacity: 0, scale: 0, duration: 0.5, ease: "power1.inOut" });

    // 🔹 Step 3: E flips → R
    tl.fromTo(
      letterE.current,
      { y: 100, opacity: 0, rotationY: 180, transformOrigin: "center" },
      { y: 0, opacity: 1, rotationY: 0, duration: 1, ease: "back.out(1.7)" },
      "+=0.1"
    )
      .to(letterE.current, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => { letterE.current.innerText = "R"; },
      })
      .to(letterE.current, { opacity: 1, duration: 0.3 });

    // 🔹 Spinner starts
    tl.fromTo(
      spinner.current,
      { x: -200, rotation: 0, opacity: 0 },
      { x: 0, rotation: 720, opacity: 1, duration: 1.5, ease: "power2.out" }
    ).to(spinner.current, { rotation: "+=360", repeat: -1, duration: 2, ease: "linear" });

    // 🔹 U starts immediately as spinner starts
    tl.fromTo(
      letterU.current,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, ease: "power1.out" },
      "<"
    );

    // 🔹 E bounce 1 sec after U
    tl.fromTo(
      letterEBounce.current,
      { y: -500, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, ease: "bounce.out" },
      "+=1"
    );

    // 🔹 VISION animation
    const visionTimeline = gsap.timeline({ delay: 0.5 });

    visionTimeline.fromTo(
      visionV.current,
      { x: -800, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, ease: "power4.out" }
    );

    visionTimeline.fromTo(
      visionI1.current,
      { y: -200, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: "bounce.out" },
      "+=0.2"
    );

    visionTimeline.to(visionS.current, { opacity: 1, rotation: -90, duration: 0.2 })
      .to(visionS.current, { duration: 2 });

    visionTimeline.fromTo(
      visionI2.current,
      { y: -200, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: "bounce.out" }
    );

    visionTimeline.to(visionS.current, {
      rotation: 0,
      duration: 0.6,
      ease: "power2.out",
      onStart: () => visionS.current.classList.add(styles['glow-yellow']),
      onComplete: () => setTimeout(() => visionS.current.classList.remove(styles['glow-yellow']), 800),
    });

    visionTimeline.fromTo(
      visionO.current,
      { x: 300, rotation: 720, opacity: 0 },
      { x: 0, rotation: 0, opacity: 1, duration: 1.2, ease: "back.out(1.7)" }
    );

    // 🔹 Eye animation inside O
    visionTimeline.add(() => {
      if (visionO.current && eye.current) {
        const eyeSize = 200;
        const oX = visionO.current.offsetLeft + visionO.current.offsetWidth / 2 - eyeSize / 2;
        const oY = visionO.current.offsetTop + visionO.current.offsetHeight / 2 - eyeSize / 2;
        gsap.fromTo(
          eye.current,
          { x: -500, y: oY, width: eyeSize, height: eyeSize, opacity: 0, position: "absolute" },
          { x: oX, y: oY, opacity: 1, duration: 2, ease: "power4.out" }
        );
      }
    }, "+=0.2");

    visionTimeline.fromTo(
      visionN.current,
      { x: 200, opacity: 0, rotationY: 180 },
      { x: 0, opacity: 1, rotationY: 0, duration: 1, ease: "back.out(1.7)" },
      "+=0.3"
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
    
<img ref={spinner} src={colorspin} className={styles.spinner} alt="spinner" />
<img ref={eye} src={eyeImg} className={styles.eye} alt="eye" />
    </div>
  );
}
