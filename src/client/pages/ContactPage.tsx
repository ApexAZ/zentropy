import React from 'react'

const ContactPage: React.FC = () => {
  return (
    <main className="main-content">
      <div className="page-header">
        <h2>Contact Us</h2>
      </div>

      <section className="content-section">
        <p>We'd love to hear from you! Whether you have questions, feedback, or need support, our team is here to help.</p>
        
        <h3>Get In Touch</h3>
        <p>Reach out to us through any of the following channels:</p>
        
        <div className="contact-info">
          <h4>Support</h4>
          <p>For technical support and help with using Zentropy:</p>
          <p><strong>Email:</strong> support@zentropy.app</p>
          <p><strong>Response Time:</strong> Within 24 hours</p>
          
          <h4>General Inquiries</h4>
          <p>For general questions and business inquiries:</p>
          <p><strong>Email:</strong> hello@zentropy.app</p>
          
          <h4>Feedback</h4>
          <p>We value your input and suggestions for improving Zentropy:</p>
          <p><strong>Email:</strong> feedback@zentropy.app</p>
        </div>
        
        <h3>Office Hours</h3>
        <p>Our support team is available:</p>
        <ul>
          <li>Monday - Friday: 9:00 AM - 6:00 PM (PST)</li>
          <li>Saturday: 10:00 AM - 2:00 PM (PST)</li>
          <li>Sunday: Closed</li>
        </ul>
        
        <p>We strive to respond to all inquiries promptly and look forward to helping you succeed with Zentropy.</p>
      </section>
    </main>
  )
}

export default ContactPage