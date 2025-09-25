import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AboutUs from './components/pages/aboutus';
import ContactUs from './components/pages/ContactUs';
import Navbar from './components/layouts/Navbar';
import Dashboard from './components/layouts/dashboard';
import FacePage from './components/shared/FacePage'; 
import Objectpage from './components/shared/Objectpage'; 
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
        <Route path="/featured" element={<Dashboard />} />
        <Route path="/face" element={<FacePage />} />  
        <Route path="/object" element={<Objectpage />} />  
        {/* other routes */}
      </Routes>
    </Router>
  );
}

export default App;
