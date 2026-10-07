import { useEffect, useMemo, useState } from 'react'
import { findUnit, getSubject, subjects } from './data/curriculum'
import { adviceLines, nextLevel, overallRate, reportFor } from './lib/analysis'
import { buildQuestions, defaultKinds, kindLabel, levelMeta } from './lib/session'
import { suggestUnitIds } from './lib/suggest'
import { clearAttempts, loadAttempts, loadPhotos, loadSessionRaw, saveAttempt, savePhotos, saveSessionRaw } from './lib/storage'
import type { Attempt, Kind, KindFlags, Level, Session, SubjectId } from './types'

const subjectIds: SubjectId[] = ['algebra', 'science', 'korean', 'english', 'social', 'history']

function isSubject(value: string): value is SubjectId {
  return subjectIds.includes(value as SubjectId)
}

function readSession(): Session | null {
  const raw = loadSessionRaw()
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('image'))
      el.src = url
    })
    const max = 1280
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.72)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function percent(rate: number | null): string {
  if (rate === null) return '기록 없음'
  return `${Math.round(rate * 100)}%`
}

function mixCount(session: Session, kind: Kind): number {
  return session.questions.filter((question) => question.kind === kind).length
}

export function App() {
  const [hash, setHash] = useState(() => window.location.hash.replace(/^#/, '') || '/')
  const [attempts, setAttempts] = useState<Attempt[]>(() => loadAttempts())
  const [session, setSession] = useState<Session | null>(() => readSession())
  const [photos, setPhotos] = useState<string[]>([])

  useEffect(() => {
    const onHash = () => setHash(window.location.hash.replace(/^#/, '') || '/')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    saveSessionRaw(session ? JSON.stringify(session) : null)
  }, [session])

  const { path, query } = useMemo(() => {
    const [pathname, search] = hash.split('?')
    return { path: pathname || '/', query: new URLSearchParams(search ?? '') }
  }, [hash])

  function go(next: string) {
    window.location.hash = next
  }

  const parts = path.split('/').filter(Boolean)
  const page = parts[0] ?? 'home'
  const arg = parts[1] ?? ''

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#/">
          <span className="brand-mark">책</span>
          <span>
            <strong>기말공책</strong>
            <span>범위 안의 요약과 문제</span>
          </span>
        </a>
        <button className="nav-link" onClick={() => go('/record')}>
          기록
        </button>
      </header>
      {page === 'subject' && isSubject(arg) ? (
        <SubjectPage key={arg} subjectId={arg} attempts={attempts} onStart={(units) => go(units ? `/setup/${arg}?units=${units.join(',')}` : `/setup/${arg}`)} />
      ) : page === 'setup' && isSubject(arg) ? (
        <SetupPage
          key={`${arg}:${query.get('units') ?? ''}`}
          subjectId={arg}
          initialUnits={query.get('units')?.split(',').filter(Boolean) ?? []}
          onReady={(next) => {
            setSession(next)
            go('/summary')
          }}
        />
      ) : page === 'summary' && session ? (
        <SummaryPage
          session={session}
          onRebuild={() => {
            const built = buildQuestions({
              subjectId: session.subjectId,
              unitIds: session.unitIds,
              level: session.level,
              kinds: session.kinds,
              count: session.questions.length || 10,
            })
            setSession({ ...session, questions: built.questions, note: built.note, index: 0, picks: built.questions.map(() => null), revealed: false })
          }}
          onStart={() => go('/quiz')}
        />
      ) : page === 'quiz' && session ? (
        <QuizPage
          session={session}
          onChange={setSession}
          onFinish={async (done) => {
            const attempt: Attempt = {
              id: done.id,
              subjectId: done.subjectId,
              scopeTitle: done.scopeTitle,
              unitIds: done.unitIds,
              level: done.level,
              createdAt: Date.now(),
              photoCount: done.photos.length,
              items: done.questions.map((question, index) => ({
                questionId: question.id,
                unitId: question.unitId,
                skill: question.skill,
                kind: question.kind,
                difficulty: question.difficulty,
                correct: done.picks[index] === question.answer,
                choice: done.picks[index] ?? -1,
                stem: question.stem,
                choices: question.choices,
                answer: question.answer,
                explanation: question.explanation,
              })),
            }
            setAttempts(saveAttempt(attempt))
            try {
              await savePhotos(attempt.id, done.photos)
            } catch {
              // 사진 저장이 실패해도 풀이 기록은 남깁니다.
            }
            setSession(null)
            go(`/result/${attempt.id}`)
          }}
        />
      ) : page === 'result' ? (
        <ResultPage attempt={attempts.find((item) => item.id === arg) ?? null} attempts={attempts} photos={photos} onPhotos={setPhotos} />
      ) : page === 'record' ? (
        <RecordPage
          attempts={attempts}
          onClear={() => {
            if (window.confirm('기말공책의 풀이 기록을 지울까요?')) {
              clearAttempts()
              setAttempts([])
            }
          }}
        />
      ) : (
        <Home attempts={attempts} />
      )}
    </>
  )
}

function Home({ attempts }: { attempts: Attempt[] }) {
  return (
    <main className="wrap">
      <section className="hero">
        <div>
          <p className="eyebrow">대수 · 통합과학2 · 공통국어2 · 공통영어2 · 통합사회2 · 한국사2</p>
          <h1>사진 속 범위만<br />공책에 남긴다</h1>
          <p className="lede">
            시험 범위 사진을 올리고 소제목을 옮기면, 그 단원의 요약문과 기본·변형·고난도 문제가 나옵니다. 문제 수와 다섯 단계 난이도는 직접 정하고, 틀린 단원은 다음 공부로 이어집니다.
          </p>
        </div>
        <div className="stamp">기말</div>
      </section>
      <div className="subject-grid">
        {subjects.map((subject) => {
          const rate = overallRate(attempts, subject.id)
          const report = reportFor(attempts, subject.id)
          return (
            <button key={subject.id} className="subject-card" style={{ ['--thread' as string]: subject.color }} onClick={() => (window.location.hash = `/subject/${subject.id}`)}>
              <b>{subject.name}</b>
              <span className="muted">{subject.blurb}</span>
              <span className="row tiny">
                <span>{rate === null ? '아직 기록 없음' : `정답률 ${percent(rate)}`}</span>
                <span>{report.weak.length > 0 ? `부족 ${report.weak.length}단원` : report.total > 0 ? '기록 있음' : '아직 없음'}</span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="footer-note">교과서 쪽수는 출판사마다 다릅니다. 사진에 보이는 제목을 옮기고 단원을 맞춘 뒤 문제를 푸세요. 사진은 범위 기록으로 남고, 글자를 자동으로 읽지는 않습니다.</p>
    </main>
  )
}

function SubjectPage({ subjectId, attempts, onStart }: { subjectId: SubjectId; attempts: Attempt[]; onStart: (units?: string[]) => void }) {
  const subject = getSubject(subjectId)
  const report = reportFor(attempts, subjectId)
  const lines = adviceLines(subject, report)
  const weakIds = report.weak.map((unit) => unit.unitId)
  return (
    <main className="wrap">
      <div className="section-head">
        <div>
          <p className="eyebrow">{subject.blurb}</p>
          <h2>{subject.name}</h2>
        </div>
        <div className="actions no-print" style={{ marginTop: 0 }}>
          {weakIds.length > 0 ? (
            <button className="button" onClick={() => onStart(weakIds)}>
              부족한 단원만
            </button>
          ) : null}
          <button className="button seal" onClick={() => onStart()}>
            범위 정하고 풀기
          </button>
        </div>
      </div>
      <div className="layout">
        <section className="panel">
          <h3>이 과목은 이렇게</h3>
          <ol className="method">
            {subject.method.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <h3 style={{ marginTop: 22 }}>지금 보이는 약점</h3>
          <ul className="advice">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {report.total > 0 ? (
            <p className="tiny" style={{ marginTop: 12 }}>
              다음 추천 난이도는 {nextLevel(attempts, subjectId)}단계입니다. 부족은 같은 단원을 두 문제 이상 풀고 정답률이 60% 미만일 때 표시합니다.
            </p>
          ) : null}
        </section>
        <section className="panel">
          <h3>단원</h3>
          <div className="unit-list" style={{ marginTop: 12 }}>
            {subject.units.map((unit) => {
              const stat = report.byUnit.find((item) => item.unitId === unit.id)
              const label = !stat ? '아직' : stat.total >= 2 && stat.rate < 0.6 ? '부족' : stat.total >= 2 && stat.rate < 0.8 ? '흔들림' : stat.total >= 2 ? '안정' : '살펴보기'
              const tone = label === '부족' ? 'weak' : label === '흔들림' ? 'shaky' : label === '안정' ? 'steady' : ''
              return (
                <div key={unit.id} className="unit-row">
                  <span>
                    <b>{unit.title}</b>
                    <span className="tiny" style={{ display: 'block' }}>
                      {unit.chapter}
                    </span>
                  </span>
                  <span className={`pill ${tone}`}>{stat ? `${label} ${Math.round(stat.rate * 100)}%` : label}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}

function SetupPage({ subjectId, initialUnits, onReady }: { subjectId: SubjectId; initialUnits: string[]; onReady: (session: Session) => void }) {
  const subject = getSubject(subjectId)
  const validInitial = initialUnits.filter((id) => subject.units.some((unit) => unit.id === id))
  const [scopeTitle, setScopeTitle] = useState(`${subject.name} 기말`)
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [units, setUnits] = useState<string[]>(validInitial)
  const [level, setLevel] = useState<Level>(2)
  const [kinds, setKinds] = useState<KindFlags>(defaultKinds(2))
  const [count, setCount] = useState(10)
  const [hint, setHint] = useState(validInitial.length ? '부족한 단원만 골라 두었습니다. 빠진 범위가 있으면 체크를 고치세요.' : '')
  const [error, setError] = useState('')

  async function addFiles(files: FileList | null) {
    if (!files) return
    const next = [...photos]
    for (const file of files) {
      if (next.length >= 8) break
      try {
        next.push(await compressImage(file))
      } catch {
        setError('열리지 않는 사진이 있습니다. jpg나 png로 올려 주세요.')
      }
    }
    setPhotos(next)
  }

  function changeNote(value: string) {
    setNote(value)
    const suggested = suggestUnitIds(subject, value)
    if (suggested.length > 0) {
      setUnits(suggested)
      setHint(`옮겨 적은 제목에서 ${suggested.length}개 단원을 골랐습니다. 사진과 다르면 체크를 고치세요.`)
    }
  }

  function create() {
    const safeCount = Math.min(40, Math.max(1, Math.round(count) || 1))
    const built = buildQuestions({ subjectId, unitIds: units, level, kinds, count: safeCount })
    if (built.questions.length === 0) {
      setError(built.note ?? '문제를 만들지 못했습니다.')
      return
    }
    onReady({
      id: crypto.randomUUID(),
      subjectId,
      scopeTitle: scopeTitle.trim() || subject.name,
      scopeNote: note.trim(),
      unitIds: units,
      level,
      kinds,
      photos,
      questions: built.questions,
      note: built.note,
      index: 0,
      picks: built.questions.map(() => null),
      revealed: false,
    })
  }

  const meta = levelMeta.find((item) => item.level === level)!
  return (
    <main className="wrap">
      <div className="section-head">
        <div>
          <p className="eyebrow">{subject.name}</p>
          <h2>범위를 공책에 붙이기</h2>
        </div>
      </div>
      <div className="layout">
        <section className="panel">
          <h3>1. 사진과 소제목</h3>
          <p className="tiny">교과서나 노트 사진을 남기고, 보이는 단원 이름을 아래 칸에 옮기세요.</p>
          <label className="field">
            범위 이름
            <input value={scopeTitle} onChange={(event) => setScopeTitle(event.target.value)} />
          </label>
          <label className="field">
            사진 속 제목
            <textarea value={note} onChange={(event) => changeNote(event.target.value)} placeholder="예: 삼각함수, 사인법칙, 등차수열" />
          </label>
          <label className="button" style={{ display: 'inline-block', marginTop: 12 }}>
            사진 올리기
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                void addFiles(event.target.files)
                event.target.value = ''
              }}
            />
          </label>
          <div className="photos">
            {photos.map((photo, index) => (
              <figure key={photo.slice(0, 32) + index}>
                <img src={photo} alt={`범위 사진 ${index + 1}`} />
                <button onClick={() => setPhotos(photos.filter((_, item) => item !== index))} aria-label="사진 빼기">
                  ×
                </button>
              </figure>
            ))}
          </div>
          {hint ? <p className="note">{hint}</p> : null}
        </section>
        <section className="panel">
          <div className="row">
            <h3>2. 단원</h3>
            <span className="wrap-row">
              <button className="text-link" onClick={() => setUnits(subject.units.map((unit) => unit.id))}>
                전체
              </button>
              <button className="text-link" onClick={() => setUnits([])}>
                해제
              </button>
            </span>
          </div>
          <div className="unit-list" style={{ marginTop: 12 }}>
            {subject.units.map((unit) => (
              <label key={unit.id} className="check">
                <input
                  type="checkbox"
                  checked={units.includes(unit.id)}
                  onChange={() => setUnits(units.includes(unit.id) ? units.filter((id) => id !== unit.id) : [...units, unit.id])}
                />
                <span>
                  {unit.title}
                  <span className="tiny" style={{ display: 'block' }}>
                    {unit.chapter}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>
      <section className="panel" style={{ marginTop: 16 }}>
        <h3>3. 문제 수와 난이도</h3>
        <div className="field">
          <span>문제 수 · 1에서 40</span>
          <div className="wrap-row">
            {[5, 10, 15, 20, 30].map((value) => (
              <button key={value} className="count-chip" aria-pressed={count === value} onClick={() => setCount(value)} style={count === value ? { background: 'var(--ink)', color: '#f6f1e7' } : undefined}>
                {value}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={40}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              style={{ width: 88 }}
            />
          </div>
        </div>
        <div className="field">
          <span>난이도 5단계</span>
          <div className="levels">
            {levelMeta.map((item) => (
              <button
                key={item.level}
                aria-pressed={level === item.level}
                onClick={() => {
                  setLevel(item.level)
                  setKinds(defaultKinds(item.level))
                }}
              >
                {item.level}
                <small>{item.name}</small>
              </button>
            ))}
          </div>
          <p className="tiny">{meta.hint}</p>
        </div>
        <div className="wrap-row" style={{ marginTop: 12 }}>
          {(['basic', 'variation', 'hard'] as Kind[]).map((kind) => (
            <label key={kind} className="check" style={{ width: 'auto' }}>
              <input
                type="checkbox"
                checked={kinds[kind]}
                onChange={() => setKinds({ ...kinds, [kind]: !kinds[kind] })}
              />
              {kindLabel[kind]} 문제
            </label>
          ))}
        </div>
        {error ? <p className="note">{error}</p> : null}
        <div className="actions">
          <button className="button seal" disabled={units.length === 0} onClick={create}>
            요약문 만들기
          </button>
          <span className="tiny">고른 단원 {units.length}개</span>
        </div>
      </section>
    </main>
  )
}

function SummaryPage({ session, onRebuild, onStart }: { session: Session; onRebuild: () => void; onStart: () => void }) {
  const subject = getSubject(session.subjectId)
  const units = subject.units.filter((unit) => session.unitIds.includes(unit.id))
  return (
    <main className="narrow">
      <p className="eyebrow">{subject.name}</p>
      <h2>{session.scopeTitle}</h2>
      <p className="lede">고른 단원을 기말 전에 다시 읽기 위한 요약입니다. 학교 프린트의 문장을 베끼지 않았고, 개념과 함정을 짧게 묶었습니다.</p>
      {session.scopeNote ? (
        <section className="panel summary-block" style={{ marginTop: 18 }}>
          <h3>내가 옮긴 범위</h3>
          <p style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{session.scopeNote}</p>
        </section>
      ) : null}
      {session.photos.length > 0 ? (
        <div className="photos" style={{ marginTop: 12 }}>
          {session.photos.map((photo, index) => (
            <img key={index} src={photo} alt={`올린 범위 ${index + 1}`} />
          ))}
        </div>
      ) : null}
      {units.map((unit) => (
        <section key={unit.id} className="panel summary-block" style={{ marginTop: 14 }}>
          <p className="tiny">{unit.chapter}</p>
          <h3>{unit.title}</h3>
          <div className="prose" style={{ marginTop: 8 }}>
            {unit.summary.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <ul className="traps">
            {unit.traps.map((trap) => (
              <li key={trap}>{trap}</li>
            ))}
          </ul>
        </section>
      ))}
      <section className="panel" style={{ marginTop: 16 }}>
        <h3>이 세트</h3>
        <p style={{ marginTop: 8 }}>
          난이도 {session.level}단계 · {session.questions.length}문제 · 기본 {mixCount(session, 'basic')} · 변형 {mixCount(session, 'variation')} · 고난도 {mixCount(session, 'hard')}
        </p>
        {session.note ? <p className="note">{session.note}</p> : null}
        <div className="actions no-print">
          <button className="button seal" onClick={onStart} disabled={session.questions.length === 0}>
            문제 풀기
          </button>
          <button className="button" onClick={onRebuild}>
            문제 다시 뽑기
          </button>
          <button className="button ghost" onClick={() => window.print()}>
            요약 인쇄
          </button>
        </div>
      </section>
    </main>
  )
}

function QuizPage({ session, onChange, onFinish }: { session: Session; onChange: (session: Session) => void; onFinish: (session: Session) => void }) {
  const question = session.questions[session.index]
  const total = session.questions.length
  const picked = session.picks[session.index]
  const unit = findUnit(question.unitId)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key >= '1' && event.key <= '5') {
        const choice = Number(event.key) - 1
        if (!session.revealed && choice < question.choices.length) {
          const picks = [...session.picks]
          picks[session.index] = choice
          onChange({ ...session, picks })
        }
      }
      if (event.key === 'Enter' && picked !== null && !session.revealed) onChange({ ...session, revealed: true })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onChange, picked, question.choices.length, session])

  function choose(choice: number) {
    if (session.revealed) return
    const picks = [...session.picks]
    picks[session.index] = choice
    onChange({ ...session, picks })
  }

  function next() {
    if (session.index + 1 >= total) {
      onFinish(session)
      return
    }
    onChange({ ...session, index: session.index + 1, revealed: false })
  }

  return (
    <main className="narrow">
      <div className="row">
        <p className="eyebrow">{session.scopeTitle}</p>
        <span className="tiny">
          {session.index + 1} / {total}
        </span>
      </div>
      <div className="progress" aria-hidden="true">
        <span style={{ width: `${((session.index + (session.revealed ? 1 : 0)) / total) * 100}%` }} />
      </div>
      <article className="quiz-card">
        <div className="wrap-row">
          <span className={`badge ${question.kind}`}>{kindLabel[question.kind]}</span>
          <span className="badge">난이도 {question.difficulty}</span>
          <span className="tiny">{unit?.unit.title}</span>
        </div>
        <h2 className="stem">{question.stem}</h2>
        <div className="choices">
          {question.choices.map((choice, index) => {
            const classes = ['choice']
            if (picked === index) classes.push('selected')
            if (session.revealed && index === question.answer) classes.push('right')
            if (session.revealed && picked === index && index !== question.answer) classes.push('wrong')
            return (
              <button key={choice} className={classes.join(' ')} onClick={() => choose(index)}>
                {index + 1}. {choice}
                {session.revealed && index === question.answer ? ' · 정답' : ''}
                {session.revealed && picked === index && index !== question.answer ? ' · 내 선택' : ''}
              </button>
            )
          })}
        </div>
        {session.revealed ? <p className="explain">{question.explanation}</p> : null}
        <div className="quiz-actions">
          <button className="button ghost" onClick={() => (window.location.hash = '/summary')}>
            요약으로
          </button>
          {!session.revealed ? (
            <button className="button seal" disabled={picked === null} onClick={() => onChange({ ...session, revealed: true })}>
              정답 확인
            </button>
          ) : (
            <button className="button seal" onClick={next}>
              {session.index + 1 >= total ? '결과 보기' : '다음 문제'}
            </button>
          )}
        </div>
      </article>
    </main>
  )
}

function ResultPage({ attempt, attempts, photos, onPhotos }: { attempt: Attempt | null; attempts: Attempt[]; photos: string[]; onPhotos: (photos: string[]) => void }) {
  useEffect(() => {
    if (!attempt) return
    let alive = true
    onPhotos([])
    loadPhotos(attempt.id)
      .then((saved) => {
        if (alive) onPhotos(saved)
      })
      .catch(() => {
        if (alive) onPhotos([])
      })
    return () => {
      alive = false
    }
  }, [attempt, onPhotos])

  if (!attempt) {
    return (
      <main className="narrow">
        <h2>결과를 찾지 못했습니다</h2>
        <button className="button" onClick={() => (window.location.hash = '/')}>
          처음으로
        </button>
      </main>
    )
  }
  const subject = getSubject(attempt.subjectId)
  const correct = attempt.items.filter((item) => item.correct).length
  const report = reportFor(attempts, attempt.subjectId)
  const wrong = attempt.items.filter((item) => !item.correct)
  const byUnit = new Map<string, { correct: number; total: number }>()
  for (const item of attempt.items) {
    const bucket = byUnit.get(item.unitId) ?? { correct: 0, total: 0 }
    bucket.total += 1
    if (item.correct) bucket.correct += 1
    byUnit.set(item.unitId, bucket)
  }
  return (
    <main className="narrow">
      <p className="eyebrow">{subject.name}</p>
      <h2>{attempt.scopeTitle}</h2>
      <p className="score">
        {correct}
        <span className="muted" style={{ fontSize: 28 }}>
          {' '}
          / {attempt.items.length}
        </span>
      </p>
      <p className="tiny">난이도 {attempt.level}단계 · 이번 세트 정답률 {Math.round((correct / attempt.items.length) * 100)}%</p>
      {photos.length > 0 ? (
        <div className="photos">
          {photos.map((photo, index) => (
            <img key={index} src={photo} alt={`범위 사진 ${index + 1}`} />
          ))}
        </div>
      ) : null}
      <section className="panel" style={{ marginTop: 16 }}>
        <h3>단원별</h3>
        <div className="bars">
          {[...byUnit.entries()].map(([unitId, stat]) => {
            const title = subject.units.find((unit) => unit.id === unitId)?.title ?? unitId
            return (
              <div key={unitId}>
                <div className="row tiny">
                  <span>{title}</span>
                  <span>
                    {stat.correct}/{stat.total}
                  </span>
                </div>
                <div className="bar">
                  <span style={{ width: `${(stat.correct / stat.total) * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>
      <section className="panel" style={{ marginTop: 14 }}>
        <h3>부족한 부분</h3>
        <ul className="advice">
          {adviceLines(subject, report).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div className="actions">
          <button className="button seal" onClick={() => (window.location.hash = `/subject/${subject.id}`)}>
            과목 공부법 보기
          </button>
          {report.weak.length > 0 ? (
            <button className="button" onClick={() => (window.location.hash = `/setup/${subject.id}?units=${report.weak.map((unit) => unit.unitId).join(',')}`)}>
              약한 단원만 다시
            </button>
          ) : (
            <button className="button" onClick={() => (window.location.hash = `/setup/${subject.id}?units=${attempt.unitIds.join(',')}`)}>
              같은 범위로 다시
            </button>
          )}
        </div>
      </section>
      {wrong.length > 0 ? (
        <section style={{ marginTop: 16 }}>
          <h3>틀린 문제</h3>
          {wrong.map((item) => (
            <details key={item.questionId + item.stem}>
              <summary>
                {subject.units.find((unit) => unit.id === item.unitId)?.title} · {item.skill}
              </summary>
              <p className="stem">{item.stem}</p>
              <p>내 선택: {item.choice >= 0 ? item.choices[item.choice] : '없음'}</p>
              <p>정답: {item.choices[item.answer]}</p>
              <p className="explain">{item.explanation}</p>
            </details>
          ))}
        </section>
      ) : (
        <p className="note">이번 세트는 모두 맞았습니다. 난이도를 한 단계 올리거나 범위를 넓혀 보세요.</p>
      )}
    </main>
  )
}

function RecordPage({ attempts, onClear }: { attempts: Attempt[]; onClear: () => void }) {
  return (
    <main className="narrow">
      <div className="section-head">
        <h2>기록</h2>
        {attempts.length > 0 ? (
          <button className="text-link" onClick={onClear}>
            기록 지우기
          </button>
        ) : null}
      </div>
      {attempts.length === 0 ? <p className="muted">아직 끝낸 세트가 없습니다.</p> : null}
      {attempts.map((attempt) => {
        const subject = getSubject(attempt.subjectId)
        const correct = attempt.items.filter((item) => item.correct).length
        const when = new Date(attempt.createdAt)
        return (
          <button key={attempt.id} className="record-item" style={{ width: '100%', textAlign: 'left' }} onClick={() => (window.location.hash = `/result/${attempt.id}`)}>
            <div className="row">
              <b>
                {subject.name} · {attempt.scopeTitle}
              </b>
              <span>
                {correct}/{attempt.items.length}
              </span>
            </div>
            <span className="tiny">
              {when.toLocaleDateString('ko-KR')} {when.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} · 난이도 {attempt.level}
              {attempt.photoCount > 0 ? ` · 사진 ${attempt.photoCount}` : ''}
            </span>
          </button>
        )
      })}
    </main>
  )
}
