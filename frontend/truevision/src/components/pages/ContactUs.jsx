import React, { useState } from "react";
import styles from "./ContactUs.module.css";
import PortraitImg from "/src/assets/images/contact us .png";
import PhoneIcon from "/src/assets/images/phone-call-svgrepo-com.svg";
import MailIcon from "/src/assets/images/email-download-svgrepo-com.svg";
import MapIcon from "/src/assets/images/location-mark-svgrepo-com.svg";
// Optionally import your SVG illustration here

const CONTACT = {
  phone: "+91 98765 43210",
  email: "hackathonteam@email.com",
  address: "jalandhar,punjab , India, 2025"
};

export default function ContactUs() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className={styles.pageBg}>
      <section className={styles.heroSection}>
        <div className={styles.heroLeft}>
          <h1 className={styles.heading}>Have a Question?</h1>
          <p>
            Thank you for your interest in our hackathon.<br />
            Fill out the form or email us at
            <a href={`mailto:${CONTACT.email}`}> {CONTACT.email}</a>,
            and we’ll get back to you soon!
          </p>
          {/* Use an actual SVG illustration here if you have one */}
          <div className={styles.illustration}>
  <img
    src={PortraitImg}
    alt="Organizer"
    className={styles.portraitImage}
  />
</div>
          <div className={styles.infoBlock}>
            <b>Get in touch</b>
            <div className={styles.contactRow}>
              <img src={PhoneIcon} alt="Phone" className={styles.icon} />
              <span>{CONTACT.phone}</span>
            </div>
            <div className={styles.contactRow}>
              <img src={MailIcon} alt="Email" className={styles.icon} />
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            </div>
            <div className={styles.contactRow}>
              <img src={MapIcon} alt="Location" className={styles.icon} />
              <span>{CONTACT.address}</span>
            </div>
          </div>
        </div>
      </section>
      <section className={styles.formSection}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input type="text" placeholder="Name" required />
          <input type="email" placeholder="Email" required />
          <textarea placeholder="Message" rows="4" required />
          <button type="submit" className={styles.btn}>SEND MESSAGE</button>
        </form>
        {submitted && (
          <div className={styles.thankyou}>
            <p>Thank you! We’ll reply promptly regarding your request.</p>
          </div>
        )}
      </section>
    </div>
  );
}
