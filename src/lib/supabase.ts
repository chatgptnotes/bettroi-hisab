import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bvaefzcsgtgqwftczixb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2YWVmemNzZ3RncXdmdGN6aXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODU0ODIsImV4cCI6MjA4NzI2MTQ4Mn0.Q-AxSMpO6lKogtR_m0j2CvpzdRiDpZiKebR8XCPq1Nc'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2YWVmemNzZ3RncXdmdGN6aXhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY4NTQ4MiwiZXhwIjoyMDg3MjYxNDgyfQ.C3krrdQbECp6CR-_RjPuX6Rogl2m-W7sohRwNFya_Bc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Direct storage upload using fetch — bypasses Supabase JS client auth session issues entirely
export async function uploadToStorage(bucket: string, path: string, file: File | Blob) {
  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${encodeURIComponent(path)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
        'x-upsert': 'true',
      },
      body: file,
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || 'Upload failed')
  }
  const data = await res.json()
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
  return { path: data.Key || `${bucket}/${path}`, publicUrl }
}

// Direct storage delete using fetch
export async function deleteFromStorage(bucket: string, paths: string[]) {
  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: paths }),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || 'Delete failed')
  }
  return res.json()
}

// Database types
export interface BettroiProject {
  id: string
  name: string
  total_value: number
  status: 'active' | 'completed' | 'pending' | 'in_process'
  client_name?: string
  notes?: string
  quote_url?: string
  created_at: string
}

export interface TransactionDocument {
  name: string
  url: string
  type: 'upload' | 'link'
  mime?: string
  uploadedAt: string
}

export interface BettroiTransaction {
  id: string
  project_id: string
  date: string
  type: 'bill_sent' | 'payment_received' | 'invoice' | 'advance' | 'by_hand' | 'credit_note' | 'refund'
  amount: number
  mode?: 'cash' | 'bank' | 'upi' | 'by_hand' | 'cheque' | 'other'
  notes?: string
  attachment_url?: string
  documents?: TransactionDocument[]
  created_at: string
}

export interface BettroiQuotation {
  id: string
  project_id?: string
  quote_date: string
  amount: number
  description: string
  status: 'sent_to_bt' | 'bt_sent_to_client' | 'client_accepted' | 'sent_to_bt_revision' | 'draft' | 'rejected_by_client' | 'on_hold' | 'client_revision' | 'expired' | 'negotiating' | 'sent' | 'accepted' | 'rejected' | 'revised'
  notes?: string
  quote_url?: string
  created_at: string
  bettroi_projects?: { name: string }
}

export interface BettroiMilestone {
  id: string
  project_id: string
  name: string
  percentage?: number
  amount?: number
  status: 'pending' | 'invoiced' | 'paid'
  due_date?: string
  notes?: string
  created_at: string
}

export interface BettroiActionItem {
  id: string
  project_id?: string
  description: string
  due_date?: string
  status: 'pending' | 'done'
  created_at: string
}