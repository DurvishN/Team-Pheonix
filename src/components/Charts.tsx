import { useEffect, useId, useRef, useState } from 'react'
import { ArrowUpRight, Check, ChevronDown, ShieldCheck } from 'lucide-react'
import { compact, monthName, rupees, type Row } from '../lib/planner'
function useWidth() {
  const ref = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(560)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) =>
      setWidth(Math.max(160, entry.contentRect.width)),
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}
export function Sparkline({
  values,
  color,
}: {
  values: number[]
  color: string
}) {
  const id = useId().replace(/:/g, '')
  const min = Math.min(...values),
    range = Math.max(...values) - min || 1
  const pts = values.map((v, i) => [
    2 + (i * 72) / Math.max(1, values.length - 1),
    25 - ((v - min) / range) * 21,
  ])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ')
  return (
    <svg className="sparkline" viewBox="0 0 76 30" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={color} stopOpacity=".21" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L74,30 L2,30 Z`} fill={`url(#${id})`} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
function niceMax(n: number) {
  if (n <= 0) return 4000
  const power = 10 ** Math.floor(Math.log10(n))
  return Math.ceil(n / (power / 2)) * (power / 2)
}
export function IncomeChart({ rows }: { rows: Row[] }) {
  const [mode, setMode] = useState('Monthly'),
    [hover, setHover] = useState<number | null>(null)
  const { ref, width } = useWidth()
  const data: { label: string; income: number; expenses: number }[] = []
  rows.forEach((r, i) => {
    if (mode === 'Monthly')
      data.push({
        label: monthName(r.month),
        income: r.total,
        expenses: r.expenses,
      })
    else {
      const q = Math.floor(i / 3)
      if (!data[q])
        data[q] = {
          label: `${monthName(r.month)}–${monthName(rows[Math.min(i + 2, rows.length - 1)].month)}`,
          income: 0,
          expenses: 0,
        }
      data[q].income += r.total
      data[q].expenses += r.expenses
    }
  })
  const max = niceMax(
      Math.max(...data.map((d) => Math.max(d.income, d.expenses))) * 1.1,
    ),
    left = 42,
    right = 8,
    top = 8,
    bottom = 28,
    h = 197,
    pw = width - left - right,
    ph = h - top - bottom,
    slot = pw / data.length,
    bw = Math.max(2, Math.min(17, slot * 0.27))
  const active = hover === null ? null : data[hover]
  return (
    <article className="panel chart-card">
      <div className="panel-title">
        <div>
          <h3>Income vs. expenses</h3>
          <p>Your monthly cash flow, side by side.</p>
        </div>
        <label className="select-wrap">
          <select
            aria-label="Cash flow chart frequency"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value)
              setHover(null)
            }}
          >
            <option>Monthly</option>
            <option>Quarterly</option>
          </select>
          <ChevronDown size={12} />
        </label>
      </div>
      <div className="legend">
        <span>
          <i className="legend-income" />
          Income
        </span>
        <span>
          <i className="legend-expenses" />
          Expenses
        </span>
      </div>
      <div className="chart-frame" ref={ref}>
        <svg
          viewBox={`0 0 ${width} ${h}`}
          role="img"
          aria-label={`${mode} income and expense comparison in rupees`}
        >
          <title>Income and expenses for the selected period</title>
          {Array.from({ length: 5 }, (_, i) => {
            const y = top + (ph * i) / 4
            return (
              <g key={i}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y}
                  y2={y}
                  stroke="#e9e7ec"
                  strokeDasharray="3 4"
                />
                <text x={left - 9} y={y + 3.5} textAnchor="end">
                  {compact(max * (1 - i / 4))}
                </text>
              </g>
            )
          })}
          {data.map((d, i) => {
            const x = left + slot * (i + 0.5),
              hi = (d.income / max) * ph,
              he = (d.expenses / max) * ph
            return (
              <g
                key={d.label}
                tabIndex={0}
                className="chart-mark"
                aria-label={`${d.label}: income ${rupees(d.income)}, expenses ${rupees(d.expenses)}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <rect
                  x={x - slot / 2 + 1}
                  y={top}
                  width={Math.max(1, slot - 2)}
                  height={ph + 4}
                  rx="4"
                  fill={hover === i ? '#f5f1fa' : 'transparent'}
                />
                <rect
                  x={x - bw - 1.4}
                  y={top + ph - hi}
                  width={bw}
                  height={hi}
                  rx="2.7"
                  fill="#9872cb"
                />
                <rect
                  x={x + 1.4}
                  y={top + ph - he}
                  width={bw}
                  height={he}
                  rx="2.7"
                  fill="#eac28c"
                />
                <text x={x} y={h - 7} textAnchor="middle">
                  {d.label}
                </text>
              </g>
            )
          })}
        </svg>
        {active && (
          <div
            className="chart-tip"
            style={{
              left: Math.max(
                0,
                Math.min(width - 143, left + slot * (hover! + 0.5) - 65),
              ),
              top: 5,
            }}
          >
            <b>{active.label}</b>
            <span>
              Income <strong>{rupees(active.income)}</strong>
            </span>
            <span>
              Expenses <strong>{rupees(active.expenses)}</strong>
            </span>
          </div>
        )}
      </div>
    </article>
  )
}
export function BufferCard({
  balance,
  target,
  onOpen,
}: {
  balance: number
  target: number
  onOpen: () => void
}) {
  const percent = Math.min(100, Math.round((balance / target) * 100)),
    id = useId().replace(/:/g, '')
  return (
    <article className="panel buffer-card">
      <div className="panel-title">
        <div>
          <h3>Buffer progress</h3>
          <p>Your safety net at a glance.</p>
        </div>
        <button
          className="icon-btn subtle"
          aria-label="Explore buffer insights"
          onClick={onOpen}
        >
          <ArrowUpRight size={17} />
        </button>
      </div>
      <div className="gauge">
        <svg
          viewBox="0 0 250 129"
          role="img"
          aria-label={`${percent}% of savings buffer target funded`}
        >
          <defs>
            <linearGradient id={id}>
              <stop stopColor="#7551b2" />
              <stop offset="1" stopColor="#b395dc" />
            </linearGradient>
          </defs>
          <path
            d="M22 111 A103 103 0 0 1 228 111"
            fill="none"
            stroke="#efeaf5"
            strokeWidth="17"
            strokeLinecap="round"
          />
          <path
            d="M22 111 A103 103 0 0 1 228 111"
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth="17"
            pathLength="100"
            strokeDasharray={`${percent} 100`}
            strokeLinecap="round"
          />
          {Array.from({ length: 25 }, (_, i) => {
            const a = Math.PI + (i * Math.PI) / 24
            return (
              <line
                key={i}
                x1={125 + Math.cos(a) * 87}
                x2={125 + Math.cos(a) * (i % 4 === 0 ? 81 : 84)}
                y1={111 + Math.sin(a) * 87}
                y2={111 + Math.sin(a) * (i % 4 === 0 ? 81 : 84)}
                stroke="#d8d2df"
                strokeWidth="1.5"
              />
            )
          })}
        </svg>
        <div className="gauge-value">
          <ShieldCheck size={20} />
          <strong>
            {percent}
            <small>%</small>
          </strong>
          <span>of target funded</span>
        </div>
      </div>
      <div className="buffer-numbers">
        <div>
          <span>Projected buffer</span>
          <strong>{rupees(balance)}</strong>
        </div>
        <div>
          <span>Target buffer</span>
          <strong>{rupees(target)}</strong>
        </div>
      </div>
      <div className={`buffer-note ${percent < 100 ? 'in-progress' : ''}`}>
        {percent >= 100 ? <Check size={14} /> : <ShieldCheck size={14} />}{' '}
        {percent >= 100
          ? 'Your buffer target is fully funded.'
          : `${rupees(target - balance)} left to reach your target.`}
      </div>
    </article>
  )
}
export function BalanceChart({
  rows,
  baseline,
  safety,
  title = 'Savings buffer growth',
}: {
  rows: Row[]
  baseline?: Row[]
  safety: number
  title?: string
}) {
  const { ref, width } = useWidth(),
    [hover, setHover] = useState<number | null>(null),
    id = useId().replace(/:/g, '')
  const h = 212,
    l = 48,
    r = 12,
    t = 13,
    b = 29,
    pw = width - l - r,
    ph = h - t - b,
    max = niceMax(
      Math.max(
        safety,
        ...rows.map((r) => r.after),
        ...(baseline?.map((r) => r.after) || []),
      ) * 1.08,
    )
  const x = (i: number) => l + (i * pw) / (rows.length - 1),
    y = (v: number) => t + ph - (v / max) * ph
  const path = (list: Row[]) =>
    list.map((row, i) => `${i ? 'L' : 'M'}${x(i)},${y(row.after)}`).join(' ')
  return (
    <article className="panel chart-card wide-chart">
      <div className="panel-title">
        <div>
          <h3>{title}</h3>
          <p>Projected closing balance after each month.</p>
        </div>
      </div>
      <div className="legend">
        <span>
          <i className="legend-income" />
          {baseline ? 'Your plan' : 'Buffer balance'}
        </span>
        {baseline && (
          <span>
            <i className="legend-expenses" />
            Without a plan
          </span>
        )}
        <span>
          <i className="legend-safety" />
          Safety line
        </span>
      </div>
      <div ref={ref} className="chart-frame">
        <svg viewBox={`0 0 ${width} ${h}`} role="img" aria-label={title}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#a887d6" stopOpacity=".27" />
              <stop offset="1" stopColor="#a887d6" stopOpacity=".015" />
            </linearGradient>
          </defs>
          {Array.from({ length: 5 }, (_, i) => (
            <g key={i}>
              <line
                x1={l}
                x2={width - r}
                y1={t + (ph * i) / 4}
                y2={t + (ph * i) / 4}
                stroke="#e6e3eb"
                strokeDasharray="3 4"
              />
              <text x={l - 9} y={t + (ph * i) / 4 + 4} textAnchor="end">
                {compact(max * (1 - i / 4))}
              </text>
            </g>
          ))}
          <path
            d={`${path(rows)} L${x(rows.length - 1)},${y(0)} L${l},${y(0)} Z`}
            fill={`url(#${id})`}
          />
          <line
            x1={l}
            x2={width - r}
            y1={y(safety)}
            y2={y(safety)}
            stroke="#bf944e"
            strokeDasharray="5 4"
          />
          {baseline && (
            <path
              d={path(baseline)}
              fill="none"
              stroke="#dcad72"
              strokeWidth="2.5"
            />
          )}
          <path
            d={path(rows)}
            fill="none"
            stroke="#8d65bd"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {rows.map((row, i) => (
            <g
              key={row.month}
              tabIndex={0}
              aria-label={`${monthName(row.month)} closing balance ${rupees(row.after)}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              <circle
                cx={x(i)}
                cy={y(row.after)}
                r={hover === i ? 5 : 3}
                fill="white"
                stroke="#8d65bd"
                strokeWidth="2"
              />
              <rect
                x={x(i) - pw / rows.length / 2}
                y="0"
                width={pw / rows.length}
                height={h}
                fill="transparent"
              />
              <text x={x(i)} y={h - 5} textAnchor="middle">
                {monthName(row.month)}
              </text>
            </g>
          ))}
        </svg>
        {hover !== null && (
          <div
            className="chart-tip"
            style={{
              left: Math.max(0, Math.min(width - 150, x(hover) - 70)),
              top: 4,
            }}
          >
            <b>{monthName(rows[hover].month, true)}</b>
            <span>
              Your buffer <strong>{rupees(rows[hover].after)}</strong>
            </span>
            {baseline && (
              <span>
                Without plan <strong>{rupees(baseline[hover].after)}</strong>
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
