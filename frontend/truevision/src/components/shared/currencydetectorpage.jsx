// import React, { useEffect, useRef, useState } from "react";

// const CurrencyDetectorPage = () => {
//   const [error, setError] = useState(null);
//   const imgRef = useRef(null);

//   useEffect(() => {
//     let mounted = true;
    
//     // Function to update the frame from the backend every ~100ms
//     const updateFrame = () => {
//       if (!mounted) return;
      
//       const timestamp = new Date().getTime();
//       // Append timestamp to avoid caching
//       const frameUrl = `http://localhost:8000/video_frame?timestamp=${timestamp}`;

//       if (imgRef.current) {
//         imgRef.current.src = frameUrl;
//       }

//       // Schedule next fetch
//     //   setTimeout(updateFrame, 150);
//     // };
//       // Schedule next fetch
//       setTimeout(updateFrame, 100);
//     };

//     updateFrame();

//     return () => {
//       mounted = false;
//     };
//   }, []);

//   return (
//     <div style={{ textAlign: "center", padding: "1rem" }}>
//       <h2>Live Currency Detection Feed</h2>
//       {error && <p style={{ color: "red" }}>{error}</p>}
//       <img
//         ref={imgRef}
//         alt="Live detection feed"
//         style={{ maxWidth: "100%", border: "2px solid #333", borderRadius: "4px" }}
//         onError={() => setError("Failed to load video feed from backend.")}
//       />
//     </div>
//   );
// };

// export default CurrencyDetectorPage;



import React, { useEffect, useRef, useState } from "react";

const CurrencyDetectorPage = () => {
  const [error, setError] = useState(null);
  const imgRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const imgElement = imgRef.current;

    const loadNextFrame = () => {
      if (!mounted) return;
      const timestamp = new Date().getTime();
      imgElement.src = `http://localhost:8000/video_frame?timestamp=${timestamp}`;
    };

    const onLoadHandler = () => {
      if (!mounted) return;
      // Delay next frame fetch to control FPS (~5 FPS)
      setTimeout(loadNextFrame, 200);
    };

    const onErrorHandler = () => {
      if (!mounted) return;
      setError("Failed to load video feed from backend.");
      // Retry loading after delay
      setTimeout(loadNextFrame, 1000);
    };

    imgElement.addEventListener("load", onLoadHandler);
    imgElement.addEventListener("error", onErrorHandler);

    // Start loading the first frame
    loadNextFrame();

    return () => {
      mounted = false;
      imgElement.removeEventListener("load", onLoadHandler);
      imgElement.removeEventListener("error", onErrorHandler);
    };
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "1rem" }}>
      <h2>Live Currency Detection Feed</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <img
        ref={imgRef}
        alt="Live detection feed"
        style={{ maxWidth: "100%", border: "2px solid #333", borderRadius: "4px" }}
      />
    </div>
  );
};

export default CurrencyDetectorPage;
