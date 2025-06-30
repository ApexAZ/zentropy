import React from 'react'

const AboutPage: React.FC = () => {
  return (
    <main className="main-content">
      <div className="page-header">
        <h2>About Zentropy</h2>
      </div>

      <section className="content-section">
        <p>Zentropy is a comprehensive Product Management platform designed to streamline project workflows, enhance team collaboration, and optimize capacity planning for modern development teams.</p>
        
        <p>Our mission is to bring clarity and efficiency to product management processes, helping teams focus on what matters most: building great products and delivering value to customers.</p>
        
        <h3>Our Vision</h3>
        <p>We envision a world where product teams can seamlessly collaborate, accurately plan their capacity, and deliver exceptional results without the overhead of complex processes and scattered tools.</p>
        
        <h3>Key Features</h3>
        <ul>
          <li>Intuitive team management and collaboration tools</li>
          <li>Advanced capacity planning and sprint optimization</li>
          <li>Real-time calendar management for accurate resource allocation</li>
          <li>Comprehensive dashboard for team configuration and insights</li>
        </ul>
        
        <p>Built with modern web technologies and a focus on user experience, Zentropy empowers teams to work smarter, not harder.</p>
      </section>
    </main>
  )
}

export default AboutPage