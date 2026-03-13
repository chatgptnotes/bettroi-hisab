import { useState, useEffect, useRef } from 'react'
import { X, Save, Upload, Sparkles, FileText, Loader2, Eye, Download, Trash2, Plus, MessageSquare } from 'lucide-react'
import { uploadToStorage, deleteFromStorage } from '../lib/supabase'
import type { BettroiProject, QuotationDocument } from '../lib/supabase'

interface QuotationModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  initialData: Record<string, any>
  projects: BettroiProject[]
  onSave: (data: Record<string, any>) => Promise<void>
}

const STATUS_OPTIONS = [
  { value: 'sent',     label: 'Sent to BT' },
  { value: 'accepted', label: 'Client Accepted – Go Ahead' },
  { value: 'revised',  label: 'Sent to BT – Needs Revision' },
  { value: 'draft',    label: 'Draft' },
  { value: 'rejected', label: 'Rejected by Client' },
]

export const QuotationModal = ({
  isOpen,
  onClose,
  title,
  initialData,
  projects,
  onSave,
}: QuotationModalProps) => {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [documents, setDocuments] = useState<QuotationDocument[]>([])
  const [extracting, setExtracting] = useState(false)
  const [keywords, setKeywords] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...initialData })
      // Load existing documents array, or migrate from quote_url
      const existingDocs: QuotationDocument[] = initialData.documents || []
      if (existingDocs.length === 0 && initialData.quote_url) {
        // Migrate legacy single URL to documents array
        setDocuments([{
          name: initialData.quote_url.split('/').pop() || 'Document',
          url: initialData.quote_url,
          comment: '',
          uploadedAt: initialData.created_at || new Date().toISOString(),
        }])
      } else {
        setDocuments([...existingDocs])
      }
      setKeywords([])
    }
  }, [isOpen, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Save documents array and also keep quote_url for backward compatibility
      const dataToSave = {
        ...formData,
        documents,
        quote_url: documents.length > 0 ? documents[0].url : (formData.quote_url || ''),
      }
      await onSave(dataToSave)
      onClose()
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return
    setUploading(true)
    try {
      const filePath = `${Date.now()}-${file.name}`
      const { publicUrl } = await uploadToStorage('quotation-docs', filePath, file)

      const newDoc: QuotationDocument = {
        name: file.name,
        url: publicUrl,
        comment: '',
        uploadedAt: new Date().toISOString(),
      }
      setDocuments(prev => [...prev, newDoc])
      // Also set quote_url for backward compat
      if (!formData.quote_url) {
        setFormData(prev => ({ ...prev, quote_url: publicUrl }))
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      alert('Upload failed: ' + (error?.message || 'Unknown error. Check console for details.'))
    } finally {
      setUploading(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    if (e.target) e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }

  const removeDocument = (index: number) => {
    const doc = documents[index]
    // Delete from storage if it's a Supabase URL
    const storagePath = doc.url.split('/quotation-docs/')[1]
    if (storagePath) {
      deleteFromStorage('quotation-docs', [decodeURIComponent(storagePath)])
    }
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }

  const updateDocComment = (index: number, comment: string) => {
    setDocuments(prev => prev.map((doc, i) => i === index ? { ...doc, comment } : doc))
  }

  const handleExtractWithAI = async () => {
    const context = formData.description || documents.map(d => d.name).join(', ') || 'quotation document'
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
      if (!text) throw new Error('No response from Gemini')

      const parsed = JSON.parse(text)
      if (parsed.description) {
        setFormData(prev => ({ ...prev, description: parsed.description }))
      }
      if (parsed.keywords) {
        setKeywords(parsed.keywords)
      }
    } catch (error) {
      console.error('AI extraction error:', error)
      alert('AI extraction failed. Check your VITE_GEMINI_API_KEY.')
    } finally {
      setExtracting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white border border-gray-200 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Project */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Project</label>
              <select
                value={formData.project_id || ''}
                onChange={e => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">No project linked</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Quote Date */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Quote Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.quote_date || ''}
                onChange={e => setFormData(prev => ({ ...prev, quote_date: e.target.value }))}
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Amount ({'\u20B9'}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.amount || ''}
                onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="150000"
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g. 4C Web Portal - Add-on features"
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status || ''}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Quote URL (manual) */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Quotation Document URL</label>
              <input
                type="url"
                value={formData.quote_url || ''}
                onChange={e => setFormData(prev => ({ ...prev, quote_url: e.target.value }))}
                placeholder="https://drive.google.com/..."
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Documents Section - Multi-file with comments */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Documents ({documents.length})
              </p>

              {/* List of uploaded documents */}
              {documents.length > 0 && (
                <div className="space-y-3 mb-4">
                  {documents.map((doc, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
                      {/* File info row */}
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                          <a
                            href={doc.url}
                            download={doc.name}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => removeDocument(i)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {/* Comment field */}
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-2 flex-shrink-0" />
                        <input
                          type="text"
                          value={doc.comment || ''}
                          onChange={e => updateDocComment(i, e.target.value)}
                          placeholder="Add a comment for this file..."
                          className="flex-1 px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload area */}
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
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
                ) : (
                  <div className="text-gray-500">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Plus className="w-5 h-5 text-emerald-500" />
                      <Upload className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-emerald-600">
                      {documents.length > 0 ? 'Add More Files' : 'Upload Document'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Drag & drop or click | PDF, JPG, PNG, DOCX</p>
                  </div>
                )}
              </div>

              {/* Extract with AI */}
              {(documents.length > 0 || formData.quote_url || formData.description) && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleExtractWithAI}
                    disabled={extracting}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {extracting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {extracting ? 'Extracting...' : 'Extract with AI'}
                  </button>
                </div>
              )}

              {/* Keywords chips */}
              {keywords.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">AI-extracted keywords:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full"
                      >
                        {kw}
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
                {saving ? 'Saving...' : 'Save Changes'}
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
