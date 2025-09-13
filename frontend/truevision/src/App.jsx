import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AboutUs from './components/pages/aboutus';
import ContactUs from './components/pages/ContactUs';
import Navbar from './components/layouts/Navbar';
import Dashboard from "./components/layouts/dashboard";
import './App.css'

function App() {


  return (
    <>
    <Router>
      <Navbar />
      <Routes>
      <Route path="/" element={<Dashboard />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<ContactUs />} />
        {/* other routes */}
      </Routes>
      
    </Router>

    
    </>
  )
}

export default App

