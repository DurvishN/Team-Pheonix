import { useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  Check,
  Pencil,
  RotateCw,
  SlidersHorizontal,
} from 'lucide-react'
import {
  calculate,
  monthName,
  period,
  rupees,
  sum,
  type Row,
  type Month,
} from '../lib/planner'
import { usePlan, useWorkspace } from '../contexts/WorkspaceContext'
import {
  Confirm,
  Modal,
  MoneyField,
  PageHeader,
  Spinner,
  Status,
} from '../components/UI'
function MonthEditor({ row, onClose }: { row: Row; onClose: () => void }) {
  const w = usePlan(),
    { save, saving } = useWorkspace()
  const [m, setM] = useState<Month>({ ...w.months[row.index] }),
    [manual, setManual] = useState(m.savings !== null)
  const surplus = (m.income || 0) + (m.extra || 0) - (m.expenses || 0),
    auto = Math.round((Math.max(0, surplus) * w.rules.savingsRate) / 100)
  const field = (k: keyof Month, v: number | string | null) =>
    setM((p) => ({ ...p, [k]: v }))
  const result = calculate(
    w.months.map((x, i) =>
      i === row.index ? { ...m, savings: manual ? m.savings : null } : x,
    ),
    w.rules,
  )[row.index]
  return (
    <Modal
      title={`Edit ${monthName(row.month, true, true)}`}
      subtitle="Adjust this month’s figures. The rest of your plan recalculates automatically."
      icon={CalendarDays}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (
            await save(
              {
                area: 'month',
                index: row.index,
                month: { ...m, savings: manual ? m.savings : null },
              },
              'Monthly plan saved.',
            )
          )
            onClose()
        }}
      >
        <div className="form-body">
          <div className="form-grid">
            <MoneyField
              label="Expected income"
              value={m.income}
              onChange={(v) => field('income', v)}
            />
            <MoneyField
              label="Additional income"
              value={m.extra}
              onChange={(v) => field('extra', v)}
            />
            <MoneyField
              label="Monthly expenses"
              value={m.expenses}
              onChange={(v) => field('expenses', v)}
            />
            <div className="field">
              <label>Automatic contribution</label>
              <div className="readonly-input">
                {rupees(auto)}
                <span>{w.rules.savingsRate}%</span>
              </div>
            </div>
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={manual}
              onChange={(e) => {
                setManual(e.target.checked)
                field('savings', e.target.checked ? auto : null)
              }}
            />
            Set a custom savings contribution
          </label>
          {manual && (
            <MoneyField
              label="Custom contribution"
              value={m.savings ?? 0}
              max={Math.max(0, surplus)}
              onChange={(v) => field('savings', v)}
              hint={`Available surplus: ${rupees(Math.max(0, surplus))}`}
            />
          )}
          <div className="field">
            <label htmlFor="month-note">
              Monthly note <span>Optional</span>
            </label>
            <textarea
              id="month-note"
              maxLength={1000}
              rows={2}
              value={m.note}
              onChange={(e) => field('note', e.target.value)}
              placeholder="A seasonal expense or a goal for this month…"
            />
          </div>
          <div className="preview-box">
            <div>
              <span>Net surplus</span>
              <strong>{rupees(surplus)}</strong>
            </div>
            <ArrowRight size={17} />
            <div>
              <span>Projected closing buffer</span>
              <strong>
                {rupees(Number.isFinite(result.after) ? result.after : 0)}
              </strong>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-light" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner /> : <Check size={15} />}Save month
          </button>
        </div>
      </form>
    </Modal>
  )
}
export default function Planner() {
  const w = usePlan(),
    { save, saving } = useWorkspace(),
    [filter, setFilter] = useState('All months'),
    [edit, setEdit] = useState<Row | null>(null),
    [sync, setSync] = useState(false)
  const rows = calculate(w.months, w.rules),
    visible = rows.filter(
      (r) =>
        filter === 'All months' ||
        (filter === 'Lean months' ? r.lean : !r.lean),
    )
  return (
    <>
      <PageHeader
        title="Monthly planner"
        description="Shape your year, one month at a time."
      >
        <button className="btn btn-light" onClick={() => setSync(true)}>
          <RotateCw size={15} />
          Sync savings rate
        </button>
      </PageHeader>
      <div className="plan-summary">
        <div className="summary-emblem">
          <CalendarDays size={28} />
        </div>
        <div className="plan-period">
          <span className="eyebrow">YOUR PLANNING YEAR</span>
          <h2>{period(w.months)}</h2>
        </div>
        <div>
          <span>Annual surplus</span>
          <strong>{rupees(sum(rows, 'surplus'))}</strong>
        </div>
        <div>
          <span>Saved this year</span>
          <strong>{rupees(sum(rows, 'saved'))}</strong>
        </div>
        <div>
          <span>Lean months</span>
          <strong>
            {rows.filter((r) => r.lean).length}
            <small> / 12</small>
          </strong>
        </div>
      </div>
      <section className="panel planner-table">
        <div className="panel-title">
          <div>
            <h3>Your monthly plan</h3>
            <p>
              Select a month to edit its income, expenses, and contributions.
            </p>
          </div>
          <SlidersHorizontal size={18} className="muted" />
        </div>
        <div className="filter-tabs">
          {['All months', 'Good months', 'Lean months'].map((f) => (
            <button
              key={f}
              className={f === filter ? 'active' : ''}
              onClick={() => setFilter(f)}
            >
              {f}
              <span>
                {f === 'All months'
                  ? rows.length
                  : rows.filter((r) => (f === 'Lean months' ? r.lean : !r.lean))
                      .length}
              </span>
            </button>
          ))}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Income</th>
                <th>Expenses</th>
                <th>Saved / used</th>
                <th>Closing buffer</th>
                <th>Outlook</th>
                <th>
                  <span className="sr-only">Edit month</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.month}>
                  <td>
                    <button className="month-button" onClick={() => setEdit(r)}>
                      {monthName(r.month, true)}{' '}
                      <small>{r.month.slice(0, 4)}</small>
                    </button>
                  </td>
                  <td>{rupees(r.total)}</td>
                  <td>{rupees(r.expenses)}</td>
                  <td className={r.lean ? 'text-amber' : 'text-purple'}>
                    {r.lean ? '−' : '+'}
                    {rupees(r.lean ? r.withdrawal : r.saved)}
                  </td>
                  <td className="semibold">{rupees(r.after)}</td>
                  <td>
                    <Status lean={r.lean} />
                  </td>
                  <td>
                    <button
                      className="icon-btn"
                      aria-label={`Edit ${monthName(r.month, true, true)}`}
                      onClick={() => setEdit(r)}
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="empty-state">
              No {filter.toLowerCase()} in your current plan.
            </div>
          )}
        </div>
        <div className="table-foot">
          <ShieldNote />
          Contributions follow your {w.rules.savingsRate}% savings rate unless
          you set a custom amount.
        </div>
      </section>
      {edit && <MonthEditor row={edit} onClose={() => setEdit(null)} />}{' '}
      {sync && (
        <Confirm
          title="Sync all savings contributions?"
          description={`All 12 months will use your ${w.rules.savingsRate}% savings rate. This replaces custom contributions but keeps your income, expenses, and notes.`}
          action="Sync contributions"
          busy={saving}
          onCancel={() => setSync(false)}
          onConfirm={async () => {
            if (
              await save(
                { area: 'sync' },
                'All months now follow your savings rate.',
              )
            )
              setSync(false)
          }}
        />
      )}
    </>
  )
}
function ShieldNote() {
  return <Check size={15} />
}
