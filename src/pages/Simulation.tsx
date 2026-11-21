import { useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BookmarkPlus,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react'
import { usePlan } from '../contexts/WorkspaceContext'
import { calculate, monthName, rupees, sum } from '../lib/planner'
import { BalanceChart } from '../components/Charts'
import { PageHeader, RangeField, Status } from '../components/UI'
import { SaveScenario } from '../components/Scenarios'
export default function Simulation() {
  const w = usePlan(),
    [rate, setRate] = useState(w.rules.savingsRate),
    [saveOpen, setSaveOpen] = useState(false)
  const rows = calculate(
      w.months,
      w.rules,
      rate === w.rules.savingsRate ? undefined : rate,
    ),
    baseline = calculate(w.months, w.rules, 10),
    borrow = sum(rows, 'borrowing'),
    avoided = Math.max(0, sum(baseline, 'borrowing') - borrow)
  return (
    <>
      <PageHeader
        title="Simulation"
        description="The same year. Two different saving habits."
      >
        <button className="btn btn-light" onClick={() => setSaveOpen(true)}>
          <BookmarkPlus size={15} />
          Save scenario
        </button>
      </PageHeader>
      <section className="panel simulation-control">
        <div>
          <span className="eyebrow">
            <FlaskConical size={13} />
            WHAT-IF LAB
          </span>
          <h2>Find your savings sweet spot.</h2>
          <p>
            Adjust your savings rate to see the impact. Your saved plan won’t
            change.
          </p>
        </div>
        <RangeField
          label="Simulated savings rate"
          value={rate}
          onChange={setRate}
          help="Share of good-month surplus set aside"
        />
      </section>
      <div className="simulation-grid">
        {[
          {
            title: 'Without a plan',
            list: baseline,
            r: 10,
            tone: 'warm',
            icon: ArrowDownRight,
          },
          {
            title: 'With your plan',
            list: rows,
            r: rate,
            tone: 'violet',
            icon: ArrowUpRight,
          },
        ].map(({ title, list, r, tone, icon: Icon }) => (
          <section
            className={`panel comparison comparison-${tone}`}
            key={title}
          >
            <div className="panel-title">
              <h3>{title}</h3>
              <span className="comparison-icon">
                <Icon size={20} />
              </span>
            </div>
            <p>Saving {r}% of each good month’s surplus</p>
            <span className="overline">YEAR-END BUFFER</span>
            <strong className="comparison-value">
              {rupees(list[list.length - 1].after)}
            </strong>
            <div className="comparison-details">
              <div>
                <span>Borrowing required</span>
                <b>{rupees(sum(list, 'borrowing'))}</b>
              </div>
              <div>
                <span>Months below safety line</span>
                <b>
                  {list.filter((x) => x.after < w.rules.safetyLine).length} of
                  12
                </b>
              </div>
            </div>
          </section>
        ))}
      </div>
      <div className={`result-banner ${borrow ? 'warning' : ''}`}>
        <ShieldCheck size={21} />
        <div>
          <b>
            {borrow
              ? 'Your buffer needs a little more support.'
              : 'Your plan covers every lean month.'}
          </b>
          <p>
            {borrow
              ? `This scenario leaves ${rupees(borrow)} in uncovered expenses.`
              : `Saving ${rate}% avoids ${rupees(avoided)} in borrowing compared with the 10% baseline.`}
          </p>
        </div>
      </div>
      <BalanceChart
        rows={rows}
        baseline={baseline}
        safety={w.rules.safetyLine}
        title="Buffer balance comparison"
      />
      <section className="panel">
        <div className="panel-title padded">
          <div>
            <h3>Month-by-month comparison</h3>
            <p>Closing balances and contributions in both scenarios.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Without a plan</th>
                <th>With your plan</th>
                <th>Saved</th>
                <th>Withdrawn</th>
                <th>Outlook</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.month}>
                  <td className="table-month">
                    {monthName(r.month, true, true)}
                  </td>
                  <td>{rupees(baseline[i].after)}</td>
                  <td className="text-purple semibold">{rupees(r.after)}</td>
                  <td>{rupees(r.saved)}</td>
                  <td>{rupees(r.withdrawal)}</td>
                  <td>
                    <Status lean={r.lean} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <details className="panel explanation">
        <summary>How the simulation works</summary>
        <p>
          Surplus is total income minus expenses. In good months, your chosen
          share of the surplus is saved. In lean months, savings cover the
          deficit; only the remaining gap counts as borrowing. Both scenarios
          begin with {rupees(w.rules.startingBuffer)}. The{' '}
          {rupees(w.rules.safetyLine)} safety line is a warning, not a
          withdrawal limit. At your saved rate, custom monthly contributions are
          respected. Other rates use automatic contributions.
        </p>
      </details>
      {saveOpen && (
        <SaveScenario
          rate={rate === w.rules.savingsRate ? undefined : rate}
          onClose={() => setSaveOpen(false)}
        />
      )}
    </>
  )
}
