import { useState } from 'react'
import { BookmarkPlus, Check, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { usePlan, useWorkspace } from '../contexts/WorkspaceContext'
import {
  Confirm,
  MoneyField,
  PageHeader,
  RangeField,
  Spinner,
} from '../components/UI'
import { SaveScenario, ScenarioList } from '../components/Scenarios'
import type { Rules } from '../lib/planner'
function RulesForm() {
  const w = usePlan(),
    { save, saving } = useWorkspace(),
    [r, setR] = useState<Rules>({ ...w.rules }),
    [reset, setReset] = useState(false)
  const dirty = JSON.stringify(r) !== JSON.stringify(w.rules),
    field = (k: keyof Rules, v: number) => setR((o) => ({ ...o, [k]: v }))
  return (
    <section className="panel rules-panel">
      <div className="panel-title">
        <div>
          <span className="eyebrow">
            <SlidersHorizontal size={12} />
            PLANNING PREFERENCES
          </span>
          <h3>Financial rules</h3>
          <p>Set the assumptions that guide your monthly plan.</p>
        </div>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await save({ area: 'rules', rules: r }, 'Planning rules updated.')
        }}
      >
        <div className="settings-form">
          <div className="form-grid">
            <MoneyField
              label="Monthly fixed expenses"
              value={r.monthlyExpenses}
              onChange={(v) => field('monthlyExpenses', v)}
              hint="Updates months that use your previous default."
            />
            <MoneyField
              label="Starting savings"
              value={r.startingBuffer}
              onChange={(v) => field('startingBuffer', v)}
              hint="Your balance at the start of the planning year."
            />
            <MoneyField
              label="Savings buffer target"
              min={1}
              value={r.target}
              onChange={(v) => field('target', v)}
              hint="The safety net you are working toward."
            />
            <MoneyField
              label="Minimum safety line"
              value={r.safetyLine}
              onChange={(v) => field('safetyLine', v)}
              hint="Balances below this level are flagged as a risk."
            />
          </div>
          <div className="form-grid ranges">
            <RangeField
              label="Savings rate"
              value={r.savingsRate}
              onChange={(v) => field('savingsRate', v)}
              help="Share of each positive monthly surplus to save."
            />
            <RangeField
              label="Income stress reduction"
              value={r.stress}
              onChange={(v) => field('stress', v)}
              help="Used only for the stress test in Insights."
            />
          </div>
          <p className="form-hint">
            Applying rules recalculates automatic contributions and clears
            manual savings overrides. Income edits and monthly notes are kept.
          </p>
        </div>
        <div className="settings-actions">
          <button
            className="btn btn-text"
            type="button"
            onClick={() => setReset(true)}
          >
            <RotateCcw size={14} />
            Reset to defaults
          </button>
          <button className="btn btn-primary" disabled={saving || !dirty}>
            {saving ? <Spinner /> : <Check size={15} />}Apply changes
          </button>
        </div>
      </form>
      {reset && (
        <Confirm
          title="Reset your financial plan?"
          description="This restores the original monthly figures and rules, including monthly notes. Your profile and saved scenarios stay safe. Save a scenario first if you want to keep your current plan."
          action="Reset plan"
          onCancel={() => setReset(false)}
          busy={saving}
          onConfirm={async () => {
            if (
              await save(
                { area: 'reset' },
                'Default planning figures restored.',
              )
            )
              setReset(false)
          }}
        />
      )}
    </section>
  )
}
export default function Settings() {
  const w = usePlan(),
    [open, setOpen] = useState(false)
  return (
    <>
      <PageHeader
        title="Settings"
        description="A financial plan that works the way you do."
      />
      <RulesForm key={w.revision} />
      <section className="panel saved-section">
        <div className="panel-title">
          <div>
            <h3>Saved scenarios</h3>
            <p>Personal what-if plans, safely stored in your workspace.</p>
          </div>
          <button
            className="btn btn-light btn-small"
            onClick={() => setOpen(true)}
          >
            <BookmarkPlus size={14} />
            Save scenario
          </button>
        </div>
        <ScenarioList />
      </section>
      <details className="panel explanation">
        <summary>Assumptions & limitations</summary>
        <p>
          The starter plan uses illustrative income for Ravi, a fictional
          delivery partner in Bengaluru. It does not use bank or
          delivery-platform data. Projections exclude tax, interest, inflation,
          and unexpected costs. These educational estimates are not financial
          advice.
        </p>
      </details>
      {open && <SaveScenario onClose={() => setOpen(false)} />}
    </>
  )
}
