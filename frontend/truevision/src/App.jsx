import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AboutUs from './components/pages/aboutus';
import ContactUs from './components/pages/ContactUs';
import Navbar from './components/layouts/Navbar';
import Dashboard from './components/layouts/dashboard';
import FacePage from './components/backendpages/FacePage'; 
import Bookmain from './components/backendpages/Bookmain'; 
import Objectpage from './components/backendpages/Objectpage'; 
import Bookpage from './components/backendpages/BookPage'; 
import Color from './components/backendpages/colorpage'; 

import CurrencyDetector from './components/shared/currencydetector';
import CurrencyDetectorPage from './components/backendpages/currencydetectorpage'; 

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';



function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/featured" element={<Dashboard/>} />
         <Route path="/face" element={<FacePage />} />  
        <Route path="/object" element={<Objectpage />} />  
        <Route path="/book" element={<Bookmain />} />  
        <Route path="/book/pdf" element={<Bookpage />} />  
        <Route path="/color" element={<Color />} />  
       <Route path="/currency-detector-button" element={<CurrencyDetector />} />
  <Route path="/currency-detector" element={<CurrencyDetectorPage />} />


</Routes>

    
    </Router>
  );
}

export default App;