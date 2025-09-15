
import Footer from "./footer.jsx";
import ObjectDetection from "../shared/ObjectDetection.jsx";
import FaceRecognition from "../shared/facerecognition.jsx";
import CurrencyDetector from "../shared/currencydetector.jsx";
import BookReader from "../shared/bookreader.jsx";
import LetsFind from "../shared/letsfind.jsx";
import Text from "../shared/text.jsx";


const  Dashboard = ()=>{
return <>
   <Text></Text>
  
   <ObjectDetection></ObjectDetection>
   <CurrencyDetector></CurrencyDetector>
   <BookReader></BookReader>
   <FaceRecognition></FaceRecognition>
   <LetsFind></LetsFind>
<Footer></Footer>
</>
};


export default Dashboard ;