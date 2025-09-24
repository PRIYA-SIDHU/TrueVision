import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Footer from "./footer.jsx";
import ObjectDetection from "../shared/ObjectDetection.jsx";
import FaceRecognition from "../shared/facerecognition.jsx";
import CurrencyDetector from "../shared/currencydetector.jsx";
import BookReader from "../shared/bookreader.jsx";
import LetsFind from "../shared/letsfind.jsx";
import Text from "../shared/text.jsx";


const  Dashboard = ()=>{
    const location = useLocation();

  useEffect(() => {
    if (location.hash === "#object-detection") {
      // Wait until dashboard and sections are in DOM
      setTimeout(() => {
        const section = document.getElementById("object-detection");
        if (section) {
          section.scrollIntoView({ behavior: "auto" });
        }
      }, 50); // 100ms is usually good, you can try slightly higher if needed
    }
  }, [location]);
return <>
   <Text></Text>
  
   <div id="object-detection">
        <ObjectDetection />
      </div>
   <CurrencyDetector></CurrencyDetector>
   <BookReader></BookReader>
   <FaceRecognition></FaceRecognition>
   <LetsFind></LetsFind>
<Footer></Footer>
</>
};


export default Dashboard ;