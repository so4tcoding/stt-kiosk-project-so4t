import { bank } from '../data/bank'
import type { Kind, KindFlags, Level, Question, SubjectId } from '../types'
import { generateAlgebraQuestions, mulberry32 } from './algebra'

export const levelMeta: { level: Level; name: string; hint: string }[] = [
  { level: 1, name: '개념', hint: '정의와 바로 확인하는 문제 중심입니다.' },
  { level: 2, name: '기본', hint: '개념을 한 단계 적용하고 변형을 조금 섞습니다.' },
  { level: 3, name: '변형', hint: '상황과 자료를 바꾼 문제가 중심입니다.' },
  { level: 4, name: '심화', hint: '변형과 고난도를 함께 뽑습니다.' },
  { level: 5, name: '고난도', hint: '조건이 많거나 함정이 있는 문제 중심입니다.' },
]

export const kindLabel: Record<Kind, string> = {
  basic: '기본',
  variation: '변형',
  hard: '고난도',
}

export function defaultKinds(level: Level): KindFlags {
  if (level === 1) return { basic: true, variation: false, hard: false }
  if (level === 2) return { basic: true, variation: true, hard: false }
  if (level === 3) return { basic: true, variation: true, hard: true }
  if (level === 4) return { basic: false, variation: true, hard: true }
  return { basic: false, variation: false, hard: true }
}

function windowFor(level: Level, pad: number): Level[] {
  const base: Record<Level, Level[]> = {
    1: [1],
    2: [1, 2],
    3: [2, 3, 4],
    4: [3, 4, 5],
    5: [4, 5],
  }
  const set = new Set<Level>()
  for (const item of base[level]) {
    for (let shift = -pad; shift <= pad; shift++) {
      const next = item + shift
      if (next >= 1 && next <= 5) set.add(next as Level)
    }
  }
  return [...set]
}

function activeKinds(flags: KindFlags): Kind[] {
  return (['basic', 'variation', 'hard'] as Kind[]).filter((kind) => flags[kind])
}

function dedupe(questions: Question[]): Question[] {
  const seen = new Set<string>()
  const out: Question[] = []
  for (const question of questions) {
    if (seen.has(question.stem)) continue
    seen.add(question.stem)
    out.push(question)
  }
  return out
}

function collect(opts: {
  subjectId: SubjectId
  unitIds: string[]
  levels: Level[]
  kinds: Kind[]
  count: number
  seed: number
}): Question[] {
  const fromBank = bank.filter(
    (question) =>
      opts.unitIds.includes(question.unitId) &&
      opts.levels.includes(question.difficulty) &&
      opts.kinds.includes(question.kind),
  )
  const generated =
    opts.subjectId === 'algebra'
      ? opts.levels.flatMap((level) =>
          generateAlgebraQuestions({
            unitIds: opts.unitIds,
            level,
            kinds: opts.kinds,
            count: Math.max(opts.count, 10),
            seed: opts.seed + level * 997,
          }),
        )
      : []
  return dedupe([...fromBank, ...generated])
}

function reshuffle(question: Question, rng: () => number, suffix: string): Question {
  const choices = [...question.choices]
  const answerText = choices[question.answer]
  for (let index = choices.length - 1; index > 0; index--) {
    const swap = Math.floor(rng() * (index + 1))
    ;[choices[index], choices[swap]] = [choices[swap], choices[index]]
  }
  return { ...question, id: `${question.id}${suffix}`, choices, answer: choices.indexOf(answerText) }
}

function weightedSample(pool: Question[], count: number, level: Level, rng: () => number): Question[] {
  const bag = [...pool]
  const picked: Question[] = []
  while (bag.length > 0 && picked.length < count) {
    const weights = bag.map((question) => {
      let weight = question.difficulty === level ? 5 : 2
      if (level >= 4 && question.kind === 'hard') weight += 2
      if (level === 3 && question.kind === 'variation') weight += 2
      if (level <= 2 && question.kind === 'basic') weight += 2
      return weight
    })
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    let cursor = rng() * total
    let index = 0
    for (; index < bag.length; index++) {
      cursor -= weights[index]
      if (cursor <= 0) break
    }
    const chosen = bag.splice(Math.min(index, bag.length - 1), 1)[0]
    picked.push(reshuffle(chosen, rng, ''))
  }
  let round = 2
  while (picked.length < count && pool.length > 0) {
    const extra = reshuffle(pool[Math.floor(rng() * pool.length)], rng, `#${round}`)
    if (!picked.some((question) => question.stem === extra.stem && question.choices.join('|') === extra.choices.join('|'))) {
      picked.push(extra)
    }
    round += 1
    if (round > count + 8) break
  }
  return picked
}

export function buildQuestions(opts: {
  subjectId: SubjectId
  unitIds: string[]
  level: Level
  kinds: KindFlags
  count: number
  seed?: number
}): { questions: Question[]; note: string | null } {
  const kinds = activeKinds(opts.kinds)
  if (opts.unitIds.length === 0) {
    return { questions: [], note: '단원을 하나 이상 고르면 요약과 문제를 만들 수 있습니다.' }
  }
  if (kinds.length === 0) {
    return { questions: [], note: '기본, 변형, 고난도 가운데 하나 이상을 켜 주세요.' }
  }
  const seed = opts.seed ?? Date.now()
  const base = {
    subjectId: opts.subjectId,
    unitIds: opts.unitIds,
    count: opts.count,
    seed,
  }
  let note: string | null = null
  let pool = collect({ ...base, levels: windowFor(opts.level, 0), kinds })
  if (pool.length < opts.count) {
    const wider = collect({ ...base, levels: windowFor(opts.level, 1), kinds })
    if (wider.length > pool.length) {
      pool = wider
      note = '고른 난이도만으로는 서로 다른 문제가 부족해, 이웃한 난이도를 함께 넣었습니다.'
    }
  }
  if (pool.length < opts.count) {
    const relaxed = collect({
      ...base,
      levels: windowFor(opts.level, 1),
      kinds: ['basic', 'variation', 'hard'],
    })
    if (relaxed.length > pool.length) {
      pool = relaxed
      note = '선택한 유형만으로는 수가 부족해, 같은 범위의 다른 유형을 함께 넣었습니다.'
    }
  }
  if (pool.length === 0) {
    return {
      questions: [],
      note: '이 범위와 난이도에서 만들 문제가 없습니다. 단원을 더 고르거나 난이도를 한 단계 낮추세요.',
    }
  }
  const questions = weightedSample(pool, opts.count, opts.level, mulberry32(seed + 17))
  if (pool.length < opts.count) {
    const extra = `서로 다른 문항은 ${pool.length}개라 선택지 순서를 바꿔 ${questions.length}문제로 맞췄습니다.`
    note = note ? `${note} ${extra}` : extra
  }
  return { questions, note }
}
