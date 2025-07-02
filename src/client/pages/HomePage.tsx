import React from 'react'

const HomePage: React.FC = () => {
  return (
    <main className="w-full py-8">
      <section id="home" className="bg-white rounded-lg p-8 shadow-sm mb-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-semibold text-gray-800 m-0">Welcome to Zentropy</h2>
        </div>
        <p className="text-gray-600 mb-4">Your comprehensive Product Management platform with project workflows, team collaboration, and capacity planning.</p>
      </section>

      <section id="projects" className="bg-white rounded-lg p-8 shadow-sm mb-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-semibold text-gray-800 m-0">Projects</h2>
        </div>
        <p className="text-gray-600 mb-4">Manage your projects with advanced workflows and tracking.</p>
      </section>

      <section id="teams" className="bg-white rounded-lg p-8 shadow-sm mb-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-semibold text-gray-800 m-0">Teams</h2>
        </div>
        <p className="text-gray-600 mb-4">Collaborate effectively with your team members.</p>
      </section>

      <section id="capacity" className="bg-white rounded-lg p-8 shadow-sm mb-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-semibold text-gray-800 m-0">Capacity Planning</h2>
        </div>
        <p className="text-gray-600 mb-4">Plan and optimize your team&apos;s capacity and resources.</p>
      </section>
    </main>
  )
}

export default HomePage