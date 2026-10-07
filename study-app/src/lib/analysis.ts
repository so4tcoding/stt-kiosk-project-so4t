import { getSubject } from '../data/curriculum'
import type { Attempt, Subject, SubjectId } from '../types'

export type SkillStat = { skill: string; wrong: number; total: number }

export type UnitStat = {
  unitId: string
  correct: number
  total: number
  rate: number
  skills: SkillStat[]
}

export type SubjectReport = {
  attempts: number
  correct: number
  total: number
  byUnit: UnitStat[]
  weak: UnitStat[]
  shaky: UnitStat[]
  steady: UnitStat[]
  signals: UnitStat[]
}

export function reportFor(attempts: Attempt[], subjectId: SubjectId): SubjectReport {
  const mine = attempts.filter((attempt) => attempt.subjectId === subjectId)
  const map = new Map<string, { correct: number; total: number; skills: Map<string, SkillStat> }>()
  let correct = 0
  let total = 0
  for (const attempt of mine) {
    for (const item of attempt.items) {
      total += 1
      if (item.correct) correct += 1
      const bucket = map.get(item.unitId) ?? { correct: 0, total: 0, skills: new Map() }
      bucket.total += 1
      if (item.correct) bucket.correct += 1
      const skill = bucket.skills.get(item.skill) ?? { skill: item.skill, wrong: 0, total: 0 }
      skill.total += 1
      if (!item.correct) skill.wrong += 1
      bucket.skills.set(item.skill, skill)
      map.set(item.unitId, bucket)
    }
  }
  const byUnit: UnitStat[] = [...map.entries()].map(([unitId, bucket]) => ({
    unitId,
    correct: bucket.correct,
    total: bucket.total,
    rate: bucket.total ? bucket.correct / bucket.total : 0,
    skills: [...bucket.skills.values()].sort((a, b) => b.wrong - a.wrong || b.total - a.total),
  }))
  byUnit.sort((a, b) => a.rate - b.rate || b.total - a.total)
  return {
    attempts: mine.length,
    correct,
    total,
    byUnit,
    weak: byUnit.filter((unit) => unit.total >= 2 && unit.rate < 0.6),
    shaky: byUnit.filter((unit) => unit.total >= 2 && unit.rate >= 0.6 && unit.rate < 0.8),
    steady: byUnit.filter((unit) => unit.total >= 2 && unit.rate >= 0.8),
    signals: byUnit.filter((unit) => unit.total === 1 && unit.correct === 0),
  }
}

export function adviceLines(subject: Subject, report: SubjectReport): string[] {
  if (report.total === 0) {
    return [
      '아직 이 과목 기록이 없습니다. 난이도 2로 10문제를 풀면 어디가 약한지 기준이 생깁니다.',
      ...subject.method.slice(0, 2),
    ]
  }
  const lines: string[] = []
  const rate = Math.round((report.correct / report.total) * 100)
  lines.push(`지금까지 ${report.total}문제 중 ${report.correct}문제를 맞혔습니다. 누적 정답률은 ${rate}%입니다.`)
  for (const unit of report.weak.slice(0, 3)) {
    const found = subject.units.find((item) => item.id === unit.unitId)
    const skill = unit.skills.find((item) => item.wrong > 0)
    lines.push(
      `${found?.title ?? unit.unitId} 정답률은 ${Math.round(unit.rate * 100)}%입니다. ${
        skill ? `자주 멈춘 지점은 ${skill.skill}입니다. ` : ''
      }${found?.repair ?? ''}`.trim(),
    )
  }
  if (report.weak.length === 0 && report.shaky.length > 0) {
    const unit = report.shaky[0]
    const found = subject.units.find((item) => item.id === unit.unitId)
    lines.push(`${found?.title ?? unit.unitId}는 맞히긴 하지만 아직 흔들립니다. ${found?.repair ?? ''}`)
  }
  if (report.weak.length === 0 && report.shaky.length === 0) {
    lines.push('기록상 크게 무너진 단원은 없습니다. 범위를 넓히거나 난이도를 한 단계 올려 변형을 확인하세요.')
  }
  if (report.signals.length > 0) {
    const names = report.signals
      .map((unit) => subject.units.find((item) => item.id === unit.unitId)?.title ?? unit.unitId)
      .slice(0, 3)
      .join(', ')
    lines.push(`${names}은 한 번 틀렸습니다. 부족으로 단정하지 말고 같은 유형을 두 문제만 더 풀어 보세요.`)
  }
  return lines
}

export function overallRate(attempts: Attempt[], subjectId: SubjectId): number | null {
  const report = reportFor(attempts, subjectId)
  if (report.total === 0) return null
  return report.correct / report.total
}

export function nextLevel(attempts: Attempt[], subjectId: SubjectId): 1 | 2 | 3 | 4 | 5 {
  const report = reportFor(attempts, subjectId)
  if (report.total < 5) return 2
  const rate = report.correct / report.total
  if (report.weak.length > 0 || rate < 0.6) return 2
  if (rate < 0.8) return 3
  if (rate < 0.9) return 4
  return 5
}

export function subjectByAttempt(attempt: Attempt): Subject {
  return getSubject(attempt.subjectId)
}
