import { useEffect, useState } from 'react'
import {
  ArrowLeftRight,
  ArrowRight,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CloudCheck,
  Ellipsis,
  FlaskConical,
  LayoutDashboard,
  Menu,
  PanelLeft,
  PanelsTopLeft,
  RefreshCw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  CalendarDays,
  X,
  type LucideIcon,
} from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext'
import { calculate, sum, type Page } from './lib/planner'
import { handleGoogleRedirect } from './lib/googleAuth'
import { Avatar, Brand, Modal, Spinner } from './components/UI'
import { AccountDialog, ProfileDialog } from './components/Account'
import Dashboard from './pages/Dashboard'
import Planner from './pages/Planner'
import Simulation from './pages/Simulation'
import Insights from './pages/Insights'
import Settings from './pages/Settings'
import './App.css'
void handleGoogleRedirect()
const links: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'planner', label: 'Monthly planner', icon: CalendarDays },
  { id: 'simulation', label: 'Simulation', icon: FlaskConical },
  { id: 'insights', label: 'Insights', icon: ChartNoAxesCombined },
  { id: 'settings', label: 'Settings', icon: Settings2 },
]
function current(): Page {
  const p = location.hash.replace(/^#\/?/, '').split('?')[0]
  return links.some((l) => l.id === p) ? (p as Page) : 'dashboard'
}
function AppShell() {
  const { session } = useAuth(),
    { data: w, error, reload, saving } = useWorkspace(),
    [page, setPage] = useState<Page>(current),
    [drawer, setDrawer] = useState(false),
    [dialog, setDialog] = useState<'profile' | 'account' | 'help' | null>(null),
    [retry, setRetry] = useState(false)
  const navigate = (p: Page) => {
    window.location.assign(p === 'dashboard' ? '#/' : `#/${p}`)
    setPage(p)
    setDrawer(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  useEffect(() => {
    const sync = () => {
      setPage(current())
      setDrawer(false)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  useEffect(() => {
    document.title = `${links.find((l) => l.id === page)?.label} · LeanMonth Planner`
  }, [page])
  useEffect(() => {
    if (!drawer) return
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false)
    }
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', esc)
    return () => {
      document.body.style.overflow = old
      document.removeEventListener('keydown', esc)
    }
  }, [drawer])
  const open = (d: 'profile' | 'account' | 'help') => {
    setDrawer(false)
    setDialog(d)
  }
  const profile = w?.profile || {
    name: session?.user.user_metadata?.full_name || 'Ravi',
    avatar: 'violet',
  }
  const onTrack = w
    ? sum(calculate(w.months, w.rules), 'borrowing') === 0
    : true
  const navLink = (l: (typeof links)[number]) => (
    <a
      key={l.id}
      href={l.id === 'dashboard' ? '#/' : `#/${l.id}`}
      className={`nav-link ${page === l.id ? 'active' : ''}`}
      aria-current={page === l.id ? 'page' : undefined}
      onClick={(e) => {
        e.preventDefault()
        navigate(l.id)
      }}
    >
      <l.icon size={19} strokeWidth={1.65} />
      <span>{l.label}</span>
      {page === l.id && <i />}
    </a>
  )
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        Skip to content
      </a>
      {drawer && (
        <button
          className="drawer-overlay"
          aria-label="Close navigation"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside className={`sidebar ${drawer ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <a
            href="#/"
            aria-label="LeanMonth dashboard"
            onClick={(e) => {
              e.preventDefault()
              navigate('dashboard')
            }}
          >
            <Brand />
          </a>
          <button
            className="icon-btn drawer-close"
            aria-label="Close navigation"
            onClick={() => setDrawer(false)}
          >
            <X size={18} />
          </button>
        </div>
        <nav className="side-nav" aria-label="Control panel">
          <span className="nav-heading">WORKSPACE</span>
          {links.slice(0, 4).map(navLink)}
          <div className="nav-divider" />
          <span className="nav-heading">PREFERENCES</span>
          {navLink(links[4])}
        </nav>
        <div className="sidebar-bottom">
          {w && (
            <button
              className="plan-health"
              onClick={() => navigate('insights')}
            >
              <div className="health-label">
                <ShieldCheck size={16} />
                <span>PLAN STATUS</span>
              </div>
              <b>{onTrack ? 'A loan-free year' : 'Your plan outlook'}</b>
              <span className="health-caption">
                <i className={onTrack ? 'healthy' : 'attention'} />
                {onTrack ? 'Your plan is on track' : 'Your plan needs a review'}
              </span>
              <svg viewBox="0 0 120 68" aria-hidden="true">
                <path d="m1 73 39-29 14 7 29-35 39 7v48z" fill="#dfd4ef" />
                <path d="m17 73 34-15 23 3 28-33 25 6v42z" fill="#d1bfe6" />
              </svg>
            </button>
          )}
          <div className="sidebar-account">
            <button
              className="account-profile"
              disabled={!w}
              onClick={() => open('profile')}
              aria-label="Open my profile"
            >
              <Avatar profile={profile} />
              <span>
                <b>{profile.name}</b>
                <small>
                  {session ? 'Personal workspace' : 'Default workspace'}
                </small>
              </span>
              <Ellipsis size={17} />
            </button>
            <button
              className="switch-account"
              disabled={!w}
              onClick={() => open('account')}
            >
              <ArrowLeftRight size={16} />
              Switch account
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              aria-label="Open control panel"
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
            >
              <Menu size={21} />
            </button>
            <PanelLeft
              className="desktop-panel-icon"
              size={17}
              strokeWidth={1.55}
            />
            <i className="breadcrumb-line" />
            <span>Workspace</span>
            <ChevronRight size={13} />
            <b>{links.find((l) => l.id === page)?.label}</b>
          </div>
          <div className="topbar-right">
            <span className={`save-status ${error ? 'has-error' : ''}`}>
              {saving ? <Spinner /> : <i />}
              {saving
                ? 'Saving changes…'
                : error
                  ? 'Connection issue'
                  : w
                    ? 'All changes saved'
                    : 'Opening workspace…'}
            </span>
            <span className="header-divider" />
            <button
              className="header-profile"
              onClick={() => open('profile')}
              disabled={!w}
              aria-label={`Open ${profile.name}'s profile`}
            >
              <Avatar profile={profile} small />
              <span>{profile.name.split(' ')[0]}</span>
              <ChevronDown size={13} />
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="main-content">
          {error && !w ? (
            <div className="connection-state panel">
              <CloudCheck size={36} />
              <h2>Let’s reconnect your workspace.</h2>
              <p>{error}</p>
              <button
                className="btn btn-primary"
                disabled={retry}
                onClick={async () => {
                  setRetry(true)
                  await reload()
                  setRetry(false)
                }}
              >
                {retry ? <Spinner /> : <RefreshCw size={15} />}Try again
              </button>
            </div>
          ) : !w ? (
            <div
              className="loading-layout"
              role="status"
              aria-label="Loading your financial plan"
            >
              <div className="skeleton sk-title" />
              <div className="skeleton sk-sub" />
              <div className="skeleton sk-hero" />
              <div className="sk-cards">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="skeleton" />
                ))}
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="form-error">
                  {error} <button onClick={() => reload()}>Reconnect</button>
                </div>
              )}
              {page === 'dashboard' ? (
                <Dashboard navigate={navigate} />
              ) : page === 'planner' ? (
                <Planner />
              ) : page === 'simulation' ? (
                <Simulation />
              ) : page === 'insights' ? (
                <Insights navigate={navigate} />
              ) : (
                <Settings />
              )}
              <footer className="footer">
                <span>
                  <ShieldCheck size={13} />
                  LeanMonth Planner <i /> Educational estimates, not financial
                  advice.
                </span>
                <button onClick={() => open('help')}>
                  <CircleHelp size={13} />
                  About this plan
                </button>
              </footer>
            </>
          )}
        </main>
      </div>
      {dialog === 'profile' && w && (
        <ProfileDialog
          onClose={() => setDialog(null)}
          onSwitch={() => setDialog('account')}
        />
      )}{' '}
      {dialog === 'account' && w && (
        <AccountDialog onClose={() => setDialog(null)} />
      )}{' '}
      {dialog === 'help' && (
        <Modal
          title="About LeanMonth"
          subtitle="A practical planner for an uneven income."
          icon={PanelsTopLeft}
          onClose={() => setDialog(null)}
        >
          <div className="form-body about-body">
            <p>
              LeanMonth helps you save part of your surplus in stronger months,
              then use that buffer when your income is lower than your expenses.
            </p>
            <p>
              The original May 2026–April 2027 sample plan is illustrative. Ravi
              is a fictional delivery partner in Bengaluru. Nothing is connected
              to a bank or delivery platform.
            </p>
            <div className="help-step">
              <SlidersHorizontal size={17} />
              Adjust finances in your Monthly planner.
            </div>
            <div className="help-step">
              <Check size={17} />
              Changes are saved to your own workspace.
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                setDialog(null)
                navigate('planner')
              }}
            >
              Explore my plan
              <ArrowRight size={14} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
function WorkspaceRoot() {
  const { session, loading } = useAuth()
  if (loading)
    return (
      <div className="startup">
        <Brand />
        <div>
          <Spinner />
          Opening your workspace…
        </div>
      </div>
    )
  return (
    <WorkspaceProvider key={session?.user.id || 'ravi-default'}>
      <AppShell />
    </WorkspaceProvider>
  )
}
export default function App() {
  return (
    <AuthProvider>
      <WorkspaceRoot />
    </AuthProvider>
  )
}
