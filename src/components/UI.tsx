import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  Check,
  LoaderCircle,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { Profile } from '../lib/planner'
export function Brand() {
  return (
    <div className="brand">
      <svg
        width="39"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <rect width="40" height="40" rx="11" fill="#7451b6" />
        <path d="M9 24.5 15 21v10l-6-3.5z" fill="#d9c8f2" />
        <path d="m17 17 6-3.5V31l-6-3.5z" fill="#eee5fa" />
        <path d="m25 10.5 6-3.5v24l-6-3.5z" fill="white" />
      </svg>
      <span>
        <strong>LeanMonth</strong>
        <small>FINANCIAL PLANNER</small>
      </span>
    </div>
  )
}
export function Avatar({
  profile,
  small = false,
  large = false,
}: {
  profile: Pick<Profile, 'name' | 'avatar'>
  small?: boolean
  large?: boolean
}) {
  return (
    <span
      aria-hidden="true"
      className={`avatar avatar-${profile.avatar} ${small ? 'avatar-sm' : ''} ${large ? 'avatar-lg' : ''}`}
    >
      {profile.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s[0])
        .join('')
        .toUpperCase()}
    </span>
  )
}
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  )
}
export const Spinner = () => (
  <LoaderCircle size={16} className="spin" aria-hidden="true" />
)
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  icon: Icon,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  icon?: LucideIcon
}) {
  const id = useId(),
    ref = useRef<HTMLDivElement>(null),
    close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])
  useEffect(() => {
    const old = document.activeElement as HTMLElement
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const first = ref.current?.querySelector<HTMLElement>(
      '[data-autofocus],input:not([type=hidden]),button',
    )
    first?.focus({ preventScroll: true })
    const key = (e: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[role="dialog"]')
      if (dialogs[dialogs.length - 1] !== ref.current) return
      if (e.key === 'Escape') close.current()
      if (e.key === 'Tab') {
        const list = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),select,textarea,a[href],[tabindex="0"]',
          ) || [],
        ).filter((n) => n.getClientRects().length)
        const first = list[0],
          last = list[list.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', key)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', key)
      old?.focus({ preventScroll: true })
    }
  }, [])
  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={`modal ${wide ? 'modal-wide' : ''}`}
      >
        <div className="modal-head">
          <div>
            {Icon && (
              <span className="modal-icon">
                <Icon size={21} />
              </span>
            )}
            <h2 id={id}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-btn close-btn"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
export function Confirm({
  title,
  description,
  action,
  onCancel,
  onConfirm,
  busy = false,
}: {
  title: string
  description: string
  action: string
  onCancel: () => void
  onConfirm: () => void
  busy?: boolean
}) {
  return (
    <Modal title={title} subtitle={description} onClose={onCancel}>
      <div className="modal-actions">
        <button className="btn btn-light" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={onConfirm} disabled={busy}>
          {busy && <Spinner />}
          {action}
        </button>
      </div>
    </Modal>
  )
}
export function MoneyField({
  label,
  value,
  onChange,
  hint,
  min = 0,
  max = 100000000,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  hint?: string
  min?: number
  max?: number
}) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="money-input">
        <span>₹</span>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step="1"
          required
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) =>
            onChange(e.target.value === '' ? NaN : Number(e.target.value))
          }
        />
      </div>
      {hint && <small>{hint}</small>}
    </div>
  )
}
export function RangeField({
  label,
  value,
  onChange,
  help,
  max = 100,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  help?: string
  max?: number
}) {
  const id = useId()
  return (
    <div className="range-field">
      <label htmlFor={id}>
        {label}
        <b>{value}%</b>
      </label>
      <input
        id={id}
        type="range"
        min="0"
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right,var(--purple) ${(value / max) * 100}%,#e9e5ef ${(value / max) * 100}%)`,
        }}
      />
      {help && <small>{help}</small>}
    </div>
  )
}
export function Status({ lean }: { lean: boolean }) {
  return (
    <span className={`status-pill ${lean ? 'amber' : 'green'}`}>
      <span className="status-dot" />
      {lean ? 'Lean month' : 'Good month'}
    </span>
  )
}
export function SectionTitle({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {children}
    </div>
  )
}
export function TextLink({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowRight size={14} />
    </button>
  )
}
export function SavedBadge({ text = 'Saved' }: { text?: string }) {
  return (
    <span className="status-pill green">
      <Check size={12} />
      {text}
    </span>
  )
}
