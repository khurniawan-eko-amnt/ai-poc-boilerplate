// ─── Equipment Form Page (Add/Edit) ──────────────────────
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { supabase } from '../services/supabase'

export function EquipmentFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    vin: '',
    fleet_number: '',
    model: '',
    year: '',
    hours: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vin.trim()) {
      setError('VIN is required')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        vin: form.vin.trim(),
        fleet_number: form.fleet_number.trim() || null,
        model: form.model.trim() || null,
        year: form.year ? parseInt(form.year, 10) : null,
        hours: form.hours ? parseFloat(form.hours) : 0,
        notes: form.notes.trim() || null,
      }

      const { error: err } = await supabase.from('equipment').insert(payload)
      if (err) throw err

      navigate('/equipment')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save equipment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/equipment')}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? 'Edit Equipment' : 'Add Equipment'}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isEdit ? 'Update equipment details' : 'Register a new piece of equipment'}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-5">
        {/* VIN */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            VIN <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={form.vin}
            onChange={(e) => update('vin', e.target.value)}
            placeholder="Vehicle Identification Number"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        {/* Fleet Number */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Fleet Number</label>
          <input
            type="text"
            value={form.fleet_number}
            onChange={(e) => update('fleet_number', e.target.value)}
            placeholder="e.g. FL-001"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Model</label>
          <input
            type="text"
            value={form.model}
            onChange={(e) => update('model', e.target.value)}
            placeholder="e.g. D7E Dozer"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        {/* Year & Hours side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Year</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => update('year', e.target.value)}
              placeholder="2024"
              min="1900"
              max="2099"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Hours</label>
            <input
              type="number"
              value={form.hours}
              onChange={(e) => update('hours', e.target.value)}
              placeholder="0"
              min="0"
              step="0.1"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Any additional notes..."
            rows={3}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Equipment'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/equipment')}
            className="px-4 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}