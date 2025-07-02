import React, { useState, useEffect } from 'react'

interface Team {
  id: string
  name: string
  description?: string
  velocity_baseline: number
  sprint_length_days: number
  working_days_per_week: number
  created_at: string
  updated_at: string
}

interface CreateTeamData {
  name: string
  description?: string
  velocity_baseline: number
  sprint_length_days: number
  working_days_per_week: number
}

interface ValidationError {
  message: string
  field?: string
  details?: string
}

const TeamsPage: React.FC = () => {
  // State management
  const [teams, setTeams] = useState<Team[]>([])
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Form state
  const [formData, setFormData] = useState<CreateTeamData>({
    name: '',
    description: '',
    velocity_baseline: 0,
    sprint_length_days: 14,
    working_days_per_week: 5
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Load teams on component mount
  useEffect(() => {
    void loadTeams()
  }, [])

  // Hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const loadTeams = async (): Promise<void> => {
    try {
      setIsLoading(true)
      setError('')
      
      const response = await fetch('/api/teams')
      if (!response.ok) {
        throw new Error(`Failed to load teams: ${response.status}`)
      }
      
      const data = await response.json()
      setTeams(data)
    } catch (err) {
      console.error('Error loading teams:', err)
      setError(err instanceof Error ? err.message : 'Failed to load teams')
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateModal = (): void => {
    setCurrentTeam(null)
    setIsEditing(false)
    setFormData({
      name: '',
      description: '',
      velocity_baseline: 0,
      sprint_length_days: 14,
      working_days_per_week: 5
    })
    setFormErrors({})
    setShowTeamModal(true)
  }

  const openEditModal = (team: Team): void => {
    setCurrentTeam(team)
    setIsEditing(true)
    setFormData({
      name: team.name,
      description: team.description || '',
      velocity_baseline: team.velocity_baseline,
      sprint_length_days: team.sprint_length_days,
      working_days_per_week: team.working_days_per_week
    })
    setFormErrors({})
    setShowTeamModal(true)
  }

  const openDeleteModal = (team: Team): void => {
    setCurrentTeam(team)
    setShowDeleteModal(true)
  }

  const closeModals = (): void => {
    setShowTeamModal(false)
    setShowDeleteModal(false)
    setCurrentTeam(null)
    setFormErrors({})
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Team name is required'
    } else if (formData.name.length > 100) {
      errors.name = 'Team name must be less than 100 characters'
    }
    
    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters'
    }
    
    if (formData.velocity_baseline < 0) {
      errors.velocity_baseline = 'Velocity must be 0 or greater'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      const method = isEditing ? 'PUT' : 'POST'
      const url = isEditing ? `/api/teams/${currentTeam?.id}` : '/api/teams'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to save team')
      }

      setToast({
        message: isEditing ? 'Team updated successfully!' : 'Team created successfully!',
        type: 'success'
      })
      
      closeModals()
      await loadTeams()
    } catch (err) {
      console.error('Error saving team:', err)
      setToast({
        message: err instanceof Error ? err.message : 'Failed to save team',
        type: 'error'
      })
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!currentTeam) {return}

    try {
      const response = await fetch(`/api/teams/${currentTeam.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete team')
      }

      setToast({
        message: 'Team deleted successfully!',
        type: 'success'
      })
      
      closeModals()
      await loadTeams()
    } catch (err) {
      console.error('Error deleting team:', err)
      setToast({
        message: err instanceof Error ? err.message : 'Failed to delete team',
        type: 'error'
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const renderTeamCard = (team: Team) => (
    <div key={team.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{team.name}</h3>
          {team.description && (
            <p className="text-gray-600 text-sm mb-3">{team.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openEditModal(team)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Edit team"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
          <button
            onClick={() => openDeleteModal(team)}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete team"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Velocity:</span>
          <span className="font-medium">{team.velocity_baseline > 0 ? `${team.velocity_baseline} points` : 'Not set'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Sprint Length:</span>
          <span className="font-medium">{team.sprint_length_days} days</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Working Days:</span>
          <span className="font-medium">{team.working_days_per_week} days/week</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Created:</span>
          <span className="font-medium">{formatDate(team.created_at)}</span>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <main className="w-full py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-semibold text-gray-800 m-0">Team Management</h2>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 mb-4">Loading teams...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="w-full py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-semibold text-gray-800 m-0">Team Management</h2>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <div>
            <h3 className="text-red-600 mb-3 text-xl font-semibold">Unable to Load Teams</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={loadTeams}
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
        <h2 className="text-3xl font-semibold text-gray-800 m-0">Team Management</h2>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 py-3 px-6 bg-blue-500 text-white border-none rounded-md text-base font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-blue-600 hover:-translate-y-px hover:shadow-md active:translate-y-0"
        >
          Create New Team
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="text-center p-8 text-gray-500 italic bg-gray-50 rounded-md border border-dashed border-gray-300">
          <div className="max-w-sm mx-auto">
            <h3 className="text-gray-700 mb-3 text-xl font-semibold">No Teams Yet</h3>
            <p className="text-gray-500 mb-6">Create your first team to start planning sprint capacity.</p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 py-3 px-6 bg-blue-500 text-white border-none rounded-md text-base font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-blue-600"
            >
              Create Team
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {teams.map(renderTeamCard)}
        </div>
      )}

      {/* Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="m-0 text-xl font-semibold text-gray-900">
                {isEditing ? 'Edit Team' : 'Create New Team'}
              </h3>
              <button
                onClick={closeModals}
                className="bg-none border-none text-2xl text-gray-400 cursor-pointer p-2 rounded-md transition-colors duration-200 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-8 pb-6 border-b border-gray-200">
                <h4 className="text-base font-semibold text-gray-800 mb-6">Basic Information</h4>
                
                <div className="mb-6">
                  <label className="block font-medium mb-2 text-gray-700">Team Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Frontend Development Team"
                    className="w-full p-3 border border-gray-300 rounded-md text-base leading-6 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                    required
                  />
                  {formErrors.name && (
                    <span className="text-sm text-red-600 mt-1 block">{formErrors.name}</span>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block font-medium mb-2 text-gray-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Brief description of the team's focus and responsibilities"
                    className="w-full p-3 border border-gray-300 rounded-md text-base leading-6 transition-all duration-200 resize-vertical min-h-[80px] focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                  />
                  {formErrors.description && (
                    <span className="text-sm text-red-600 mt-1 block">{formErrors.description}</span>
                  )}
                </div>
              </div>

              <div className="mb-8 pb-6 border-b border-gray-200">
                <h4 className="text-base font-semibold text-gray-800 mb-6">Sprint Configuration</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block font-medium mb-2 text-gray-700">Velocity</label>
                    <input
                      type="number"
                      value={formData.velocity_baseline}
                      onChange={(e) => setFormData({ ...formData, velocity_baseline: parseInt(e.target.value) || 0 })}
                      min="0"
                      step="1"
                      placeholder="Story points per sprint"
                      className="w-full p-3 border border-gray-300 rounded-md text-base leading-6 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                    />
                    <small className="block text-sm text-gray-500 mt-1">Average story points completed per sprint (leave 0 if unknown)</small>
                    {formErrors.velocity_baseline && (
                      <span className="text-sm text-red-600 mt-1 block">{formErrors.velocity_baseline}</span>
                    )}
                  </div>

                  <div>
                    <label className="block font-medium mb-2 text-gray-700">Sprint Length *</label>
                    <select
                      value={formData.sprint_length_days}
                      onChange={(e) => setFormData({ ...formData, sprint_length_days: parseInt(e.target.value) })}
                      className="w-full p-3 border border-gray-300 rounded-md text-base leading-6 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                      required
                    >
                      <option value={7}>1 Week</option>
                      <option value={14}>2 Weeks</option>
                      <option value={21}>3 Weeks</option>
                      <option value={28}>4 Weeks</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-2 text-gray-700">Working Days per Week *</label>
                  <select
                    value={formData.working_days_per_week}
                    onChange={(e) => setFormData({ ...formData, working_days_per_week: parseInt(e.target.value) })}
                    className="w-full p-3 border border-gray-300 rounded-md text-base leading-6 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                    required
                  >
                    <option value={3}>3 Days</option>
                    <option value={4}>4 Days</option>
                    <option value={5}>5 Days (Standard)</option>
                    <option value={6}>6 Days</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-4 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModals}
                  className="inline-flex items-center gap-2 py-2 px-4 bg-white text-gray-700 border border-gray-300 rounded-md text-base font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 py-3 px-6 bg-blue-500 text-white border-none rounded-md text-base font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-blue-600"
                >
                  {isEditing ? 'Update Team' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && currentTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="m-0 text-xl font-semibold text-gray-900">Delete Team</h3>
              <button
                onClick={closeModals}
                className="bg-none border-none text-2xl text-gray-400 cursor-pointer p-2 rounded-md transition-colors duration-200 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6">
              <p className="mb-4 text-gray-600">
                Are you sure you want to delete <strong>{currentTeam.name}</strong>?
              </p>
              <p className="text-red-600 text-sm">
                This action cannot be undone. All team data and calendar entries will be permanently removed.
              </p>
            </div>

            <div className="flex justify-end gap-4 p-6 border-t border-gray-200">
              <button
                onClick={closeModals}
                className="inline-flex items-center gap-2 py-2 px-4 bg-white text-gray-700 border border-gray-300 rounded-md text-base font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 py-3 px-6 bg-red-600 text-white border-none rounded-md text-base font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-red-700"
              >
                Delete Team
              </button>
            </div>
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
    </main>
  )
}

export default TeamsPage