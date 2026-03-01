import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Edit2, Trash2, ExternalLink, CheckSquare, Square, MessageSquare, Save, X } from 'lucide-react'
import { supabase, type BettroiProject } from '../lib/supabase'
import { EditModal, type FieldDefinition } from '../components/EditModal'
import { ConfirmDialog } from '../components/ConfirmDialog'

interface ProjectWithBalance extends BettroiProject {
  totalReceived: number
  balance: number
}

export const Projects = () => {
  const [projects, setProjects] = useState<ProjectWithBalance[]>([])
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'status' | 'balance'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectWithBalance | null>(null)
  const [deletingProject, setDeletingProject] = useState<ProjectWithBalance | null>(null)
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [notesProject, setNotesProject] = useState<ProjectWithBalance | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    filterAndSortProjects()
  }, [projects, searchTerm, statusFilter, sortBy, sortOrder])

  const fetchProjects = async () => {
    try {
      const { data: projectsData } = await supabase
        .from('bettroi_projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (!projectsData) return

      // Calculate received amounts for each project
      const projectsWithBalance = await Promise.all(
        projectsData.map(async (project) => {
          const { data: transactions } = await supabase
            .from('bettroi_transactions')
            .select('amount, type')
            .eq('project_id', project.id)

          let totalReceived = 0
          if (transactions) {
            transactions.forEach(tx => {
              if (tx.type === 'payment_received' || tx.type === 'advance' || tx.type === 'by_hand') {
                totalReceived += Number(tx.amount)
              }
            })
          }

          return {
            ...project,
            totalReceived,
            balance: Number(project.total_value) - totalReceived,
          }
        })
      )

      setProjects(projectsWithBalance)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching projects:', error)
      setLoading(false)
    }
  }

  const filterAndSortProjects = () => {
    let filtered = projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (project.client_name && project.client_name.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter
      return matchesSearch && matchesStatus
    })

    filtered.sort((a, b) => {
      let aVal: any, bVal: any

      if (sortBy === 'value') {
        aVal = a.total_value
        bVal = b.total_value
      } else if (sortBy === 'balance') {
        aVal = a.balance
        bVal = b.balance
      } else if (sortBy === 'name') {
        aVal = a.name?.toLowerCase() || ''
        bVal = b.name?.toLowerCase() || ''
      } else if (sortBy === 'status') {
        aVal = a.status?.toLowerCase() || ''
        bVal = b.status?.toLowerCase() || ''
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })

    setFilteredProjects(filtered)
  }

  const createProject = async (data: Record<string, any>) => {
    await supabase.from('bettroi_projects').insert({
      name: data.name,
      client_name: data.client_name,
      total_value: Number(data.total_value) || 0,
      status: data.status,
      notes: data.notes,
      quote_url: data.quote_url
    })
    fetchProjects()
  }

  const updateProject = async (data: Record<string, any>) => {
    await supabase.from('bettroi_projects').update({
      name: data.name,
      client_name: data.client_name,
      total_value: Number(data.total_value) || 0,
      status: data.status,
      notes: data.notes,
      quote_url: data.quote_url
    }).eq('id', editingProject!.id)
    fetchProjects()
  }

  const deleteProject = async () => {
    if (!deletingProject) return

    // Check if project has transactions
    const { data: transactions } = await supabase
      .from('bettroi_transactions')
      .select('id')
      .eq('project_id', deletingProject.id)

    if (transactions && transactions.length > 0) {
      // Delete transactions first
      await supabase.from('bettroi_transactions').delete().eq('project_id', deletingProject.id)
      // Delete milestones
      await supabase.from('bettroi_milestones').delete().eq('project_id', deletingProject.id)
      // Delete action items
      await supabase.from('bettroi_action_items').delete().eq('project_id', deletingProject.id)
    }

    await supabase.from('bettroi_projects').delete().eq('id', deletingProject.id)
    fetchProjects()
  }

  const bulkDelete = async () => {
    const ids = Array.from(selectedProjects)

    // Delete related data first
    await supabase.from('bettroi_transactions').delete().in('project_id', ids)
    await supabase.from('bettroi_milestones').delete().in('project_id', ids)
    await supabase.from('bettroi_action_items').delete().in('project_id', ids)

    // Delete projects
    await supabase.from('bettroi_projects').delete().in('id', ids)

    setSelectedProjects(new Set())
    fetchProjects()
  }

  const toggleProjectSelection = (projectId: string) => {
    const newSelected = new Set(selectedProjects)
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId)
    } else {
      newSelected.add(projectId)
    }
    setSelectedProjects(newSelected)
  }

  const selectAllProjects = () => {
    if (selectedProjects.size === filteredProjects.length) {
      setSelectedProjects(new Set())
    } else {
      setSelectedProjects(new Set(filteredProjects.map(p => p.id)))
    }
  }

  const openNotes = (project: ProjectWithBalance) => {
    setNotesProject(project)
    setNotesDraft(project.notes || '')
  }

  const saveNotes = async () => {
    if (!notesProject) return
    setSavingNotes(true)
    await supabase.from('bettroi_projects').update({ notes: notesDraft }).eq('id', notesProject.id)
    await fetchProjects()
    setSavingNotes(false)
    setNotesProject(null)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'completed':
        return 'bg-blue-100 text-blue-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'in_process':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const projectFields: FieldDefinition[] = [
    { name: 'name', label: 'Project Name', type: 'text', required: true, placeholder: 'Enter project name' },
    { name: 'client_name', label: 'Client Name', type: 'text', placeholder: 'Enter client name' },
    { name: 'total_value', label: 'Total Value (₹)', type: 'number', required: true, placeholder: '150000' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'active', label: 'Active' },
        { value: 'in_process', label: 'In Process' },
        { value: 'completed', label: 'Completed' }
      ]
    },
    { name: 'quote_url', label: 'Quotation URL', type: 'url', placeholder: 'https://drive.google.com/...' },
    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Any additional notes...', rows: 3 }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500">Manage Bettroi project accounts</p>
        </div>
        <div className="flex gap-3">
          {selectedProjects.size > 0 && (
            <button
              onClick={() => setShowBulkDelete(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedProjects.size})
            </button>
          )}
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Project
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects or clients..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="in_process">In Process</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-')
              setSortBy(field as any)
              setSortOrder(order as 'asc' | 'desc')
            }}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="value-desc">Value High-Low</option>
            <option value="value-asc">Value Low-High</option>
            <option value="balance-desc">Balance High-Low</option>
            <option value="balance-asc">Balance Low-High</option>
            <option value="status-asc">Status A-Z</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={selectAllProjects}
                    className="text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    {selectedProjects.size === filteredProjects.length && filteredProjects.length > 0 ?
                      <CheckSquare className="w-4 h-4" /> :
                      <Square className="w-4 h-4" />
                    }
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Received
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleProjectSelection(project.id)}
                        className="text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        {selectedProjects.has(project.id) ?
                          <CheckSquare className="w-4 h-4 text-emerald-500" /> :
                          <Square className="w-4 h-4" />
                        }
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {project.name}
                          {project.quote_url && (
                            <a
                              href={project.quote_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-500"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        {project.client_name && (
                          <div className="text-sm text-gray-500">
                            {project.client_name}
                          </div>
                        )}
                        {project.notes && (
                          <div className="text-xs text-gray-400 mt-1 truncate max-w-[250px]">{project.notes}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(Number(project.total_value))}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600">
                      {formatCurrency(project.totalReceived)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={project.balance > 0 ? 'text-yellow-600' : 'text-green-600'}>
                        {formatCurrency(project.balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openNotes(project)}
                          className={`p-1.5 rounded-lg transition-colors ${project.notes ? 'text-amber-500 hover:bg-amber-50' : 'text-gray-400 hover:text-amber-500 hover:bg-gray-100'}`}
                          title="Notes & Agreements"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingProject(project)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingProject(project)}
                          className="p-1.5 text-red-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/project/${project.id}`}
                          className="p-1.5 text-blue-600 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Details"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    {searchTerm || statusFilter !== 'all' ? 'No projects match your filters' : 'No projects found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Project Modal */}
      <EditModal
        isOpen={showAddForm || !!editingProject}
        onClose={() => {
          setShowAddForm(false)
          setEditingProject(null)
        }}
        title={editingProject ? 'Edit Project' : 'Add New Project'}
        fields={projectFields}
        initialData={editingProject || { status: 'pending' }}
        onSave={editingProject ? updateProject : createProject}
      />

      {/* Delete Project Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirm={deleteProject}
        title="Delete Project"
        message={`Are you sure you want to delete "${deletingProject?.name}"? This will also delete all associated transactions, milestones, and action items. This action cannot be undone.`}
        confirmText="Delete Project"
        type="danger"
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={bulkDelete}
        title="Delete Projects"
        message={`Are you sure you want to delete ${selectedProjects.size} projects? This will also delete all associated transactions, milestones, and action items. This action cannot be undone.`}
        confirmText="Delete All"
        type="danger"
      />

      {/* Notes & Agreements Modal */}
      {notesProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setNotesProject(null)}>
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-500" />
                  Notes & Agreements
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">{notesProject.name} — {notesProject.client_name || 'Bettroi'}</p>
              </div>
              <button onClick={() => setNotesProject(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder={"Record agreements with BT, Harita, or Bettroi here...\n\nExamples:\n• Payment terms: 50% advance, 50% on delivery\n• Margin split: 50% Bettroi\n• Scope: Phase 1 only, Phase 2 TBD\n• Deadline: March 15, 2026"}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y"
                rows={8}
                style={{ minHeight: '150px' }}
              />
              {notesDraft !== (notesProject.notes || '') && (
                <p className="text-xs text-amber-600 mt-2">Unsaved changes</p>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 pt-0">
              <button onClick={() => setNotesProject(null)} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm rounded-xl transition-colors">
                Cancel
              </button>
              <button
                onClick={saveNotes}
                disabled={savingNotes || notesDraft === (notesProject.notes || '')}
                className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <Save className="w-4 h-4" />
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
