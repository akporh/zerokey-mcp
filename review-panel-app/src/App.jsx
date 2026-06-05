import { useState, useCallback } from 'react'
import ArchitectureReviewPanel from './ArchitectureReviewPanel'
import ArchitectureDocs from './ArchitectureDocs'
import BacklogView from './BacklogView'
import RoadmapView from './RoadmapView'
import KanbanView from './KanbanView'
import RegistryPanel from './RegistryPanel'
import { useStore } from './storeContext'
import { NavContext } from './navContext'

const TABS = [
  { id: 'kanban',  label: 'Kanban Board'    },
  { id: 'roadmap', label: 'Roadmap'          },
  { id: 'backlog', label: 'Backlog'          },
  { id: 'docs',    label: 'Architecture Doc' },
  { id: 'sim',      label: 'Simulation Panel' },
  { id: 'registry', label: 'Registry'         },
]

function TopBar({ tab, onTabClick }) {
  const { statuses } = useStore()
  const done   = Object.values(statuses).filter(s => s === 'done').length
  const inprog = Object.values(statuses).filter(s => s === 'inprogress').length
  const total  = 19

  return (
    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #1e2d45', backgroundColor: '#0d1526', padding: '0 24px', flexShrink: 0 }}>
      <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 800, fontSize: 13, marginRight: 24, letterSpacing: '0.04em', flexShrink: 0 }}>💎 HEDERA x402</span>

      {TABS.map(({ id, label }) => (
        <button key={id} onClick={() => onTabClick(id)} style={{
          padding: '12px 16px', border: 'none', cursor: 'pointer', fontFamily: 'monospace',
          fontSize: 12, fontWeight: tab === id ? 700 : 400, backgroundColor: 'transparent',
          color: tab === id ? '#38bdf8' : '#64748b',
          borderBottom: `2px solid ${tab === id ? '#38bdf8' : 'transparent'}`,
          transition: 'all 0.12s', flexShrink: 0,
        }}>
          {label}
        </button>
      ))}

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        {inprog > 0 && (
          <span style={{ backgroundColor: '#1f1500', color: '#f59e0b', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>
            {inprog} in progress
          </span>
        )}
        <span style={{ backgroundColor: done === total ? '#0a1a12' : '#0c1f30', color: done === total ? '#10b981' : '#38bdf8', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>
          {done}/{total} done
        </span>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab]               = useState('kanban')
  const [navStoryId, setNavStoryId] = useState(null)
  const [navPhaseId, setNavPhaseId] = useState(null)

  const navigate = useCallback((toTab, { storyId, phaseId } = {}) => {
    if (storyId !== undefined) setNavStoryId(storyId)
    if (phaseId !== undefined) setNavPhaseId(phaseId)
    setTab(toTab)
  }, [])

  // Manual tab click clears nav targets so views keep their own selection
  const handleTabClick = useCallback((id) => {
    setNavStoryId(null)
    setNavPhaseId(null)
    setTab(id)
  }, [])

  return (
    <NavContext.Provider value={{ navigate }}>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0f1e' }}>
        <TopBar tab={tab} onTabClick={handleTabClick} />

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {tab === 'kanban'  && <KanbanView />}
          {tab === 'roadmap' && <RoadmapView  jumpToPhase={navPhaseId} />}
          {tab === 'backlog' && <BacklogView  jumpToStory={navStoryId} />}
          {tab === 'docs'    && <ArchitectureDocs />}
          {tab === 'registry' && (
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <RegistryPanel />
            </div>
          )}
          {tab === 'sim'     && (
            <div style={{ height: '100%', overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 24px' }}>
              <ArchitectureReviewPanel />
            </div>
          )}
        </div>
      </div>
    </NavContext.Provider>
  )
}
