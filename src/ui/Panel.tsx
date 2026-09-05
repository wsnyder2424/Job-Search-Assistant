import { useEffect, useRef } from 'react'
import { about, accolades, findIsland, identity, resume } from '../content'
import { launchPlane, useCity } from '../store'

/* ============================================================================
 *  The content panel. Slides in beside a focused island on desktop, rises as a
 *  sheet on mobile. Everything inside is real HTML — selectable, searchable,
 *  screen-reader legible.
 * ========================================================================== */

export function Panel() {
  const selected = useCity((s) => s.selected)
  const select = useCity((s) => s.select)
  const showToast = useCity((s) => s.showToast)
  const island = findIsland(selected)

  const ref = useRef<HTMLElement>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!island) return
    restoreFocus.current = document.activeElement as HTMLElement | null
    // Delay a beat so the entrance transition isn't cut short by the scroll jump.
    const id = window.setTimeout(() => ref.current?.focus(), 60)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('keydown', onKey)
    }
  }, [island, select])

  const close = () => {
    select(null)
    restoreFocus.current?.focus?.()
  }

  const onDownload = () => {
    launchPlane()
    showToast('Resume downloaded. Watch it leave.')
    // Pull back to the overview so the takeoff plays across the whole archipelago.
    window.setTimeout(() => select(null), 700)
  }

  return (
    <>
      <div className="panel-scrim" data-open={!!island} onClick={close} aria-hidden="true" />
      <aside
        ref={ref}
        className="panel"
        data-open={!!island}
        tabIndex={-1}
        aria-hidden={!island}
        aria-label={island ? `${island.name} — ${island.subtitle}` : undefined}
        style={island ? ({ ['--accent' as string]: island.accent }) : undefined}
      >
        {island && (
          <>
            <header className="panel__head">
              <div>
                <p className="panel__eyebrow">{island.subtitle}</p>
                <h2 className="panel__title">{island.name}</h2>
              </div>
              <button type="button" className="panel__close" onClick={close} aria-label="Close and return to the archipelago">
                <span aria-hidden="true">✕</span>
              </button>
            </header>

            <div className="panel__body">
              {island.kind === 'case-study' && island.study && <CaseStudy study={island.study} />}
              {island.kind === 'about' && <About />}
              {island.kind === 'accolades' && <Accolades />}
              {island.kind === 'resume' && <Resume onDownload={onDownload} />}
            </div>
          </>
        )}
      </aside>
    </>
  )
}

/* -------------------------------------------------------------------------- */

function CaseStudy({ study }: { study: NonNullable<ReturnType<typeof findIsland>>['study'] }) {
  if (!study) return null
  return (
    <>
      <p className="lede">{study.summary}</p>

      <dl className="meta">
        <div><dt>Role</dt><dd>{study.role}</dd></div>
        <div><dt>When</dt><dd>{study.timeframe}</dd></div>
        <div><dt>Team</dt><dd>{study.team}</dd></div>
      </dl>

      {study.metrics.length > 0 && (
        <ul className="metrics">
          {study.metrics.map((m) => (
            <li key={m.label}>
              <span className="metrics__value">{m.value}</span>
              <span className="metrics__label">{m.label}</span>
            </li>
          ))}
        </ul>
      )}

      {study.sections.map((s) => (
        <section key={s.heading} className="chapter">
          <h3>{s.heading}</h3>
          <p>{s.body}</p>
        </section>
      ))}

      {study.tags.length > 0 && (
        <ul className="tags">
          {study.tags.map((t) => <li key={t}>{t}</li>)}
        </ul>
      )}

      {study.link && (
        <a className="button button--ghost" href={study.link.href} target="_blank" rel="noreferrer noopener">
          {study.link.label} <span aria-hidden="true">↗</span>
        </a>
      )}
    </>
  )
}

function About() {
  return (
    <>
      {about.paragraphs.map((p, i) => (
        <p key={i} className={i === 0 ? 'lede' : undefined}>{p}</p>
      ))}

      <dl className="meta meta--stacked">
        {about.facts.map((f) => (
          <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>
        ))}
      </dl>

      <div className="button-row">
        <a className="button" href={`mailto:${identity.email}`}>Email me</a>
        {identity.links.map((l) => (
          <a key={l.href} className="button button--ghost" href={l.href} target="_blank" rel="noreferrer noopener">
            {l.label} <span aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
    </>
  )
}

function Accolades() {
  return (
    <>
      <p className="lede">
        Every monument in the park is one of these. They light up after dark.
      </p>
      <ol className="awards">
        {accolades.map((a) => (
          <li key={a.title}>
            <span className="awards__year">{a.year}</span>
            <div>
              <h3>{a.title}</h3>
              <p>{a.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}

function Resume({ onDownload }: { onDownload: () => void }) {
  return (
    <>
      <p className="lede">
        The short version is below. The full PDF leaves by plane.
      </p>

      <ol className="timeline">
        {resume.timeline.map((t) => (
          <li key={`${t.org}-${t.period}`}>
            <span className="timeline__period">{t.period}</span>
            <div>
              <h3>{t.role} <span className="timeline__org">· {t.org}</span></h3>
              <p>{t.note}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="button-row">
        <a
          className="button button--accent"
          href={identity.resumeHref}
          download={identity.resumeFilename}
          onClick={onDownload}
        >
          Download resume <span aria-hidden="true">↓</span>
        </a>
        <a className="button button--ghost" href={`mailto:${identity.email}`}>Email me instead</a>
      </div>
    </>
  )
}
