import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bvaefzcsgtgqwftczixb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2YWVmemNzZ3RncXdmdGN6aXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODU0ODIsImV4cCI6MjA4NzI2MTQ4Mn0.Q-AxSMpO6lKogtR_m0j2CvpzdRiDpZiKebR8XCPq1Nc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'revised'
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