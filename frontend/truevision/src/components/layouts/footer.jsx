import React from "react";
import styles from "./footer.module.css"; // Assuming you want custom tweaks
import 'bootstrap/dist/css/bootstrap.min.css';

const Footer = () => {
  return (
    <div className={styles.container}>
      <footer className=" py-3 my-4 mb-0">
        <ul className="nav justify-content-center border-bottom pb-3 mb-3">
          <li className="nav-item">
            <a href="#" className="nav-link px-2 text-white">
              Home
            </a>
          </li>
          <li className="nav-item">
            <a href="#" className="nav-link px-2 text-white">
              Features
            </a>
          </li>
          <li className="nav-item">
            <a href="/about" className="nav-link px-2 text-white">
              About Us
            </a>
          </li>
          <li className="nav-item">
            <a href="/contact" className="nav-link px-2 text-white">
              Contact Us
            </a>
          </li>
        </ul>
        <p className="text-center text-white mb-0">© 2025 Company, Inc</p>
      </footer>
    </div>
  );
};

export default Footer;
