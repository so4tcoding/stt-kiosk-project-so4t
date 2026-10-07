export type SubjectId =
  | 'algebra'
  | 'science'
  | 'korean'
  | 'english'
  | 'social'
  | 'history'

export type Kind = 'basic' | 'variation' | 'hard'

export type Level = 1 | 2 | 3 | 4 | 5

export type Unit = {
  id: string
  title: string
  chapter: string
  keywords: string[]
  summary: string[]
  traps: string[]
  repair: string
}

export type Subject = {
  id: SubjectId
  name: string
  short: string
  blurb: string
  color: string
  method: string[]
  units: Unit[]
}

export type Question = {
  id: string
  unitId: string
  difficulty: Level
  kind: Kind
  skill: string
  stem: string
  choices: string[]
  answer: number
  explanation: string
}

export type AttemptItem = {
  questionId: string
  unitId: string
  skill: string
  kind: Kind
  difficulty: Level
  correct: boolean
  choice: number
  stem: string
  choices: string[]
  answer: number
  explanation: string
}

export type Attempt = {
  id: string
  subjectId: SubjectId
  scopeTitle: string
  unitIds: string[]
  level: Level
  createdAt: number
  photoCount: number
  items: AttemptItem[]
}

export type KindFlags = Record<Kind, boolean>

export type Session = {
  id: string
  subjectId: SubjectId
  scopeTitle: string
  scopeNote: string
  unitIds: string[]
  level: Level
  kinds: KindFlags
  photos: string[]
  questions: Question[]
  note: string | null
  index: number
  picks: Array<number | null>
  revealed: boolean
}
