import { useState, useRef } from 'react'

const SUPABASE_URL = 'https://bvaefzcsgtgqwftczixb.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2YWVmemNzZ3RncXdmdGN6aXhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY4NTQ4MiwiZXhwIjoyMDg3MjYxNDgyfQ.C3krrdQbECp6CR-_RjPuX6Rogl2m-W7sohRwNFya_Bc'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2YWVmemNzZ3RncXdmdGN6aXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODU0ODIsImV4cCI6MjA4NzI2MTQ4Mn0.Q-AxSMpO6lKogtR_m0j2CvpzdRiDpZiKebR8XCPq1Nc'

const BUCKETS = ['quotation-docs', 'meeting-docs', 'receipts'] as const

interface LogEntry {
  time: string
  method: string
  bucket: string
  status: 'success' | 'error' | 'info'
  message: string
}

export const StorageDebug = () => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [running, setRunning] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedTest, setSelectedTest] = useState<string | null>(null)

  const log = (method: string, bucket: string, status: LogEntry['status'], message: string) => {
    setLogs(prev => [{
      time: new Date().toLocaleTimeString(),
      method,
      bucket,
      status,
      message,
    }, ...prev])
  }

  // Method 1: Raw fetch with service role key
  const testFetchUpload = async (bucket: string, file: File) => {
    const testId = `fetch-${bucket}`
    setRunning(testId)
    const path = `debug-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    log('FETCH', bucket, 'info', `Uploading ${file.name} (${file.size} bytes) to ${bucket}/${path}`)

    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
          'x-upsert': 'true',
        },
        body: file,
      })

      const text = await res.text()
      if (res.ok) {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
        log('FETCH', bucket, 'success', `Upload OK (${res.status}). URL: ${publicUrl}`)
      } else {
        log('FETCH', bucket, 'error', `HTTP ${res.status}: ${text}`)
      }
    } catch (err: any) {
      log('FETCH', bucket, 'error', `Network error: ${err.message}`)
    }
    setRunning(null)
  }

  // Method 2: XMLHttpRequest with service role key
  const testXHRUpload = async (bucket: string, file: File) => {
    const testId = `xhr-${bucket}`
    setRunning(testId)
    const path = `debug-xhr-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    log('XHR', bucket, 'info', `Uploading ${file.name} via XHR to ${bucket}/${path}`)

    return new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`)
      xhr.setRequestHeader('Authorization', `Bearer ${SERVICE_KEY}`)
      xhr.setRequestHeader('apikey', SERVICE_KEY)
      xhr.setRequestHeader('x-upsert', 'true')

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          log('XHR', bucket, 'success', `Upload OK (${xhr.status}): ${xhr.responseText}`)
        } else {
          log('XHR', bucket, 'error', `HTTP ${xhr.status}: ${xhr.responseText}`)
        }
        setRunning(null)
        resolve()
      }

      xhr.onerror = () => {
        log('XHR', bucket, 'error', 'Network error (onerror fired)')
        setRunning(null)
        resolve()
      }

      xhr.send(file)
    })
  }

  // Method 3: Fetch with anon key (should fail — to verify RLS is the issue)
  const testAnonUpload = async (bucket: string, file: File) => {
    const testId = `anon-${bucket}`
    setRunning(testId)
    const path = `debug-anon-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    log('ANON', bucket, 'info', `Testing anon key upload (expected to FAIL) to ${bucket}/${path}`)

    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'apikey': ANON_KEY,
          'x-upsert': 'true',
        },
        body: file,
      })

      const text = await res.text()
      if (res.ok) {
        log('ANON', bucket, 'success', `Anon upload succeeded (unexpected!): ${text}`)
      } else {
        log('ANON', bucket, 'error', `Anon correctly blocked (${res.status}): ${text}`)
      }
    } catch (err: any) {
      log('ANON', bucket, 'error', `Network error: ${err.message}`)
    }
    setRunning(null)
  }

  // Method 4: Fetch with FormData
  const testFormDataUpload = async (bucket: string, file: File) => {
    const testId = `formdata-${bucket}`
    setRunning(testId)
    const path = `debug-fd-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    log('FORMDATA', bucket, 'info', `Uploading via FormData to ${bucket}/${path}`)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
          'x-upsert': 'true',
        },
        body: formData,
      })

      const text = await res.text()
      if (res.ok) {
        log('FORMDATA', bucket, 'success', `FormData upload OK (${res.status}): ${text}`)
      } else {
        log('FORMDATA', bucket, 'error', `HTTP ${res.status}: ${text}`)
      }
    } catch (err: any) {
      log('FORMDATA', bucket, 'error', `Network error: ${err.message}`)
    }
    setRunning(null)
  }

  // Method 5: Test with a tiny generated blob (no real file needed)
  const testBlobUpload = async (bucket: string) => {
    const testId = `blob-${bucket}`
    setRunning(testId)
    const path = `debug-blob-${Date.now()}.txt`
    const blob = new Blob(['Hello from storage debug test!'], { type: 'text/plain' })
    log('BLOB', bucket, 'info', `Uploading generated text blob to ${bucket}/${path}`)

    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
          'x-upsert': 'true',
          'Content-Type': 'text/plain',
        },
        body: blob,
      })

      const text = await res.text()
      if (res.ok) {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
        log('BLOB', bucket, 'success', `Blob upload OK! Verify: ${publicUrl}`)
      } else {
        log('BLOB', bucket, 'error', `HTTP ${res.status}: ${text}`)
      }
    } catch (err: any) {
      log('BLOB', bucket, 'error', `Network error: ${err.message}`)
    }
    setRunning(null)
  }

  // List bucket contents
  const testListBucket = async (bucket: string) => {
    setRunning(`list-${bucket}`)
    log('LIST', bucket, 'info', `Listing files in ${bucket}...`)

    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit: 10, offset: 0, sortBy: { column: 'created_at', order: 'desc' } }),
      })

      const data = await res.json()
      if (res.ok) {
        const files = data.map((f: any) => f.name).join(', ')
        log('LIST', bucket, 'success', `${data.length} files: ${files || '(empty)'}`)
      } else {
        log('LIST', bucket, 'error', `HTTP ${res.status}: ${JSON.stringify(data)}`)
      }
    } catch (err: any) {
      log('LIST', bucket, 'error', `Network error: ${err.message}`)
    }
    setRunning(null)
  }

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedTest) return

    const [method, bucket] = selectedTest.split('-')
    if (method === 'testFetchUpload') testFetchUpload(bucket, file)
    else if (method === 'testXHRUpload') testXHRUpload(bucket, file)
    else if (method === 'testAnonUpload') testAnonUpload(bucket, file)
    else if (method === 'testFormDataUpload') testFormDataUpload(bucket, file)

    e.target.value = ''
    setSelectedTest(null)
  }

  const runAllBlobTests = async () => {
    for (const bucket of BUCKETS) {
      await testBlobUpload(bucket)
    }
  }

  const runAllListTests = async () => {
    for (const bucket of BUCKETS) {
      await testListBucket(bucket)
    }
  }

  const statusColor = (s: LogEntry['status']) =>
    s === 'success' ? 'text-green-400' : s === 'error' ? 'text-red-400' : 'text-blue-400'

  const statusBg = (s: LogEntry['status']) =>
    s === 'success' ? 'bg-green-900/30' : s === 'error' ? 'bg-red-900/30' : 'bg-blue-900/30'

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected} accept=".pdf,.jpg,.jpeg,.png,.docx,.txt" />

      <h1 className="text-2xl font-bold mb-2">Storage Debug Panel</h1>
      <p className="text-gray-400 mb-6 text-sm">Test Supabase storage uploads with different methods. Check console for additional details.</p>

      {/* Quick tests - no file needed */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 text-yellow-400">Quick Tests (no file needed)</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={runAllBlobTests}
            disabled={!!running}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            Test All Buckets (Blob Upload)
          </button>
          <button
            onClick={runAllListTests}
            disabled={!!running}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            List All Buckets
          </button>
          {BUCKETS.map(bucket => (
            <button
              key={`blob-${bucket}`}
              onClick={() => testBlobUpload(bucket)}
              disabled={!!running}
              className="px-3 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              Blob &rarr; {bucket}
            </button>
          ))}
        </div>
      </div>

      {/* File upload tests */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 text-green-400">File Upload Tests (pick a file)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BUCKETS.map(bucket => (
            <div key={bucket} className="border border-gray-700 rounded-xl p-4">
              <h3 className="font-bold text-sm mb-3 text-gray-300">{bucket}</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setSelectedTest(`testFetchUpload-${bucket}`); fileInputRef.current?.click() }}
                  disabled={!!running}
                  className="px-3 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors text-left"
                >
                  Fetch + Service Key
                </button>
                <button
                  onClick={() => { setSelectedTest(`testXHRUpload-${bucket}`); fileInputRef.current?.click() }}
                  disabled={!!running}
                  className="px-3 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors text-left"
                >
                  XHR + Service Key
                </button>
                <button
                  onClick={() => { setSelectedTest(`testFormDataUpload-${bucket}`); fileInputRef.current?.click() }}
                  disabled={!!running}
                  className="px-3 py-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors text-left"
                >
                  FormData + Service Key
                </button>
                <button
                  onClick={() => { setSelectedTest(`testAnonUpload-${bucket}`); fileInputRef.current?.click() }}
                  disabled={!!running}
                  className="px-3 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors text-left"
                >
                  Fetch + Anon Key (expect fail)
                </button>
                <button
                  onClick={() => testListBucket(bucket)}
                  disabled={!!running}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors text-left"
                >
                  List Files
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Log output */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-300">Log Output</h2>
          <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Clear
          </button>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 max-h-96 overflow-y-auto font-mono text-xs space-y-1">
          {logs.length === 0 && <p className="text-gray-600">No tests run yet. Click a button above to start.</p>}
          {logs.map((entry, i) => (
            <div key={i} className={`px-2 py-1 rounded ${statusBg(entry.status)}`}>
              <span className="text-gray-500">[{entry.time}]</span>{' '}
              <span className="text-orange-400 font-bold">[{entry.method}]</span>{' '}
              <span className="text-gray-400">{entry.bucket}</span>{' '}
              <span className={statusColor(entry.status)}>{entry.message}</span>
            </div>
          ))}
        </div>
      </div>

      {running && (
        <div className="fixed bottom-6 right-6 bg-indigo-600 px-4 py-2 rounded-full text-sm font-medium animate-pulse">
          Running: {running}...
        </div>
      )}
    </div>
  )
}
