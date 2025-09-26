import React, { useState } from "react";
import styles from "./ContactUs.module.css";
import { motion } from "framer-motion";

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [thankYou, setThankYou] = useState(false);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear error as soon as input is valid
    if (name === "name" && value.trim() !== "") {
      setErrors((prev) => ({ ...prev, name: "" }));
    }
    if (name === "email" && value.trim() !== "") {
      setErrors((prev) => ({ ...prev, email: "" }));
    }
    if (name === "phone") {
      if (/^\d{10}$/.test(value.trim())) {
        setErrors((prev) => ({ ...prev, phone: "" }));
      }
    }
    if (name === "message" && value.trim() !== "") {
      setErrors((prev) => ({ ...prev, message: "" }));
    }
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();

    let newErrors = { name: "", email: "", phone: "", message: "" };
    let formIsValid = true;

    // Name check
    if (formData.name.trim() === "") {
      newErrors.name = "Name is required";
      formIsValid = false;
    }

    // Email check
    if (formData.email.trim() === "") {
      newErrors.email = "Email is required";
      formIsValid = false;
    }

    // Phone check
    if (formData.phone.trim() === "") {
      newErrors.phone = "Phone is required";
      formIsValid = false;
    } else if (!/^\d{10}$/.test(formData.phone.trim())) {
      newErrors.phone = "Enter a valid 10-digit phone number";
      formIsValid = false;
    }

    // Message check
    if (formData.message.trim() === "") {
      newErrors.message = "Message is required";
      formIsValid = false;
    }

    setErrors(newErrors);

    // If no errors
    if (formIsValid) {
      setThankYou(true);
      setFormData({ name: "", email: "", phone: "", message: "" });

      setTimeout(() => {
        setThankYou(false);
      }, 3000);
    }
  };

  return (
    <div className={styles.contactContainer}>
      <div className={styles.bubbles}>
        <span></span><span></span><span></span>
        <span></span><span></span><span></span>
      </div>

      <motion.div
        className={styles.contactHeader}
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1>Contact Us</h1>
        <p>We’d love to hear from you. Fill the form or reach us directly.</p>
      </motion.div>

      <div className={styles.contactMain}>
        <motion.form
          className={styles.contactForm}
          onSubmit={handleSubmit}
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
        >
          <input
            type="text"
            name="name"
            placeholder="Your Name"
            value={formData.name}
            onChange={handleChange}
          />
          {errors.name && <div className={styles.error}>{errors.name}</div>}

          <input
            type="email"
            name="email"
            placeholder="Your Email"
            value={formData.email}
            onChange={handleChange}
          />
          {errors.email && <div className={styles.error}>{errors.email}</div>}

          <input
            type="tel"
            name="phone"
            placeholder="Your Phone"
            value={formData.phone}
            onChange={handleChange}
          />
          {errors.phone && <div className={styles.error}>{errors.phone}</div>}

          <textarea
            name="message"
            placeholder="Your Message"
            value={formData.message}
            onChange={handleChange}
          />
          {errors.message && <div className={styles.error}>{errors.message}</div>}

          <button type="submit" className={styles.sendBtn}>Send Message</button>
          {thankYou && (
            <div className={styles.thankyouMsg}>
              Thank you! Your message has been sent.
            </div>
          )}
        </motion.form>

        <motion.div
          className={styles.contactInfo}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
        >
          <h2>Get in Touch</h2>
          <div className={styles.infoCard}>📧 Sunny@gmail.com</div>
          <div className={styles.infoCard}>📞 +91 78845 88142</div>
          <div className={styles.infoCard}>📍 Punjab, India</div>
        </motion.div>
      </div>
    </div>
  );
}
