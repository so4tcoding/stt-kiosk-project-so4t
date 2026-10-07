import { scopeGroups } from '../data/curriculum'
import type { Subject, Unit } from '../types'

function squash(value: string): string {
  return value.toLowerCase().replace(/[^0-9a-z가-힣]/g, '').replace(/[와과의및]/g, '')
}

function tokens(text: string): string[] {
  return text
    .split(/[^0-9A-Za-z가-힣]+/)
    .map((part) => squash(part))
    .filter((part) => part.length >= 2)
}

function phraseSet(text: string): Set<string> {
  const parts = tokens(text)
  const set = new Set(parts)
  for (let size = 2; size <= 6; size++) {
    for (let index = 0; index + size <= parts.length; index++) {
      set.add(parts.slice(index, index + size).join(''))
    }
  }
  return set
}

export function suggestUnitIds(subject: Subject, text: string): string[] {
  const trimmed = text.trim()
  if (trimmed.length < 2) return []
  const phrases = phraseSet(trimmed)
  const picked = new Set<string>()
  for (const group of scopeGroups[subject.id]) {
    const phrase = squash(group.phrase)
    if (phrase.length <= 3 ? phrases.has(phrase) : phrases.has(phrase)) {
      if (phrases.has(phrase)) group.unitIds.forEach((id) => picked.add(id))
    }
  }
  for (const unit of subject.units) {
    if (unit.keywords.some((keyword) => phrases.has(squash(keyword)))) picked.add(unit.id)
  }
  return subject.units.map((unit) => unit.id).filter((id) => picked.has(id))
}

export function unitTitle(units: Unit[], unitId: string): string {
  return units.find((unit) => unit.id === unitId)?.title ?? unitId
}
