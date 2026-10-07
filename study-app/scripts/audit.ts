import { bank } from '../src/data/bank.ts'
import { getSubject, subjects } from '../src/data/curriculum.ts'
import { assertAlgebraFormulas } from '../src/lib/algebra.ts'
import { buildQuestions } from '../src/lib/session.ts'
import { suggestUnitIds } from '../src/lib/suggest.ts'
import type { SubjectId } from '../src/types.ts'

assertAlgebraFormulas()

const unitIds = new Set(subjects.flatMap((subject) => subject.units.map((unit) => unit.id)))
const seen = new Set<string>()
for (const question of bank) {
  if (seen.has(question.id)) throw new Error(`dup id ${question.id}`)
  seen.add(question.id)
  if (!unitIds.has(question.unitId)) throw new Error(`unknown unit ${question.unitId}`)
  if (question.choices.length !== 5) throw new Error(`choices ${question.id}`)
  if (new Set(question.choices).size !== 5) throw new Error(`same choices ${question.id}`)
  if (question.answer < 0 || question.answer > 4) throw new Error(`answer ${question.id}`)
  if (!question.explanation || !question.stem) throw new Error(`empty ${question.id}`)
}

for (const subject of subjects) {
  if (subject.id === 'algebra') continue
  for (const unit of subject.units) {
    const mine = bank.filter((question) => question.unitId === unit.id)
    if (!mine.some((question) => question.kind === 'basic')) throw new Error(`no basic ${unit.id}`)
    if (!mine.some((question) => question.kind === 'hard')) throw new Error(`no hard ${unit.id}`)
  }
}

const algebra = getSubject('algebra')
const trig = suggestUnitIds(algebra, 'Ⅱ. 삼각함수\n사인법칙')
for (const id of ['angle', 'trig', 'trig-graph', 'law']) {
  if (!trig.includes(id)) throw new Error(`trig suggest missing ${id}`)
}
const seqOnly = suggestUnitIds(algebra, '등차수열')
if (!seqOnly.includes('seq') || seqOnly.includes('geo')) throw new Error(`seq suggest ${seqOnly.join(',')}`)

const korean = getSubject('korean')
function expectUnits(text: string, ids: string[]) {
  const got = suggestUnitIds(korean, text)
  for (const id of ids) {
    if (!got.includes(id)) throw new Error(`korean suggest "${text}" missing ${id}: ${got.join(',')}`)
  }
  return got
}
expectUnits('제망매가', ['old-song'])
expectUnits('속미인곡', ['old-song'])
expectUnits('춘향전', ['classic-novel'])
expectUnits('수라', ['modern-poem'])
expectUnits('한글 맞춤법', ['spelling'])
expectUnits('현대 시 감상하기', ['modern-poem'])
expectUnits('고속 철도가 지나간다고', ['negotiate'])
const literature = expectUnits('한국 문학의 길', ['old-song', 'classic-novel', 'modern-poem', 'modern-novel'])
if (literature.includes('spelling')) throw new Error(`literature spilled ${literature.join(',')}`)
const songs = suggestUnitIds(korean, '제망매가\n속미인곡')
if (!songs.includes('old-song') || songs.includes('modern-novel')) throw new Error(`songs ${songs.join(',')}`)

const subjectsToTry: SubjectId[] = ['algebra', 'science', 'korean', 'english', 'social', 'history']
for (const subjectId of subjectsToTry) {
  const subject = getSubject(subjectId)
  for (const level of [1, 3, 5] as const) {
    const built = buildQuestions({
      subjectId,
      unitIds: subject.units.map((unit) => unit.id),
      level,
      kinds: { basic: true, variation: true, hard: true },
      count: 8,
      seed: 42 + level,
    })
    if (built.questions.length < 8) throw new Error(`${subjectId} level ${level} got ${built.questions.length}`)
    for (const question of built.questions) {
      if (new Set(question.choices).size !== question.choices.length) throw new Error(question.stem)
      if (question.choices[question.answer] === undefined) throw new Error(question.id)
    }
  }
}

console.log(`audit ok: ${bank.length} bank questions`)
