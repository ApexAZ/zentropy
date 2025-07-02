import React from 'react'

const AboutPage: React.FC = () => {
  return (
    <main className="w-full py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-semibold text-gray-800 m-0">About Zentropy</h2>
      </div>

      <section className="bg-white rounded-lg p-8 shadow-sm">
        <p className="text-gray-600 mb-4">Zentropy is a comprehensive Product Management platform designed to streamline project workflows, enhance team collaboration, and optimize capacity planning for modern development teams.</p>
        
        <p className="text-gray-600 mb-4">Our mission is to bring clarity and efficiency to product management processes, helping teams focus on what matters most: building great products and delivering value to customers.</p>
        
        <h3 className="text-xl font-semibold mb-3 text-gray-800">Our Vision</h3>
        <p className="text-gray-600 mb-4">We envision a world where product teams can seamlessly collaborate, accurately plan their capacity, and deliver exceptional results without the overhead of complex processes and scattered tools.</p>
        
        <h3 className="text-xl font-semibold mb-3 text-gray-800">Key Features</h3>
        <ul className="list-none text-gray-600 mb-4">
          <li className="mb-2">• Intuitive team management and collaboration tools</li>
          <li className="mb-2">• Advanced capacity planning and sprint optimization</li>
          <li className="mb-2">• Real-time calendar management for accurate resource allocation</li>
          <li className="mb-2">• Comprehensive dashboard for team configuration and insights</li>
        </ul>
        
        <p className="text-gray-600 mb-4">Built with modern web technologies and a focus on user experience, Zentropy empowers teams to work smarter, not harder.</p>
      </section>
    </main>
  )
}

export default AboutPage