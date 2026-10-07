import type { Kind, Level, Question } from '../types'

export function q(
  id: string,
  unitId: string,
  difficulty: Level,
  kind: Kind,
  skill: string,
  stem: string,
  choices: [string, string, string, string, string],
  answer: 0 | 1 | 2 | 3 | 4,
  explanation: string,
): Question {
  return { id, unitId, difficulty, kind, skill, stem, choices: [...choices], answer, explanation }
}
