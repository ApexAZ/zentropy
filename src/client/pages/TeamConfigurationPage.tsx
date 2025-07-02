import React, { useState, useEffect } from 'react'

interface Team {
  id: string
  name: string
  description?: string
  velocity_baseline: number
  sprint_length_days: number
  working_days_per_week: number
  working_days: number[]
  created_at: string
  updated_at: string
}

interface TeamMember {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  team_role: 'member' | 'lead'
}

interface Sprint {
  id: string
  name: string
  start_date: string
  end_date: string
  team_id: string
  status: 'planned' | 'active' | 'completed'
}

interface TeamBasicData {
  name: string
  description: string
  working_days: number[]
}

interface VelocityData {
  baseline_velocity: number
  sprint_length: number
}

interface AddMemberData {
  email: string
  role: 'member' | 'lead'
}

interface CreateSprintData {
  name: string
  start_date: string
  end_date: string
}

interface GenerateSprintsData {
  starting_sprint_number: number
  number_of_sprints: number
  first_sprint_start_date: string
}

const TeamConfigurationPage: React.FC = () => {
  const [team, setTeam] = useState<Team | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Form states
  const [teamBasicData, setTeamBasicData] = useState<TeamBasicData>({
    name: '',
    description: '',
    working_days: [1, 2, 3, 4, 5] // Mon-Fri by default
  })
  const [velocityData, setVelocityData] = useState<VelocityData>({
    baseline_velocity: 0,
    sprint_length: 2 // 2 weeks default
  })

  // Modal states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showCreateSprintModal, setShowCreateSprintModal] = useState(false)
  // const [showGenerateSprintsModal, setShowGenerateSprintsModal] = useState(false)
  
  const [addMemberData, setAddMemberData] = useState<AddMemberData>({
    email: '',
    role: 'member'
  })
  const [createSprintData, setCreateSprintData] = useState<CreateSprintData>({
    name: '',
    start_date: '',
    end_date: ''
  })
  // const [generateSprintsData, setGenerateSprintsData] = useState<GenerateSprintsData>({
  //   starting_sprint_number: 3,
  //   number_of_sprints: 6,
  //   first_sprint_start_date: ''
  // })

  const [memberErrors, setMemberErrors] = useState<Record<string, string>>({})
  const [sprintErrors, setSprintErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    void loadTeamConfiguration()
  }, [])

  // Hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const loadTeamConfiguration = async (): Promise<void> => {
    try {
      setIsLoading(true)
      setError('')

      // Load team data - assuming we have a team ID (could come from URL params)
      const teamId = '1' // This would typically come from route params
      
      const [teamResponse, membersResponse, sprintsResponse] = await Promise.all([
        fetch(`/api/teams/${teamId}`),
        fetch(`/api/teams/${teamId}/members`),
        fetch(`/api/teams/${teamId}/sprints`)
      ])

      if (!teamResponse.ok) {
        throw new Error('Failed to load team configuration')
      }

      const teamData = await teamResponse.json() as Team
      const membersData = membersResponse.ok ? await membersResponse.json() as TeamMember[] : []
      const sprintsData = sprintsResponse.ok ? await sprintsResponse.json() as Sprint[] : []

      setTeam(teamData)
      setTeamMembers(membersData)
      setSprints(sprintsData)

      // Initialize form data
      setTeamBasicData({
        name: teamData.name,
        description: teamData.description ?? '',
        working_days: teamData.working_days ?? [1, 2, 3, 4, 5]
      })
      setVelocityData({
        baseline_velocity: teamData.velocity_baseline,
        sprint_length: Math.ceil(teamData.sprint_length_days / 7)
      })

    } catch (err) {
      // console.error('Error loading team configuration:', err)
      setError(err instanceof Error ? err.message : 'Failed to load team configuration')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveTeamInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!team) {return}

    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: teamBasicData.name,
          description: teamBasicData.description,
          working_days: teamBasicData.working_days,
          working_days_per_week: teamBasicData.working_days.length
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update team information')
      }

      const updatedTeam = await response.json()
      setTeam(updatedTeam)
      setToast({
        message: 'Team information updated successfully!',
        type: 'success'
      })
    } catch (err) {
      console.error('Error updating team:', err)
      setToast({
        message: err instanceof Error ? err.message : 'Failed to update team information',
        type: 'error'
      })
    }
  }

  const handleSaveVelocity = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!team) {return}

    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          velocity_baseline: velocityData.baseline_velocity,
          sprint_length_days: velocityData.sprint_length * 7
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update velocity settings')
      }

      const updatedTeam = await response.json()
      setTeam(updatedTeam)
      setToast({
        message: 'Velocity settings updated successfully!',
        type: 'success'
      })
    } catch (err) {
      console.error('Error updating velocity:', err)
      setToast({
        message: err instanceof Error ? err.message : 'Failed to update velocity settings',
        type: 'error'
      })
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!team) {return}

    const errors: Record<string, string> = {}
    if (!addMemberData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addMemberData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    setMemberErrors(errors)
    if (Object.keys(errors).length > 0) {return}

    try {
      const response = await fetch(`/api/teams/${team.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addMemberData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to add team member')
      }

      const newMember = await response.json()
      setTeamMembers([...teamMembers, newMember])
      setShowAddMemberModal(false)
      setAddMemberData({ email: '', role: 'member' })
      setMemberErrors({})
      setToast({
        message: 'Team member added successfully!',
        type: 'success'
      })
    } catch (err) {
      console.error('Error adding member:', err)
      setToast({
        message: err instanceof Error ? err.message : 'Failed to add team member',
        type: 'error'
      })
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!team || !confirm('Are you sure you want to remove this team member?')) {return}

    try {
      const response = await fetch(`/api/teams/${team.id}/members/${memberId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to remove team member')
      }

      setTeamMembers(teamMembers.filter(member => member.id !== memberId))
      setToast({
        message: 'Team member removed successfully!',
        type: 'success'
      })
    } catch (err) {
      console.error('Error removing member:', err)
      setToast({
        message: err instanceof Error ? err.message : 'Failed to remove team member',
        type: 'error'
      })
    }
  }

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!team) {return}

    const errors: Record<string, string> = {}
    if (!createSprintData.name.trim()) {
      errors.name = 'Sprint name is required'
    }
    if (!createSprintData.start_date) {
      errors.start_date = 'Start date is required'
    }
    if (!createSprintData.end_date) {
      errors.end_date = 'End date is required'
    }
    if (createSprintData.start_date && createSprintData.end_date && 
        new Date(createSprintData.start_date) >= new Date(createSprintData.end_date)) {
      errors.end_date = 'End date must be after start date'
    }

    setSprintErrors(errors)
    if (Object.keys(errors).length > 0) {return}

    try {
      const response = await fetch(`/api/teams/${team.id}/sprints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...createSprintData,
          team_id: team.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create sprint')
      }

      const newSprint = await response.json()
      setSprints([...sprints, newSprint])
      setShowCreateSprintModal(false)
      setCreateSprintData({ name: '', start_date: '', end_date: '' })
      setSprintErrors({})
      setToast({
        message: 'Sprint created successfully!',
        type: 'success'
      })
    } catch (err) {
      console.error('Error creating sprint:', err)
      setToast({
        message: err instanceof Error ? err.message : 'Failed to create sprint',
        type: 'error'
      })
    }
  }

  const toggleWorkingDay = (day: number) => {
    setTeamBasicData(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day].sort()
    }))
  }

  const getDayName = (day: number) => {
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return names[day]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <main className="w-full py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-semibold text-gray-800 m-0">Team Configuration</h2>
            <p className="text-gray-600 mt-2">Configure your team settings, members, velocity, and sprints</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 mb-4">Loading team configuration...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="w-full py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-semibold text-gray-800 m-0">Team Configuration</h2>
            <p className="text-gray-600 mt-2">Configure your team settings, members, velocity, and sprints</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <div>
            <h3 className="text-red-600 mb-3 text-xl font-semibold">Unable to Load Configuration</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={loadTeamConfiguration}
              className="inline-flex items-center gap-2 py-2 px-4 bg-white text-gray-700 border border-gray-300 rounded-md text-base font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="w-full py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-semibold text-gray-800 m-0">Team Configuration</h2>
          <p className="text-gray-600 mt-2">Configure your team settings, members, velocity, and sprints. All changes will automatically reflect in the calendar and capacity planning.</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Team Basic Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Team Information</h3>
          <form onSubmit={handleSaveTeamInfo} className="space-y-6">
            <div>
              <label htmlFor="teamName" className="block font-medium mb-2 text-gray-700">Team Name:</label>
              <input
                type="text"
                id="teamName"
                value={teamBasicData.name}
                onChange={(e) => setTeamBasicData({ ...teamBasicData, name: e.target.value })}
                required
                placeholder="e.g., Frontend Development Team"
                className="w-full p-3 border border-gray-300 rounded-md text-base transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
              />
            </div>
            
            <div>
              <label htmlFor="teamDescription" className="block font-medium mb-2 text-gray-700">Description (Optional):</label>
              <textarea
                id="teamDescription"
                value={teamBasicData.description}
                onChange={(e) => setTeamBasicData({ ...teamBasicData, description: e.target.value })}
                rows={2}
                placeholder="Brief description of team responsibilities"
                className="w-full p-3 border border-gray-300 rounded-md text-base transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-gray-700">Working Days Configuration:</label>
              <div className="text-sm text-gray-600 mb-4">Select which days of the week your team works</div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[1, 2, 3, 4, 5, 6, 0].map(day => (
                  <label key={day} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={teamBasicData.working_days.includes(day)}
                      onChange={() => toggleWorkingDay(day)}
                      className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-gray-700">{getDayName(day)}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 py-3 px-6 bg-blue-500 text-white border-none rounded-md text-base font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-blue-600"
            >
              Save Team Information
            </button>
          </form>
        </div>

        {/* Baseline Velocity Setting */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Baseline Velocity</h3>
          <form onSubmit={handleSaveVelocity} className="space-y-6">
            <div>
              <label htmlFor="baselineVelocity" className="block font-medium mb-2 text-gray-700">Story Points per Sprint:</label>
              <input
                type="number"
                id="baselineVelocity"
                value={velocityData.baseline_velocity}
                onChange={(e) => setVelocityData({ ...velocityData, baseline_velocity: parseInt(e.target.value) || 0 })}
                min="1"
                step="1"
                required
                placeholder="50"
                className="w-full p-3 border border-gray-300 rounded-md text-base transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
              />
              <div className="text-sm text-gray-600 mt-2">Average story points your team completes in a full sprint (all team members, no time off)</div>
            </div>

            <div>
              <label htmlFor="sprintLength" className="block font-medium mb-2 text-gray-700">Sprint Length (weeks):</label>
              <select
                id="sprintLength"
                value={velocityData.sprint_length}
                onChange={(e) => setVelocityData({ ...velocityData, sprint_length: parseInt(e.target.value) })}
                required
                className="w-full p-3 border border-gray-300 rounded-md text-base transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
              >
                <option value="1">1 week</option>
                <option value="2">2 weeks</option>
                <option value="3">3 weeks</option>
                <option value="4">4 weeks</option>
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 py-3 px-6 bg-blue-500 text-white border-none rounded-md text-base font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-blue-600"
            >
              Save Velocity Settings
            </button>
          </form>
        </div>

        {/* Team Member Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Team Members</h3>
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="inline-flex items-center gap-2 py-2 px-4 bg-blue-500 text-white border-none rounded-md text-sm font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-blue-600"
            >
              Add Team Member
            </button>
          </div>

          {teamMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">No team members found. Add your first team member to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                  <div>
                    <div className="font-medium text-gray-900">{member.first_name} {member.last_name}</div>
                    <div className="text-sm text-gray-600">{member.email}</div>
                    <div className="text-sm text-blue-600">{member.team_role === 'lead' ? 'Team Lead' : 'Team Member'}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sprint Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Sprint Management</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateSprintModal(true)}
                className="inline-flex items-center gap-2 py-2 px-4 bg-blue-500 text-white border-none rounded-md text-sm font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-blue-600"
              >
                Create New Sprint
              </button>
              <button
                onClick={() => setShowGenerateSprintsModal(true)}
                className="inline-flex items-center gap-2 py-2 px-4 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-gray-50"
              >
                Generate Multiple Sprints
              </button>
            </div>
          </div>

          {sprints.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">No sprints found. Create your first sprint to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sprints.map(sprint => (
                <div key={sprint.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                  <div>
                    <div className="font-medium text-gray-900">{sprint.name}</div>
                    <div className="text-sm text-gray-600">
                      {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
                    </div>
                    <div className={`text-sm ${
                      sprint.status === 'active' ? 'text-green-600' : 
                      sprint.status === 'completed' ? 'text-blue-600' : 'text-gray-600'
                    }`}>
                      {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Team Member</h3>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label htmlFor="memberEmail" className="block font-medium mb-2 text-gray-700">Email Address:</label>
                <input
                  type="email"
                  id="memberEmail"
                  value={addMemberData.email}
                  onChange={(e) => setAddMemberData({ ...addMemberData, email: e.target.value })}
                  required
                  placeholder="user@company.com"
                  className="w-full p-3 border border-gray-300 rounded-md text-base transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                />
                {memberErrors.email && (
                  <div className="text-sm text-red-600 mt-1">{memberErrors.email}</div>
                )}
                <div className="text-sm text-gray-600 mt-1">Must be a registered user in the system</div>
              </div>

              <div>
                <label htmlFor="memberRole" className="block font-medium mb-2 text-gray-700">Role:</label>
                <select
                  id="memberRole"
                  value={addMemberData.role}
                  onChange={(e) => setAddMemberData({ ...addMemberData, role: e.target.value as 'member' | 'lead' })}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md text-base transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                >
                  <option value="member">Team Member</option>
                  <option value="lead">Team Lead</option>
                </select>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMemberModal(false)
                    setAddMemberData({ email: '', role: 'member' })
                    setMemberErrors({})
                  }}
                  className="inline-flex items-center gap-2 py-2 px-4 bg-white text-gray-700 border border-gray-300 rounded-md text-base font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 py-2 px-4 bg-blue-500 text-white border-none rounded-md text-base font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-blue-600"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Sprint Modal */}
      {showCreateSprintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Sprint</h3>
            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div>
                <label htmlFor="sprintName" className="block font-medium mb-2 text-gray-700">Sprint Name:</label>
                <input
                  type="text"
                  id="sprintName"
                  value={createSprintData.name}
                  onChange={(e) => setCreateSprintData({ ...createSprintData, name: e.target.value })}
                  required
                  placeholder="Sprint 3"
                  className="w-full p-3 border border-gray-300 rounded-md text-base transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                />
                {sprintErrors.name && (
                  <div className="text-sm text-red-600 mt-1">{sprintErrors.name}</div>
                )}
              </div>

              <div>
                <label htmlFor="sprintStartDate" className="block font-medium mb-2 text-gray-700">Start Date:</label>
                <input
                  type="date"
                  id="sprintStartDate"
                  value={createSprintData.start_date}
                  onChange={(e) => setCreateSprintData({ ...createSprintData, start_date: e.target.value })}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md text-base transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                />
                {sprintErrors.start_date && (
                  <div className="text-sm text-red-600 mt-1">{sprintErrors.start_date}</div>
                )}
              </div>

              <div>
                <label htmlFor="sprintEndDate" className="block font-medium mb-2 text-gray-700">End Date:</label>
                <input
                  type="date"
                  id="sprintEndDate"
                  value={createSprintData.end_date}
                  onChange={(e) => setCreateSprintData({ ...createSprintData, end_date: e.target.value })}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md text-base transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                />
                {sprintErrors.end_date && (
                  <div className="text-sm text-red-600 mt-1">{sprintErrors.end_date}</div>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateSprintModal(false)
                    setCreateSprintData({ name: '', start_date: '', end_date: '' })
                    setSprintErrors({})
                  }}
                  className="inline-flex items-center gap-2 py-2 px-4 bg-white text-gray-700 border border-gray-300 rounded-md text-base font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 py-2 px-4 bg-blue-500 text-white border-none rounded-md text-base font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-blue-600"
                >
                  Create Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[60] min-w-[300px] rounded-md shadow-lg animate-[slideIn_0.3s_ease]">
          <div className={`flex justify-between items-center gap-2 p-4 ${
            toast.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <span className={toast.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {toast.message}
            </span>
            <button
              onClick={() => setToast(null)}
              className="text-xl opacity-80 transition-opacity duration-200 hover:opacity-100"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </main>
  )
}

export default TeamConfigurationPage