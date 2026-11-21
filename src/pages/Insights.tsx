import { useState } from 'react'
import {
  CalendarRange,
  Check,
  CircleAlert,
  Flag,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  Umbrella,
} from 'lucide-react'
import { usePlan, useWorkspace } from '../contexts/WorkspaceContext'
import {
  calculate,
  monthName,
  recommendation,
  requiredBuffer,
  rupees,
  sum,
  type Page,
} from '../lib/planner'
import { BalanceChart } from '../components/Charts'
import {
  PageHeader,
  RangeField,
  SectionTitle,
  Spinner,
  Status,
  TextLink,
} from '../components/UI'
import { Metric } from './Dashboard'
export default function Insights({
  navigate,
}: {
  navigate: (p: Page) => void
}) {
  const w = usePlan(),
    { save, saving } = useWorkspace(),
    [stress, setStress] = useState(w.rules.stress),
    [showAll, setShowAll] = useState(false)
  const rows = calculate(w.months, w.rules),
    highest = rows.reduce((a, b) => (a.total > b.total ? a : b)),
    lowest = rows.reduce((a, b) => (a.total < b.total ? a : b)),
    lean = rows.filter((r) => r.lean),
    shortfall = sum(rows, 'borrowing'),
    stressed = calculate(w.months, w.rules, undefined, stress),
    recs = showAll ? rows : [...new Set([highest, lean[0] || rows[0], lowest])]
  return (
    <>
      <PageHeader
        title="Insights"
        description="A closer look at the story behind your numbers."
      >
        <button className="btn btn-light" onClick={() => navigate('settings')}>
          <SlidersHorizontal size={15} />
          Plan settings
        </button>
      </PageHeader>
      <section className={`insights-banner ${shortfall ? 'warning' : ''}`}>
        <span className="insight-shield">
          {shortfall ? <CircleAlert size={27} /> : <ShieldCheck size={27} />}
        </span>
        <div>
          <span className="eyebrow">YOUR YEARLY OUTLOOK</span>
          <h2>
            {shortfall
              ? 'A few months need extra cover.'
              : 'A loan-free year is within reach.'}
          </h2>
          <p>
            {shortfall
              ? `Your current plan leaves ${rupees(shortfall)} uncovered. Review the lean months below.`
              : `Your buffer covers all ${lean.length} lean months and finishes the year at ${rupees(rows[rows.length - 1].after)}.`}
          </p>
        </div>
      </section>
      <div className="metrics-grid insight-metrics">
        <Metric
          label="Strongest month"
          value={monthName(highest.month, true)}
          note={`${rupees(highest.total)} total income`}
          icon={TrendingUp}
          tone="purple"
        />
        <Metric
          label="Quietest month"
          value={monthName(lowest.month, true)}
          note={`${rupees(lowest.total)} total income`}
          icon={CalendarRange}
          tone="peach"
        />
        <Metric
          label="Buffer needed"
          value={rupees(requiredBuffer(rows))}
          note="Longest run of deficits"
          icon={Umbrella}
          tone="mint"
        />
        <Metric
          label="Annual surplus"
          value={rupees(sum(rows, 'surplus'))}
          note="Income less expenses"
          icon={Flag}
          tone="blue"
        />
      </div>
      <BalanceChart rows={rows} safety={w.rules.safetyLine} />
      <section className="panel stress-card">
        <div className="panel-title">
          <div>
            <span className="eyebrow">PLAN RESILIENCE</span>
            <h3>What if income falls?</h3>
            <p>
              Test a reduction in every month’s earnings without changing your
              plan.
            </p>
          </div>
        </div>
        <RangeField
          label="Income reduction"
          value={stress}
          onChange={setStress}
          help="A what-if scenario, not an income forecast."
        />
        <div className="stress-values">
          <div>
            <span>Stressed annual income</span>
            <b>{rupees(sum(stressed, 'total'))}</b>
          </div>
          <div>
            <span>Lowest buffer balance</span>
            <b>
              {rupees(
                Math.min(
                  w.rules.startingBuffer,
                  ...stressed.map((r) => r.after),
                ),
              )}
            </b>
          </div>
          <div>
            <span>Borrowing required</span>
            <b>{rupees(sum(stressed, 'borrowing'))}</b>
          </div>
        </div>
        <div className="stress-bottom">
          <span>
            {sum(stressed, 'borrowing')
              ? 'This scenario leaves a gap in your buffer.'
              : 'Your buffer still covers the lean months.'}
          </span>
          <button
            className="btn btn-light btn-small"
            disabled={saving || stress === w.rules.stress}
            onClick={() =>
              save({ area: 'stress', stress }, 'Stress-test assumption saved.')
            }
          >
            {saving ? <Spinner /> : <Check size={13} />}Save assumption
          </button>
        </div>
      </section>
      <SectionTitle title="Monthly recommendations">
        <TextLink onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show highlights' : 'See all 12 months'}
        </TextLink>
      </SectionTitle>
      <div className="recommendation-grid">
        {recs.map((r) => (
          <article className="panel recommendation" key={r.month}>
            <Status lean={r.lean} />
            <h3>{monthName(r.month, true, true)}</h3>
            <p>{recommendation(r, w.rules.target)}</p>
          </article>
        ))}
      </div>
    </>
  )
}
