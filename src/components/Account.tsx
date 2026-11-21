import { useState } from 'react'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Database,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FolderLock,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePlan, useWorkspace } from '../contexts/WorkspaceContext'
import { downloadPlan, period, type Profile } from '../lib/planner'
import supabase from '../lib/supabase'
import { signInWithGoogle } from '../lib/googleAuth'
import { Avatar, Modal, Spinner } from './UI'
import { ScenarioList } from './Scenarios'
export function ProfileDialog({
  onClose,
  onSwitch,
}: {
  onClose: () => void
  onSwitch: () => void
}) {
  const w = usePlan(),
    { session } = useAuth(),
    { save, saving } = useWorkspace(),
    [p, setP] = useState<Profile>({ ...w.profile }),
    [tab, setTab] = useState('details')
  const field = (k: keyof Profile, v: string) => setP((o) => ({ ...o, [k]: v }))
  return (
    <Modal
      title="Your profile"
      subtitle="Your details, preferences, and saved financial plan."
      onClose={onClose}
    >
      <div className="profile-summary">
        <Avatar profile={p} large />
        <div>
          <h3>{w.profile.name}</h3>
          <p>
            {session ? session.user.email : 'Default workspace · This browser'}
          </p>
        </div>
        <span className="profile-private">
          <ShieldCheck size={12} />
          Private
        </span>
      </div>
      <div className="profile-tabs">
        <button
          className={tab === 'details' ? 'active' : ''}
          onClick={() => setTab('details')}
        >
          <UserRound size={15} />
          Profile details
        </button>
        <button
          className={tab === 'data' ? 'active' : ''}
          onClick={() => setTab('data')}
        >
          <Database size={15} />
          My data
        </button>
      </div>
      {tab === 'details' ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (
              await save(
                { area: 'profile', profile: p },
                'Your profile has been saved.',
              )
            )
              onClose()
          }}
        >
          <div className="form-body">
            <div className="field">
              <label htmlFor="display-name">Display name</label>
              <input
                id="display-name"
                value={p.name}
                required
                maxLength={50}
                onChange={(e) => field('name', e.target.value)}
              />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="occupation">Occupation</label>
                <input
                  id="occupation"
                  value={p.occupation}
                  maxLength={80}
                  onChange={(e) => field('occupation', e.target.value)}
                  placeholder="Your occupation"
                />
              </div>
              <div className="field">
                <label htmlFor="location">Location</label>
                <input
                  id="location"
                  value={p.location}
                  maxLength={80}
                  onChange={(e) => field('location', e.target.value)}
                  placeholder="City, country"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="financial-goal">My financial goal</label>
              <textarea
                id="financial-goal"
                value={p.goal}
                rows={2}
                maxLength={500}
                onChange={(e) => field('goal', e.target.value)}
                placeholder="What are you saving for?"
              />
            </div>
            <div className="field">
              <label>Profile color</label>
              <div className="color-options">
                {['violet', 'mint', 'peach', 'blue', 'rose'].map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={`color-option avatar-${c} ${p.avatar === c ? 'selected' : ''}`}
                    aria-label={`${c} profile color`}
                    aria-pressed={p.avatar === c}
                    onClick={() => field('avatar', c)}
                  >
                    {p.avatar === c && <Check size={15} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-light" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={saving || !p.name.trim()}
            >
              {saving ? <Spinner /> : <Check size={15} />}Save profile
            </button>
          </div>
        </form>
      ) : (
        <div className="form-body data-tab">
          <div className="data-security">
            <FolderLock size={22} />
            <div>
              <b>Your personal workspace</b>
              <p>
                {session
                  ? 'Your plan is tied to your account and available when you sign in on another device.'
                  : 'Ravi’s plan is saved privately for this browser. Sign in to use a separate account across devices.'}
              </p>
            </div>
          </div>
          <div className="data-facts">
            <div>
              <span>Planning period</span>
              <b>{period(w.months)}</b>
            </div>
            <div>
              <span>Monthly records</span>
              <b>{w.months.length} months</b>
            </div>
            <div>
              <span>Last saved</span>
              <b>
                {new Date(w.updated_at).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </b>
            </div>
          </div>
          <div>
            <h4>Export your data</h4>
            <p className="small-muted">
              Download a copy of your plan for your records.
            </p>
            <div className="button-row">
              <button
                className="btn btn-light btn-small"
                onClick={() => downloadPlan(w, true)}
              >
                <FileSpreadsheet size={15} />
                Monthly CSV
              </button>
              <button
                className="btn btn-light btn-small"
                onClick={() => downloadPlan(w)}
              >
                <Download size={15} />
                Full backup
              </button>
            </div>
          </div>
          <div>
            <h4>Saved scenarios</h4>
            <ScenarioList />
          </div>
          <button className="text-link" onClick={onSwitch}>
            <UsersRound size={15} />
            Switch account
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </Modal>
  )
}
function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285f4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"
      />
      <path
        fill="#34a853"
        d="M12 22c2.7 0 5-1 6.7-2.5l-3.3-2.6a6.2 6.2 0 0 1-9.2-3.4H2.8v2.7A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#fbbc05"
        d="M6.2 13.5a6 6 0 0 1 0-3.1V7.8H2.8a10 10 0 0 0 0 8.4l3.4-2.7Z"
      />
      <path
        fill="#ea4335"
        d="M12 6c1.5 0 2.7.5 3.7 1.4l2.8-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9.2 5.8l3.4 2.6A6.1 6.1 0 0 1 12 6Z"
      />
    </svg>
  )
}
export function AccountDialog({ onClose }: { onClose: () => void }) {
  const w = usePlan(),
    { session } = useAuth(),
    [signUp, setSignUp] = useState(false),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [name, setName] = useState(''),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [sent, setSent] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (signUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin + window.location.pathname },
        })
        if (error) throw error
        if (!data.session) setSent(true)
        else onClose()
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        onClose()
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Sign-in failed. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title="Switch account"
      subtitle="A separate profile. A plan that’s yours."
      icon={UsersRound}
      onClose={onClose}
    >
      <div className="account-body">
        <div className="current-account">
          <Avatar profile={w.profile} />
          <div>
            <b>{w.profile.name}</b>
            <small>{session ? session.user.email : 'Default workspace'}</small>
          </div>
          <span className="status-pill green">
            <Check size={11} />
            Current
          </span>
        </div>
        {sent ? (
          <div className="auth-success">
            <CheckCircle2 size={32} />
            <h3>Check your inbox</h3>
            <p>
              Confirm your email at <b>{email}</b>, then sign in to your
              personal workspace.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                setSent(false)
                setSignUp(false)
                setPassword('')
              }}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              {['Sign in', 'Create account'].map((s, i) => (
                <button
                  className={signUp === (i === 1) ? 'active' : ''}
                  key={s}
                  onClick={() => {
                    setSignUp(i === 1)
                    setError('')
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <form className="auth-form" onSubmit={submit}>
              {signUp && (
                <div className="field">
                  <label htmlFor="account-name">Your name</label>
                  <input
                    required
                    maxLength={50}
                    id="account-name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
              )}
              <div className="field">
                <label htmlFor="account-email">Email address</label>
                <div className="icon-input">
                  <Mail size={16} />
                  <input
                    id="account-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="account-password">Password</label>
                <div className="icon-input">
                  <LockKeyhole size={16} />
                  <input
                    id="account-password"
                    type={show ? 'text' : 'password'}
                    autoComplete={signUp ? 'new-password' : 'current-password'}
                    required
                    minLength={signUp ? 8 : 1}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      signUp ? 'At least 8 characters' : 'Enter your password'
                    }
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={show ? 'Hide password' : 'Show password'}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="btn btn-primary btn-full" disabled={busy}>
                {busy ? <Spinner /> : <LogIn size={16} />}{' '}
                {signUp ? 'Create my account' : 'Sign in to workspace'}
              </button>
            </form>
            <div className="or-line">
              <span />
              or
              <span />
            </div>
            <button
              className="btn btn-light btn-full"
              onClick={() => signInWithGoogle(setError)}
            >
              <GoogleMark />
              Continue with Google
            </button>
            <p className="auth-note">
              <ShieldCheck size={14} />
              {signUp
                ? 'New accounts start with a fresh copy of the sample plan.'
                : 'Your profile and financial data stay in your own workspace.'}
            </p>
          </>
        )}
        {session && (
          <button
            className="default-account-link"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              const { error } = await supabase.auth.signOut({ scope: 'local' })
              setBusy(false)
              if (error) setError(error.message)
              else onClose()
            }}
          >
            <LogOut size={15} />
            Sign out and return to Ravi
          </button>
        )}
      </div>
    </Modal>
  )
}
