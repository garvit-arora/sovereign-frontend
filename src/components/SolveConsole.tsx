import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { useState, useEffect } from 'react'

import { api, type ModelEntry, type SolveResponse } from '@/lib/api'
import { Card } from '@/components/ui'
import { cn } from '@/lib/cn'

type Tab = 'example' | 'paste' | 'file'

const ALGORITHMS = [
  { value: '', label: 'Auto' },
  { value: 'simplex', label: 'Simplex' },
  { value: 'interior_point', label: 'Interior Point' },
]

export function SolveConsole() {
  const [tab, setTab] = useState<Tab>('example')
  const [models, setModels] = useState<ModelEntry[]>([])
  const [picked, setPicked] = useState('')
  const [pastedModel, setPastedModel] = useState('')
  const [algorithm, setAlgorithm] = useState('')
  const [threads, setThreads] = useState(1)
  const [device, setDevice] = useState<'cpu' | 'cuda'>('cpu')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SolveResponse | null>(null)

  useEffect(() => {
    api.models().then((data) => setModels(data.models)).catch(console.error)
  }, [])

  const handleSubmit = async () => {
    setBusy(true)
    setError('')
    setResult(null)

    try {
      let body: any = {}

      if (tab === 'example' && picked) {
        body.modelPath = picked
      } else if (tab === 'paste') {
        body.modelJson = pastedModel
      }

      const response = await api.submitJob({
        ...body,
        algorithm: algorithm || null,
        threads,
        device,
      })

      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const status = await api.job(response.jobId)
          if (status.state === 'COMPLETED' || status.state === 'FAILED') {
            clearInterval(poll)
            setResult(status)
            setBusy(false)
          }
        } catch (e) {
          clearInterval(poll)
          setError((e as Error).message)
          setBusy(false)
        }
      }, 1000)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="p-6 bg-gray-800 border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-white">Solve Optimization Problem</h2>

        {/* Input Tabs */}
        <div className="flex gap-2 mb-4">
          {(['example', 'paste', 'file'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 rounded font-medium',
                tab === t ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              )}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Example Models */}
        {tab === 'example' && (
          <div className="space-y-4">
            <select
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
              className="w-full p-2 border border-gray-600 rounded bg-gray-900 text-white"
            >
              <option value="">Select a model...</option>
              {models.map((m) => (
                <option key={m.name} value={m.path}>
                  {m.name} ({m.format})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Paste Model */}
        {tab === 'paste' && (
          <div className="space-y-4">
            <textarea
              value={pastedModel}
              onChange={(e) => setPastedModel(e.target.value)}
              placeholder="Paste your model JSON here..."
              className="w-full h-64 p-3 border border-gray-600 rounded bg-gray-900 text-white font-mono text-sm"
            />
          </div>
        )}

        {/* File Upload */}
        {tab === 'file' && (
          <div className="space-y-4">
            <input
              type="file"
              accept=".json,.mps"
              className="w-full p-2 border border-gray-600 rounded bg-gray-900 text-white"
            />
          </div>
        )}

        {/* Solver Options */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Algorithm</label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              className="w-full p-2 border border-gray-600 rounded bg-gray-900 text-white"
            >
              {ALGORITHMS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Device</label>
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value as 'cpu' | 'cuda')}
              className="w-full p-2 border border-gray-600 rounded bg-gray-900 text-white"
            >
              <option value="cpu">CPU</option>
              <option value="cuda">GPU (CUDA)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Threads</label>
            <input
              type="number"
              min="1"
              max="64"
              value={threads}
              onChange={(e) => setThreads(Math.max(1, Number(e.target.value) || 1))}
              className="w-full p-2 border border-gray-600 rounded bg-gray-900 text-white"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={busy}
          className="w-full mt-6 bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Solving...' : 'Solve'}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-900 border border-red-700 rounded text-red-200">
            {error}
          </div>
        )}
      </Card>

      {/* Results */}
      {result && (
        <Card className="p-6 bg-gray-800 border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-white">Results</h3>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {result.state === 'COMPLETED' ? (
                <CheckCircle2 className="text-green-400" />
              ) : (
                <XCircle className="text-red-400" />
              )}
              <span className="font-medium text-white">{result.state}</span>
            </div>

            {result.objective !== undefined && (
              <div>
                <span className="text-sm text-gray-400">Objective:</span>
                <span className="ml-2 font-mono text-white">{result.objective.toFixed(6)}</span>
              </div>
            )}

            {result.runtime_seconds && (
              <div>
                <span className="text-sm text-gray-400">Runtime:</span>
                <span className="ml-2 text-white">{result.runtime_seconds.toFixed(2)}s</span>
              </div>
            )}

            {result.solution && (
              <div>
                <h4 className="font-medium mb-2 text-white">Solution</h4>
                <div className="bg-gray-900 p-3 rounded font-mono text-sm max-h-64 overflow-auto text-gray-200">
                  {Object.entries(result.solution).map(([key, value]) => (
                    <div key={key}>
                      {key}: {Number(value).toFixed(6)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.verification && (
              <div className="flex items-center gap-2 mt-4">
                {result.verification.is_valid ? (
                  <CheckCircle2 className="text-green-400" />
                ) : (
                  <AlertTriangle className="text-yellow-400" />
                )}
                <span className="text-white">
                  {result.verification.is_valid ? 'Verified' : 'Verification failed'}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
