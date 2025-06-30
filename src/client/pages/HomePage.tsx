import React from 'react'

const HomePage: React.FC = () => {
  return (
    <main className="main-content">
      <section id="home" className="content-section">
        <div className="page-header">
          <h2>Welcome to Zentropy</h2>
        </div>
        <p>Your comprehensive Product Management platform with project workflows, team collaboration, and capacity planning.</p>
      </section>

      <section id="projects" className="content-section">
        <div className="page-header">
          <h2>Projects</h2>
        </div>
        <p>Manage your projects with advanced workflows and tracking.</p>
      </section>

      <section id="teams" className="content-section">
        <div className="page-header">
          <h2>Teams</h2>
        </div>
        <p>Collaborate effectively with your team members.</p>
      </section>

      <section id="capacity" className="content-section">
        <div className="page-header">
          <h2>Capacity Planning</h2>
        </div>
        <p>Plan and optimize your team's capacity and resources.</p>
      </section>
    </main>
  )
}

export default HomePage