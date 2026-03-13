import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bvaefzcsgtgqwftczixb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2YWVmemNzZ3RncXdmdGN6aXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODU0ODIsImV4cCI6MjA4NzI2MTQ4Mn0.Q-AxSMpO6lKogtR_m0j2CvpzdRiDpZiKebR8XCPq1Nc'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2YWVmemNzZ3RncXdmdGN6aXhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY4NTQ4MiwiZXhwIjoyMDg3MjYxNDgyfQ.C3krrdQbECp6CR-_RjPuX6Rogl2m-W7sohRwNFya_Bc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Upload a file to Supabase Storage using XMLHttpRequest.
 * This completely bypasses the Supabase JS client and any auth session issues.
 * Uses FormData to ensure proper multipart upload handling by browsers.
 */
export function uploadToStorage(bucket: string, filePath: string, file: File | Blob): Promise<{ path: string; publicUrl: string }> {
  return new Promise((resolve, reject) => {
    // Sanitize the file path — remove special chars, keep only safe ones
    const safePath = filePath.replace(/[^a-zA-Z0-9._\-\/]/g, '_')

    const formData = new FormData()
    formData.append('', file) // Supabase expects the file with empty key for object upload

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${bucket}/${safePath}`)
    xhr.setRequestHeader('Authorization', `Bearer ${supabaseServiceKey}`)
    xhr.setRequestHeader('apikey', supabaseServiceKey)
    xhr.setRequestHeader('x-upsert', 'true')

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${safePath}`
        resolve({ path: `${bucket}/${safePath}`, publicUrl })
      } else {
        console.error('[Storage Upload] Failed:', xhr.status, xhr.responseText)
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`))
      }
    }

    xhr.onerror = () => {
      console.error('[Storage Upload] Network error')
      reject(new Error('Upload failed: network error'))
    }

    xhr.send(file) // Send raw file body, not FormData
  })
}

/**
 * Delete files from Supabase Storage.
 */
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
    console.error('[Storage Delete] Failed:', res.status, await res.text().catch(() => ''))
  }
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

export interface QuotationDocument {
  name: string
  url: string
  comment?: string
  uploadedAt: string
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
  documents?: QuotationDocument[]
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