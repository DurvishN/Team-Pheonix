import { useState } from 'react'
import { Bookmark, FolderOpen, Trash2 } from 'lucide-react'
import { usePlan, useWorkspace } from '../contexts/WorkspaceContext'
import { Confirm, Modal, Spinner } from './UI'
import type { Scenario } from '../lib/planner'
export function SaveScenario({
  onClose,
  rate,
}: {
  onClose: () => void
  rate?: number
}) {
  const [name, setName] = useState(''),
    { save, saving } = useWorkspace()
  return (
    <Modal
      title="Save a scenario"
      subtitle="Keep a named snapshot of your monthly figures and planning rules. Your current plan stays unchanged."
      icon={Bookmark}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (
            await save(
              {
                area: 'scenario',
                name,
                ...(rate === undefined ? {} : { rate }),
              },
              'Scenario saved to your profile.',
              'POST',
            )
          )
            onClose()
        }}
      >
        <div className="form-body">
          <div className="field">
            <label htmlFor="scenario-name">Scenario name</label>
            <input
              id="scenario-name"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Higher savings, quieter winter"
            />
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-light" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving || !name.trim()}>
            {saving ? <Spinner /> : <Bookmark size={15} />}Save scenario
          </button>
        </div>
      </form>
    </Modal>
  )
}
export function ScenarioList() {
  const w = usePlan(),
    { save, saving } = useWorkspace(),
    [confirm, setConfirm] = useState<{
      type: 'load' | 'delete'
      s: Scenario
    } | null>(null)
  return (
    <>
      {w.scenarios.length === 0 ? (
        <div className="scenario-empty">
          <FolderOpen size={24} />
          <div>
            <b>No saved scenarios yet</b>
            <p>Save a version of your plan to compare or revisit later.</p>
          </div>
        </div>
      ) : (
        <div className="scenarios">
          {w.scenarios.map((s) => (
            <div key={s.id} className="scenario-row">
              <span className="metric-icon tint-purple">
                <Bookmark size={16} />
              </span>
              <div>
                <b>{s.name}</b>
                <small>
                  {s.rules.savingsRate}% savings rate ·{' '}
                  {new Date(s.saved_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </small>
              </div>
              <button
                className="btn btn-light btn-small"
                onClick={() => setConfirm({ type: 'load', s })}
              >
                Restore
              </button>
              <button
                className="icon-btn"
                aria-label={`Delete ${s.name}`}
                onClick={() => setConfirm({ type: 'delete', s })}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      {confirm && (
        <Confirm
          title={
            confirm.type === 'load'
              ? 'Restore this scenario?'
              : 'Delete this scenario?'
          }
          description={
            confirm.type === 'load'
              ? `“${confirm.s.name}” will replace the figures and settings in your current plan. Your profile and saved scenarios are kept.`
              : `“${confirm.s.name}” will be permanently removed. Your current plan will not change.`
          }
          action={
            confirm.type === 'load' ? 'Restore scenario' : 'Delete scenario'
          }
          busy={saving}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            if (
              await save(
                {
                  area: confirm.type === 'load' ? 'load-scenario' : 'scenario',
                  id: confirm.s.id,
                },
                confirm.type === 'load'
                  ? 'Scenario restored.'
                  : 'Scenario removed.',
                confirm.type === 'load' ? 'PUT' : 'DELETE',
              )
            )
              setConfirm(null)
          }}
        />
      )}
    </>
  )
}
