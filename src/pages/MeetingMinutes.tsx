/*
 * MeetingMinutes page
 *
 * Required Supabase table (run this SQL in your Supabase SQL editor):
 *
 * CREATE TABLE IF NOT EXISTS meeting_minutes (
 *   id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
 *   type        text        NOT NULL CHECK (type IN ('meeting', 'bt_prompt')),
 *   title       text        NOT NULL,
 *   date        date        NOT NULL,
 *   content     text        NOT NULL DEFAULT '',
 *   file_url    text,
 *   keywords    text[]      DEFAULT '{}',
 *   created_at  timestamptz DEFAULT now()
 * );
 */

import { useEffect, useState, useRef } from 'react'
import {
  Plus, X, Save, Upload, Sparkles, FileText, Loader2,
  LayoutList, LayoutGrid, Calendar, ExternalLink, Trash2, Edit2
} from 'lucide-react'
import { supabase, uploadToStorage } from '../lib/supabase'

interface MeetingMinuteEntry {
  id: string
  type: 'meeting' | 'bt_prompt'
  title: string
  date: string
  content: string
  file_url?: string
  keywords?: string[]
  created_at: string
}

type TabType = 'meeting' | 'bt_prompt'

const SETUP_SQL = `CREATE TABLE IF NOT EXISTS meeting_minutes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text        NOT NULL CHECK (type IN ('meeting', 'bt_prompt')),
  title       text        NOT NULL,
  date        date        NOT NULL,
  content     text        NOT NULL DEFAULT '',
  file_url    text,
  keywords    text[]      DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);`

// ─── Entry Card ────────────────────────────────────────────────────────────────
const EntryCard = ({
  entry,
  onEdit,
  onDelete,
}: {
  entry: MeetingMinuteEntry
  onEdit: (e: MeetingMinuteEntry) => void
  onDelete: (e: MeetingMinuteEntry) => void
}) => {
  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  const preview = entry.content.length > 100 ? entry.content.slice(0, 100) + '...' : entry.content

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-gray-900 font-bold text-sm">{entry.title}</h3>
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
            <Calendar className="w-3 h-3" />
            {formatDate(entry.date)}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(entry)}
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(entry)}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {preview && <p className="text-gray-600 text-xs leading-relaxed">{preview}</p>}

      {entry.keywords && entry.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.keywords.map((kw, i) => (
            <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
              {kw}
            </span>
          ))}
        </div>
      )}

      {entry.file_url && (
        <a
          href={entry.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 transition-colors truncate"
        >
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">View Attachment</span>
        </a>
      )}
    </div>
  )
}

// ─── Entry Row (list view) ──────────────────────────────────────────────────────
const EntryRow = ({
  entry,
  onEdit,
  onDelete,
}: {
  entry: MeetingMinuteEntry
  onEdit: (e: MeetingMinuteEntry) => void
  onDelete: (e: MeetingMinuteEntry) => void
}) => {
  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
  const preview = entry.content.length > 80 ? entry.content.slice(0, 80) + '...' : entry.content

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="text-gray-900 font-semibold text-sm">{entry.title}</p>
          {preview && <p className="text-gray-500 text-xs mt-0.5">{preview}</p>}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(entry.date)}</td>
      <td className="px-4 py-3">
        {entry.keywords && entry.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.keywords.slice(0, 3).map((kw, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                {kw}
              </span>
            ))}
            {entry.keywords.length > 3 && (
              <span className="text-xs text-gray-400">+{entry.keywords.length - 3}</span>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {entry.file_url && (
          <a href={entry.file_url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(entry)} className="text-emerald-500 hover:text-emerald-700 transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(entry)} className="text-red-500 hover:text-red-700 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Entry Modal ───────────────────────────────────────────────────────────────
const EntryModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  type,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<MeetingMinuteEntry>) => Promise<void>
  initialData: Partial<MeetingMinuteEntry> | null
  type: TabType
}) => {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [content, setContent] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '')
      setDate(initialData?.date || new Date().toISOString().split('T')[0])
      setContent(initialData?.content || '')
      setFileUrl(initialData?.file_url || '')
      setKeywords(initialData?.keywords || [])
      setUploadedFileName('')
    }
  }, [isOpen, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({ title, date, content, file_url: fileUrl, keywords, type })
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const filePath = `${Date.now()}-${file.name}`
      const { publicUrl } = await uploadToStorage('meeting-docs', filePath, file)
      setFileUrl(publicUrl)
      setUploadedFileName(file.name)
    } catch (err) {
      console.error('Upload error:', err)
      alert('Upload failed: ' + ((err as any)?.message || 'Unknown error. Check console.'))
    } finally {
      setUploading(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleExtractWithAI = async () => {
    const context = content || title || uploadedFileName || 'meeting document'
    setExtracting(true)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not set')

      const prompt = `Extract a short description (1-2 sentences) and 5-8 relevant keywords from this document. The document is about: ${context}. Return JSON: {"description": string, "keywords": string[]}`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        }
      )
      const result = await response.json()
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('No response')
      const parsed = JSON.parse(text)
      if (parsed.description && !content) setContent(parsed.description)
      if (parsed.keywords) setKeywords(parsed.keywords)
    } catch (err) {
      console.error('AI error:', err)
      alert('AI extraction failed. Check your VITE_GEMINI_API_KEY.')
    } finally {
      setExtracting(false)
    }
  }

  if (!isOpen) return null

  const tabLabel = type === 'meeting' ? 'Meeting Minutes' : 'BT Prompt / Transcript'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white border border-gray-200 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {initialData?.id ? 'Edit' : 'Add'} {tabLabel}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Sprint Planning – March 2026"
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Content</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={type === 'meeting' ? 'Meeting notes, decisions, action items...' : 'BT prompt or transcript text...'}
                rows={6}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>

            {/* File Upload */}
            <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Upload Document (PDF / Image)
              </p>
              <div
                className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                {uploading ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Uploading...</span>
                  </div>
                ) : uploadedFileName ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-600">
                    <FileText className="w-5 h-5" />
                    <span className="text-sm font-medium">{uploadedFileName}</span>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <Upload className="w-7 h-7 mx-auto mb-1 text-gray-400" />
                    <p className="text-sm">Drag & drop or click to upload</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOCX</p>
                  </div>
                )}
              </div>

              {/* Extract with AI */}
              {(uploadedFileName || fileUrl || content || title) && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleExtractWithAI}
                    disabled={extracting}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {extracting ? 'Extracting...' : 'Extract with AI'}
                  </button>
                </div>
              )}

              {/* Keywords */}
              {keywords.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">Keywords:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full"
                      >
                        {kw}
                        <button
                          type="button"
                          onClick={() => setKeywords(prev => prev.filter((_, idx) => idx !== i))}
                          className="hover:text-purple-900"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export const MeetingMinutes = () => {
  const [activeTab, setActiveTab] = useState<TabType>('meeting')
  const [entries, setEntries] = useState<MeetingMinuteEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card')
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<MeetingMinuteEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<MeetingMinuteEntry | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => { fetchEntries() }, [activeTab])

  const fetchEntries = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('meeting_minutes')
      .select('*')
      .eq('type', activeTab)
      .order('date', { ascending: false })

    if (error) {
      // If table doesn't exist, error code is 42P01
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        setTableError(true)
      } else {
        console.error('Fetch error:', error)
      }
      setLoading(false)
      return
    }

    setTableError(false)
    setEntries(data || [])
    setLoading(false)
  }

  const handleSave = async (data: Partial<MeetingMinuteEntry>) => {
    if (editingEntry) {
      await supabase.from('meeting_minutes').update({
        title: data.title,
        date: data.date,
        content: data.content,
        file_url: data.file_url,
        keywords: data.keywords,
      }).eq('id', editingEntry.id)
    } else {
      await supabase.from('meeting_minutes').insert({
        type: activeTab,
        title: data.title,
        date: data.date,
        content: data.content || '',
        file_url: data.file_url,
        keywords: data.keywords || [],
      })
    }
    setEditingEntry(null)
    fetchEntries()
  }

  const handleDelete = async () => {
    if (!deletingEntry) return
    await supabase.from('meeting_minutes').delete().eq('id', deletingEntry.id)
    setDeletingEntry(null)
    setShowDeleteConfirm(false)
    fetchEntries()
  }

  const openEdit = (entry: MeetingMinuteEntry) => {
    setEditingEntry(entry)
    setShowModal(true)
  }

  const openDelete = (entry: MeetingMinuteEntry) => {
    setDeletingEntry(entry)
    setShowDeleteConfirm(true)
  }

  const filteredEntries = entries.filter(e => e.type === activeTab)

  const tabLabel = activeTab === 'meeting' ? 'Meeting Minutes' : 'BT Prompts / Transcripts'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-500 text-sm mt-1">Meeting minutes and BT prompts / transcripts</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              title="List view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 transition-colors ${viewMode === 'card' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Card view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => { setEditingEntry(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add New
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {([
          { key: 'meeting' as TabType, label: 'Meeting Minutes' },
          { key: 'bt_prompt' as TabType, label: 'BT Prompts / Transcripts' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table not set up */}
      {tableError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="text-amber-800 font-semibold mb-2">Table not set up yet</h3>
          <p className="text-amber-700 text-sm mb-4">
            The <code className="bg-amber-100 px-1 rounded">meeting_minutes</code> table doesn't exist in your Supabase database yet. Run this SQL in your Supabase SQL editor:
          </p>
          <pre className="bg-gray-900 text-green-300 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
            {SETUP_SQL}
          </pre>
        </div>
      )}

      {/* Loading */}
      {loading && !tableError && (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Content */}
      {!loading && !tableError && (
        <>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No {tabLabel.toLowerCase()} yet.</p>
              <button
                onClick={() => { setEditingEntry(null); setShowModal(true) }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Add first entry
              </button>
            </div>
          ) : viewMode === 'card' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEntries.map(entry => (
                <EntryCard key={entry.id} entry={entry} onEdit={openEdit} onDelete={openDelete} />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title / Content</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keywords</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEntries.map(entry => (
                    <EntryRow key={entry.id} entry={entry} onEdit={openEdit} onDelete={openDelete} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <EntryModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingEntry(null) }}
        onSave={handleSave}
        initialData={editingEntry}
        type={activeTab}
      />

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowDeleteConfirm(false)} />
            <div className="relative bg-white border border-gray-200 rounded-xl shadow-xl max-w-sm w-full p-6">
              <h3 className="text-gray-900 font-semibold mb-2">Delete Entry</h3>
              <p className="text-gray-500 text-sm mb-6">
                Are you sure you want to delete "<strong>{deletingEntry?.title}</strong>"? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
