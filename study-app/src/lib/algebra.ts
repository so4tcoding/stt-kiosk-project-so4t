import type { Kind, Level, Question } from '../types'

type Rng = () => number

const LEVELS: Level[] = [1, 2, 3, 4, 5]

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function int(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1))
}

function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function pack(
  correct: string,
  wrongs: string[],
  rng: Rng,
): { choices: string[]; answer: number } | null {
  const unique: string[] = []
  for (const item of [correct, ...wrongs]) {
    if (!unique.includes(item)) unique.push(item)
    if (unique.length === 5) break
  }
  if (unique.length < 5 || !unique.includes(correct)) return null
  const choices = shuffle(rng, unique)
  return { choices, answer: choices.indexOf(correct) }
}

function q(
  partial: Omit<Question, 'choices' | 'answer' | 'id'> & { id: string },
  packed: { choices: string[]; answer: number },
): Question {
  return { ...partial, choices: packed.choices, answer: packed.answer }
}

function fmtLin(coef: number, constant: number): string {
  if (coef === 0) return String(constant)
  const body = coef === 1 ? 'x' : coef === -1 ? '-x' : `${coef}x`
  if (constant > 0) return `${body}+${constant}`
  if (constant < 0) return `${body}${constant}`
  return body
}

function pow(base: number, exp: number): number {
  return base ** exp
}

export function arithTerm(a: number, d: number, n: number): number {
  return a + (n - 1) * d
}

export function arithSum(a: number, d: number, n: number): number {
  return (n * (2 * a + (n - 1) * d)) / 2
}

export function geoTerm(a: number, r: number, n: number): number {
  return a * r ** (n - 1)
}

export function geoSum(a: number, r: number, n: number): number {
  if (r === 1) return a * n
  return (a * (r ** n - 1)) / (r - 1)
}

export function sumLinear(p: number, q: number, n: number): number {
  return (p * n * (n + 1)) / 2 + q * n
}

export function sumSquares(n: number): number {
  return (n * (n + 1) * (2 * n + 1)) / 6
}

type Factory = {
  unitId: string
  kind: Kind
  levels: Level[]
  make: (rng: Rng, level: Level, nonce: number) => Question | null
}

const roots: Array<[number, number, number]> = [
  [8, 3, 2],
  [27, 3, 3],
  [64, 3, 4],
  [125, 3, 5],
  [16, 4, 2],
  [81, 4, 3],
  [32, 5, 2],
  [1, 5, 1],
  [243, 5, 3],
  [256, 4, 4],
]

const rationalPowers: Array<[number, string, number]> = [
  [8, '2/3', 4],
  [27, '2/3', 9],
  [16, '3/4', 8],
  [81, '3/4', 27],
  [4, '5/2', 32],
  [9, '3/2', 27],
  [32, '2/5', 4],
  [16, '1/4', 2],
  [81, '1/4', 3],
]

const cosineTriples: Array<[number, number, number, number, string]> = [
  [3, 5, 7, 120, '1/2의 음수'],
  [7, 8, 13, 120, '1/2의 음수'],
  [5, 5, 5, 60, '1/2'],
  [7, 15, 13, 60, '1/2'],
  [8, 15, 13, 60, '1/2'],
  [5, 12, 13, 90, '0'],
  [6, 8, 10, 90, '0'],
  [9, 12, 15, 90, '0'],
]

function kindFor(level: Level, preferred: Kind): Kind {
  if (level <= 2) return 'basic'
  if (level === 3) return preferred === 'hard' ? 'variation' : preferred
  if (level === 4) return preferred === 'basic' ? 'variation' : preferred
  return 'hard'
}

const factories: Factory[] = [
  {
    unitId: 'exp-root',
    kind: 'basic',
    levels: [1, 2],
    make: (rng, level, nonce) => {
      const [value, root, answer] = pick(rng, roots)
      const packed = pack(String(answer), ['1', String(answer + 1), String(answer - 1), String(root), String(value)], rng)
      if (!packed) return null
      return q(
        {
          id: `alg-root-${nonce}`,
          unitId: 'exp-root',
          difficulty: level,
          kind: 'basic',
          skill: '거듭제곱근',
          stem: `${value}의 ${root === 3 ? '세제곱근' : root === 4 ? '네제곱근' : '다섯제곱근'} 중 실수인 값은?`,
          explanation: `${value} = ${answer}^${root} 이므로 실수인 ${root}제곱근은 ${answer}입니다. 짝수 제곱근과 달리 홀수 제곱근은 음수도 실수일 수 있지만, 이 값은 양수입니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'exp-root',
    kind: 'variation',
    levels: [3, 4],
    make: (rng, level, nonce) => {
      const correct = '√(-9)'
      const options = ['∛(-8)', '√9', '∛8', '√16', correct]
      const packed = pack(correct, options.filter((item) => item !== correct), rng)
      if (!packed) return null
      return q(
        {
          id: `alg-root-real-${nonce}`,
          unitId: 'exp-root',
          difficulty: level,
          kind: kindFor(level, 'variation'),
          skill: '실수인 거듭제곱근',
          stem: '다음 중 실수 범위에서 값을 정할 수 없는 것은?',
          explanation:
            '짝수 제곱근은 밑이 음수이면 실수가 아닙니다. √(-9)는 실수가 아닙니다. ∛(-8) = -2 로 실수이고, 나머지 양수의 제곱근도 실수입니다.',
        },
        packed,
      )
    },
  },
  {
    unitId: 'exp-law',
    kind: 'basic',
    levels: [1, 2],
    make: (rng, level, nonce) => {
      const base = pick(rng, [2, 3, 5])
      const m = int(rng, 2, level === 1 ? 4 : 5)
      const n = int(rng, 2, level === 1 ? 4 : 5)
      const value = pow(base, m + n)
      if (!Number.isSafeInteger(value) || value > 200000) return null
      const wrongs = [pow(base, m * n), pow(base, Math.abs(m - n)), pow(base, m + n + 1), pow(base, m) + pow(base, n), m + n]
        .filter((item) => Number.isFinite(item) && item !== value)
        .map(String)
      const packed = pack(String(value), wrongs, rng)
      if (!packed) return null
      return q(
        {
          id: `alg-mul-${nonce}`,
          unitId: 'exp-law',
          difficulty: level,
          kind: 'basic',
          skill: '지수법칙 곱',
          stem: `${base}^${m} × ${base}^${n} 의 값은?`,
          explanation: `밑이 같으면 지수를 더합니다. ${base}^${m} × ${base}^${n} = ${base}^${m + n} = ${value}입니다. 지수를 곱하면 ${base}^${m * n}이 되어 다른 값이 됩니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'exp-law',
    kind: 'basic',
    levels: [2, 3],
    make: (rng, level, nonce) => {
      const base = pick(rng, [2, 3, 5])
      const m = int(rng, 4, 7)
      const n = int(rng, 1, m - 1)
      const value = pow(base, m - n)
      const wrongs = [pow(base, m + n), pow(base, m * n), pow(base, n - m), pow(base, m) / n, m - n]
        .filter((item) => Number.isFinite(item) && item !== value)
        .map(String)
      const packed = pack(String(value), wrongs, rng)
      if (!packed) return null
      return q(
        {
          id: `alg-div-${nonce}`,
          unitId: 'exp-law',
          difficulty: level,
          kind: kindFor(level, 'basic'),
          skill: '지수법칙 나눗셈',
          stem: `${base}^${m} ÷ ${base}^${n} 의 값은?`,
          explanation: `밑이 같으면 나눌 때 지수를 뺍니다. ${base}^${m - n} = ${value}입니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'exp-law',
    kind: 'variation',
    levels: [3, 4, 5],
    make: (rng, level, nonce) => {
      const [base, expText, value] = pick(rng, rationalPowers)
      const wrongs = [String(value * base), String(value + 1), String(Math.max(value - 2, 0)), String(base), String(value * 2)]
      const packed = pack(String(value), wrongs, rng)
      if (!packed) return null
      return q(
        {
          id: `alg-rat-${nonce}`,
          unitId: 'exp-law',
          difficulty: level,
          kind: kindFor(level, 'variation'),
          skill: '유리수 지수',
          stem: `${base}^(${expText}) 의 값은?`,
          explanation: `a^(m/n)은 n제곱근을 구한 뒤 m제곱합니다. ${base}^(${expText}) = ${value}입니다. 분자를 밑의 지수로, 분모를 거듭제곱근의 차수로 읽으면 됩니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'exp-law',
    kind: 'hard',
    levels: [4, 5],
    make: (rng, level, nonce) => {
      for (let guard = 0; guard < 30; guard++) {
        const p = pick(rng, [1, 2, 3])
        const qv = pick(rng, [1, 2, 3])
        const a = int(rng, 1, 3)
        const c = int(rng, 0, 3)
        const b = int(rng, -2, 2)
        const d = int(rng, -2, 2)
        const coef = p * a - qv * c
        const constant = qv * d - p * b
        if (coef === 0 || constant % coef !== 0) continue
        const x = constant / coef
        if (x < -2 || x > 6) continue
        const left = 2 ** p
        const right = 2 ** qv
        if (left === right && a === c && b === d) continue
        const correct = String(x)
        const packed = pack(correct, [String(x + 1), String(x - 1), String(-x), String(x + 2), '0'], rng)
        if (!packed) continue
        return q(
          {
            id: `alg-eq-${nonce}-${guard}`,
            unitId: 'exp-apply',
            difficulty: level,
            kind: 'hard',
            skill: '지수방정식',
            stem: `${left}^(${fmtLin(a, b)}) = ${right}^(${fmtLin(c, d)}) 일 때 실수 x의 값은?`,
            explanation: `양쪽을 밑 2로 고치면 지수가 같아집니다. ${left}=2^${p}, ${right}=2^${qv} 이므로 ${p}(${fmtLin(a, b)}) = ${qv}(${fmtLin(c, d)}) 이고, x = ${x}입니다.`,
          },
          packed,
        )
      }
      return null
    },
  },
  {
    unitId: 'log-prop',
    kind: 'basic',
    levels: [1, 2],
    make: (rng, level, nonce) => {
      const base = pick(rng, [2, 3, 5, 10])
      const exp = int(rng, 1, base === 10 ? 4 : 6)
      const value = pow(base, exp)
      if (value > 100000) return null
      const packed = pack(String(exp), [String(exp + 1), String(Math.max(exp - 1, 0)), String(value), String(base), '0'], rng)
      if (!packed) return null
      return q(
        {
          id: `alg-log-${nonce}`,
          unitId: 'log-prop',
          difficulty: level,
          kind: 'basic',
          skill: '로그의 값',
          stem: `log_${base}(${value}) 의 값은?`,
          explanation: `${base}^${exp} = ${value} 이므로 log_${base}(${value}) = ${exp}입니다. 로그는 ‘밑을 몇 번 거듭제곱하면 진수가 되는지’를 묻는 수입니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'log-prop',
    kind: 'variation',
    levels: [3, 4, 5],
    make: (rng, level, nonce) => {
      const safe = [
        {
          stem: 'log_2(3) = a, log_2(5) = b일 때 log_2(45)를 a, b로 나타내면?',
          correct: '2a+b',
          wrongs: ['a+b', 'a+2b', '2a+2b', 'a+b+1'],
          why: '45 = 3² × 5 이므로 log_2(45) = 2log_2(3) + log_2(5) = 2a+b입니다.',
        },
        {
          stem: 'log_2(3) = a, log_2(5) = b일 때 log_2(75)를 a, b로 나타내면?',
          correct: 'a+2b',
          wrongs: ['2a+b', 'a+b', '2a+2b', 'ab'],
          why: '75 = 3 × 5² 이므로 log_2(75) = a + 2b입니다.',
        },
        {
          stem: 'log_2(3) = a일 때 log_2(72)를 a로 나타내면?',
          correct: '3+2a',
          wrongs: ['3+3a', '2+3a', '6a', '3a'],
          why: '72 = 2³ × 3² 이므로 log_2(72) = 3 + 2a입니다. 3의 지수를 3으로 세면 3+3a가 되어 틀립니다.',
        },
        {
          stem: 'log_2(3) = a, log_2(5) = b일 때 log_2(15/2)를 a, b로 나타내면?',
          correct: 'a+b-1',
          wrongs: ['a+b+1', 'a+b', 'ab-1', 'a-b'],
          why: '15/2 = 3 × 5 × 2^(-1) 이므로 log_2(15/2) = a + b - 1입니다.',
        },
      ]
      const item = pick(rng, safe)
      const packed = pack(item.correct, item.wrongs, rng)
      if (!packed) return null
      return q(
        {
          id: `alg-logp-${nonce}`,
          unitId: 'log-prop',
          difficulty: level,
          kind: kindFor(level, 'variation'),
          skill: '로그의 성질',
          stem: item.stem,
          explanation: item.why,
        },
        packed,
      )
    },
  },
  {
    unitId: 'log-prop',
    kind: 'hard',
    levels: [4, 5],
    make: (rng, level, nonce) => {
      const base = pick(rng, [2, 3, 5])
      const k = int(rng, 2, 4)
      const m = int(rng, -2, 4)
      const arg = pow(base, k)
      const x = arg - m
      if (x <= 0 || arg <= 0) return null
      if (m === 0 && x === arg) {
        // still valid
      }
      if (x + m <= 0) return null
      const correct = String(x)
      const packed = pack(correct, [String(x + 1), String(Math.max(x - 1, 0)), String(arg), String(k), String(base)], rng)
      if (!packed) return null
      const inside = m === 0 ? 'x' : m > 0 ? `x+${m}` : `x${m}`
      return q(
        {
          id: `alg-logeq-${nonce}`,
          unitId: 'exp-apply',
          difficulty: level,
          kind: 'hard',
          skill: '로그방정식',
          stem: `log_${base}(${inside}) = ${k} 를 만족하는 x의 값은?`,
          explanation: `로그의 정의로 되돌리면 ${inside} = ${base}^${k} = ${arg} 입니다. 따라서 x = ${x}입니다. 진수는 양수여야 하며, 이 값은 그 조건을 만족합니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'common-log',
    kind: 'basic',
    levels: [2, 3],
    make: (rng, level, nonce) => {
      const items = [
        { stem: 'log(10000) 의 값은? (밑은 10)', correct: '4', wrongs: ['3', '5', '10000', '2'] },
        { stem: 'log(0.01) 의 값은? (밑은 10)', correct: '-2', wrongs: ['2', '-1', '0.01', '1'] },
        { stem: 'log(10) 의 값은? (밑은 10)', correct: '1', wrongs: ['0', '10', '2', '-1'] },
      ]
      const item = pick(rng, items)
      const packed = pack(item.correct, [...item.wrongs, '100'], rng)
      if (!packed) return null
      return q(
        {
          id: `alg-clog-${nonce}`,
          unitId: 'common-log',
          difficulty: level,
          kind: kindFor(level, 'basic'),
          skill: '상용로그의 값',
          stem: item.stem,
          explanation: `상용로그는 밑이 10입니다. 10^${item.correct} 이 진수가 되므로 값은 ${item.correct}입니다. 소수 0.01은 10^(-2)라서 음수입니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'common-log',
    kind: 'hard',
    levels: [4, 5],
    make: (rng, level, nonce) => {
      const items = [
        { stem: 'log 2 = a일 때 log 40 을 a로 나타내면? (밑은 10)', correct: '1+2a', wrongs: ['2+a', '1+a', '2a', 'a+4'], why: '40 = 10 × 4 = 10 × 2² 이므로 log 40 = 1 + 2a입니다.' },
        { stem: 'log 2 = a일 때 log 5 를 a로 나타내면? (밑은 10)', correct: '1-a', wrongs: ['a-1', '1+a', 'a/2', '2-a'], why: '5 = 10 / 2 이므로 log 5 = 1 - log 2 = 1 - a입니다.' },
        { stem: 'log 2 = a일 때 log 20 을 a로 나타내면? (밑은 10)', correct: '1+a', wrongs: ['2+a', '1+2a', 'a', '2a'], why: '20 = 10 × 2 이므로 log 20 = 1 + a입니다.' },
      ]
      const item = pick(rng, items)
      const packed = pack(item.correct, item.wrongs, rng)
      if (!packed) return null
      return q(
        {
          id: `alg-clog2-${nonce}`,
          unitId: 'common-log',
          difficulty: level,
          kind: 'hard',
          skill: '상용로그의 변환',
          stem: item.stem,
          explanation: item.why,
        },
        packed,
      )
    },
  },
  {
    unitId: 'exp-fn',
    kind: 'basic',
    levels: [1, 2, 3],
    make: (rng, level, nonce) => {
      const base = pick(rng, [2, 3, 4, 5])
      const x = int(rng, 2, level === 1 ? 3 : 4)
      const value = pow(base, x)
      if (value > 10000) return null
      const packed = pack(String(value), [String(base * x), String(value / base), String(pow(base, x - 1)), String(x), String(base + x)], rng)
      if (!packed) return null
      return q(
        {
          id: `alg-expfn-${nonce}`,
          unitId: 'exp-fn',
          difficulty: level,
          kind: kindFor(level, 'basic'),
          skill: '지수함수의 함숫값',
          stem: `함수 y = ${base}^x 에서 x = ${x}일 때 y의 값은?`,
          explanation: `${base}^${x} = ${value}입니다. 지수함수에서는 입력 x가 지수가 됩니다. ${base} × ${x} = ${base * x}와 혼동하지 않습니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'log-fn',
    kind: 'basic',
    levels: [2, 3],
    make: (rng, level, nonce) => {
      const base = pick(rng, [2, 3, 10])
      const exp = int(rng, 1, 4)
      const input = pow(base, exp)
      const packed = pack(String(exp), [String(input), String(base), '0', '1', String(exp + 1)], rng)
      if (!packed) return null
      return q(
        {
          id: `alg-logfn-${nonce}`,
          unitId: 'log-fn',
          difficulty: level,
          kind: kindFor(level, 'basic'),
          skill: '로그함수의 함숫값',
          stem: `함수 y = log_${base}(x) 에서 x = ${input}일 때 y의 값은?`,
          explanation: `로그함수는 지수함수의 역함수입니다. ${base}^${exp} = ${input} 이므로 y = ${exp}입니다. 이 그래프는 (1, 0)을 지납니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'angle',
    kind: 'basic',
    levels: [1, 2, 3],
    make: (rng, level, nonce) => {
      const table = [
        [30, 'π/6'],
        [45, 'π/4'],
        [60, 'π/3'],
        [90, 'π/2'],
        [120, '2π/3'],
        [135, '3π/4'],
        [150, '5π/6'],
        [180, 'π'],
        [270, '3π/2'],
        [360, '2π'],
      ] as const
      const pool = level === 1 ? table.slice(0, 5) : table
      const [deg, rad] = pick(rng, pool)
      const wrongs = ['π/2', 'π/3', 'π/4', 'π/6', 'π', '2π', '2π/3', '3π/2'].filter((item) => item !== rad)
      const packed = pack(rad, wrongs, rng)
      if (!packed) return null
      return q(
        {
          id: `alg-rad-${nonce}`,
          unitId: 'angle',
          difficulty: level,
          kind: kindFor(level, 'basic'),
          skill: '호도법',
          stem: `${deg}° 를 호도법으로 바르게 나타낸 것은?`,
          explanation: `180° = π rad 이므로 1° = π/180 rad 입니다. ${deg}° = ${deg} × π/180 = ${rad} 입니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'trig',
    kind: 'basic',
    levels: [1, 2, 3, 4],
    make: (rng, level, nonce) => {
      const easy: Array<[string, string]> = [
        ['sin 30°', '1/2'],
        ['cos 60°', '1/2'],
        ['sin 60°', '√3/2'],
        ['cos 30°', '√3/2'],
        ['tan 45°', '1'],
        ['sin 90°', '1'],
        ['cos 90°', '0'],
        ['sin 0°', '0'],
        ['cos 0°', '1'],
      ]
      const hard: Array<[string, string]> = [
        ['sin 150°', '1/2'],
        ['cos 150°', '-√3/2'],
        ['sin 210°', '-1/2'],
        ['cos 240°', '-1/2'],
        ['tan 180°', '0'],
        ['sin 270°', '-1'],
        ['cos 180°', '-1'],
      ]
      const [label, correct] = pick(rng, level >= 4 ? hard : easy)
      const wrongs = ['1/2', '-1/2', '√3/2', '-√3/2', '√2/2', '1', '0', '-1'].filter((item) => item !== correct)
      const packed = pack(correct, wrongs, rng)
      if (!packed) return null
      return q(
        {
          id: `alg-trig-${nonce}`,
          unitId: 'trig',
          difficulty: level,
          kind: kindFor(level, level >= 4 ? 'hard' : 'basic'),
          skill: '삼각함수의 값',
          stem: `${label} 의 값은?`,
          explanation: `${label} = ${correct} 입니다. 90°보다 큰 각은 기준각의 삼각비로 크기를 정하고, 사분면으로 부호를 정합니다. 사인은 1·2사분면에서 양수, 코사인은 1·4사분면에서 양수입니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'trig-graph',
    kind: 'variation',
    levels: [2, 3, 4, 5],
    make: (rng, level, nonce) => {
      const amp = int(rng, 2, 5)
      const b = pick(rng, [1, 2, 3])
      const askPeriod = level >= 4 || rng() > 0.5
      if (askPeriod) {
        const period = b === 1 ? '2π' : b === 2 ? 'π' : '2π/3'
        const wrongs = ['2π', 'π', '2π/3', 'π/2', '4π', 'π/3'].filter((item) => item !== period)
        const packed = pack(period, wrongs, rng)
        if (!packed) return null
        return q(
          {
            id: `alg-period-${nonce}`,
            unitId: 'trig-graph',
            difficulty: level,
            kind: kindFor(level, 'variation'),
            skill: '주기',
            stem: `함수 y = ${amp}sin(${b === 1 ? 'x' : `${b}x`}) 의 주기는?`,
            explanation: `y = sin(bx)의 주기는 2π/|b| 입니다. b = ${b} 이므로 주기는 ${period}입니다. 앞의 ${amp}는 진폭이고 주기를 바꾸지 않습니다.`,
          },
          packed,
        )
      }
      const packed = pack(String(amp), [String(amp * 2), '1', String(b), String(amp + 1), '2π'], rng)
      if (!packed) return null
      return q(
        {
          id: `alg-amp-${nonce}`,
          unitId: 'trig-graph',
          difficulty: level,
          kind: kindFor(level, 'variation'),
          skill: '진폭',
          stem: `함수 y = ${amp}sin(${b === 1 ? 'x' : `${b}x`}) 의 진폭은?`,
          explanation: `y = A sin(bx)에서 진폭은 |A| = ${amp}입니다. 괄호 안의 ${b}는 주기를 2π/${b}로 바꿉니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'law',
    kind: 'variation',
    levels: [3, 4],
    make: (rng, level, nonce) => {
      const cases = [
        { stem: '삼각형 ABC에서 A = 30°, a = 6, B = 90°일 때 변 b의 길이는?', correct: '12', wrongs: ['6', '3', '6√3', '18'], why: '사인법칙 a/sin A = b/sin B. b = 6 × sin90° / sin30° = 6 × 1 / (1/2) = 12입니다.' },
        { stem: '삼각형 ABC에서 A = 30°, a = 4, B = 90°일 때 변 b의 길이는?', correct: '8', wrongs: ['4', '2', '4√3', '12'], why: 'b = 4 × sin90° / sin30° = 8입니다.' },
        { stem: '삼각형 ABC에서 A = 30°, B = 60°, a = 5일 때 변 b의 길이는?', correct: '5√3', wrongs: ['5', '10', '5/√3', '√3'], why: 'b = 5 × sin60° / sin30° = 5 × (√3/2) / (1/2) = 5√3입니다.' },
      ]
      const item = pick(rng, cases)
      const packed = pack(item.correct, item.wrongs, rng)
      if (!packed) return null
      return q(
        {
          id: `alg-sine-${nonce}`,
          unitId: 'law',
          difficulty: level,
          kind: 'variation',
          skill: '사인법칙',
          stem: item.stem,
          explanation: item.why,
        },
        packed,
      )
    },
  },
  {
    unitId: 'law',
    kind: 'hard',
    levels: [4, 5],
    make: (rng, level, nonce) => {
      const [a, b, c, angle] = pick(rng, cosineTriples)
      const askSide = rng() > 0.45
      if (askSide) {
        const packed = pack(String(c), [String(a + b), String(Math.abs(a - b)), String(c + 1), String(c - 1), String(a)], rng)
        if (!packed) return null
        return q(
          {
            id: `alg-cos-${nonce}`,
            unitId: 'law',
            difficulty: level,
            kind: 'hard',
            skill: '코사인법칙',
            stem: `삼각형에서 두 변 ${a}, ${b}가 끼인각 ${angle}°를 이룰 때, 그 끼인각의 대변 길이는?`,
            explanation: `코사인법칙 c² = a² + b² - 2ab cos C 입니다. C = ${angle}°이면 c = ${c}입니다. 90°이면 피타고라스, 60°이면 cos=1/2, 120°이면 cos=-1/2라서 항의 부호가 바뀝니다.`,
          },
          packed,
        )
      }
      const packed = pack(`${angle}°`, ['30°', '45°', '60°', '90°', '120°', '150°'].filter((item) => item !== `${angle}°`), rng)
      if (!packed) return null
      return q(
        {
          id: `alg-cosang-${nonce}`,
          unitId: 'law',
          difficulty: level,
          kind: 'hard',
          skill: '코사인법칙',
          stem: `세 변의 길이가 ${a}, ${b}, ${c}인 삼각형에서, 변 ${c}의 대각 크기는?`,
          explanation: `cos C = (a² + b² - c²) / (2ab) 를 계산하면 C = ${angle}°입니다. 분자 a²+b²-c²의 부호가 음수이면 둔각입니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'seq',
    kind: 'basic',
    levels: [1, 2, 3],
    make: (rng, level, nonce) => {
      const a = int(rng, -4, 8)
      const d = pick(rng, [-3, -2, 2, 3, 4, 5])
      const n = int(rng, 5, level === 1 ? 8 : 12)
      const value = arithTerm(a, d, n)
      const forgot = a + n * d
      const packed = pack(String(value), [String(forgot), String(value + d), String(value - d), String(a + d), String(n)], rng)
      if (!packed) return null
      return q(
        {
          id: `alg-arith-${nonce}`,
          unitId: 'seq',
          difficulty: level,
          kind: kindFor(level, 'basic'),
          skill: '등차수열의 일반항',
          stem: `첫째항이 ${a}이고 공차가 ${d}인 등차수열의 제${n}항은?`,
          explanation: `일반항은 a + (n-1)d 입니다. ${a} + ${n - 1}×(${d}) = ${value}입니다. n을 그대로 곱하면 ${forgot}이 되어 한 항만큼 어긋납니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'seq',
    kind: 'variation',
    levels: [3, 4, 5],
    make: (rng, level, nonce) => {
      const a = int(rng, 1, 9)
      const d = pick(rng, [2, 3, 4, -2])
      const n = int(rng, 8, 15)
      const value = arithSum(a, d, n)
      if (!Number.isInteger(value)) return null
      const wrongN = (n * (2 * a + n * d)) / 2
      const packed = pack(
        String(value),
        [String(wrongN), String(value + a), String(arithTerm(a, d, n)), String(n * a), String(value - d)],
        rng,
      )
      if (!packed) return null
      return q(
        {
          id: `alg-arithsum-${nonce}`,
          unitId: 'seq',
          difficulty: level,
          kind: kindFor(level, 'variation'),
          skill: '등차수열의 합',
          stem: `첫째항 ${a}, 공차 ${d}인 등차수열의 첫째항부터 제${n}항까지의 합은?`,
          explanation: `합은 n/2 × {2a + (n-1)d} = ${value}입니다. (n-1) 대신 n을 넣으면 합이 달라집니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'geo',
    kind: 'basic',
    levels: [1, 2, 3],
    make: (rng, level, nonce) => {
      const a = pick(rng, [2, 3, 4, 5])
      const r = pick(rng, level >= 3 ? [2, 3, -2] : [2, 3])
      const n = int(rng, 3, r === -2 ? 5 : 6)
      const value = geoTerm(a, r, n)
      const arithLike = a + (n - 1) * r
      const packed = pack(String(value), [String(arithLike), String(a * r * n), String(value * r), String(a ** n), String(r ** n)], rng)
      if (!packed) return null
      return q(
        {
          id: `alg-geo-${nonce}`,
          unitId: 'geo',
          difficulty: level,
          kind: kindFor(level, 'basic'),
          skill: '등비수열의 일반항',
          stem: `첫째항이 ${a}이고 공비가 ${r}인 등비수열의 제${n}항은?`,
          explanation: `일반항은 a × r^(n-1) = ${value}입니다. 등차수열처럼 (n-1)을 곱하면 ${arithLike}이 됩니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'geo',
    kind: 'hard',
    levels: [4, 5],
    make: (rng, level, nonce) => {
      const a = pick(rng, [2, 3, 4])
      const r = pick(rng, [2, 3, -2])
      const n = int(rng, 3, r === 3 ? 5 : 6)
      const value = geoSum(a, r, n)
      if (!Number.isInteger(value)) return null
      const packed = pack(
        String(value),
        [String(geoTerm(a, r, n)), String(value + a), String(a * (r ** n + 1) / (r - 1)), String(n * a), String(value - r)],
        rng,
      )
      if (!packed) return null
      return q(
        {
          id: `alg-geosum-${nonce}`,
          unitId: 'geo',
          difficulty: level,
          kind: 'hard',
          skill: '등비수열의 합',
          stem: `첫째항 ${a}, 공비 ${r}인 등비수열의 첫째항부터 제${n}항까지의 합은?`,
          explanation: `공비가 1이 아니면 합은 a(r^n - 1)/(r - 1) = ${value}입니다. 분자의 지수는 n이고 n-1이 아닙니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'sigma',
    kind: 'variation',
    levels: [2, 3, 4, 5],
    make: (rng, level, nonce) => {
      const p = int(rng, 2, 6)
      const constantTerm = int(rng, -3, 5)
      const n = int(rng, 5, level >= 4 ? 20 : 12)
      if (level >= 5 && rng() > 0.5) {
        const value = sumSquares(n)
        if (!Number.isInteger(value)) return null
        const packed = pack(String(value), [String(sumLinear(1, 0, n)), String(value + n), String(n * n), String(sumSquares(n - 1)), String(value - n)], rng)
        if (!packed) return null
        return q(
          {
            id: `alg-sq-${nonce}`,
            unitId: 'sigma',
            difficulty: level,
            kind: 'hard',
            skill: '제곱의 합',
            stem: `∑(k=1부터 ${n}까지) k² 의 값은?`,
            explanation: `1²부터 n²까지의 합은 n(n+1)(2n+1)/6 = ${value}입니다. 1부터 n까지의 합 n(n+1)/2와 공식을 바꾸면 틀립니다.`,
          },
          packed,
        )
      }
      const value = sumLinear(p, constantTerm, n)
      if (!Number.isInteger(value)) return null
      const packed = pack(
        String(value),
        [String(sumLinear(p, constantTerm, n - 1)), String(p * n + constantTerm), String(sumLinear(constantTerm, p, n)), String(value + p), String(n * (p + constantTerm))],
        rng,
      )
      if (!packed) return null
      const sign = constantTerm < 0 ? String(constantTerm) : constantTerm > 0 ? `+${constantTerm}` : ''
      return q(
        {
          id: `alg-sigma-${nonce}`,
          unitId: 'sigma',
          difficulty: level,
          kind: kindFor(level, 'variation'),
          skill: '시그마의 선형성',
          stem: `∑(k=1부터 ${n}까지) (${p}k${sign}) 의 값은?`,
          explanation: `합은 ${p} × n(n+1)/2 + (${constantTerm}) × n = ${value}입니다. 시그마는 덧셈으로 쪼개고, 상수 ${constantTerm}은 n번 더합니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'exp-apply',
    kind: 'variation',
    levels: [2, 3, 4],
    make: (rng, level, nonce) => {
      const start = pick(rng, [1, 2, 3, 5])
      const hours = int(rng, 2, 5)
      const value = start * 2 ** hours
      const packed = pack(
        String(value),
        [String(start * 2 * hours), String(start + 2 * hours), String(value / 2), String(2 ** hours), String(start * hours)],
        rng,
      )
      if (!packed) return null
      return q(
        {
          id: `alg-double-${nonce}`,
          unitId: 'exp-apply',
          difficulty: level,
          kind: kindFor(level, 'variation'),
          skill: '지수 모형',
          stem: `어떤 양이 1시간마다 2배가 된다. 처음 ${start}이었다면 ${hours}시간 뒤의 양은?`,
          explanation: `${hours}시간 뒤는 처음 양에 2^${hours}를 곱합니다. ${start} × ${2 ** hours} = ${value}입니다. ${start} × 2 × ${hours}처럼 2를 ${hours}번 곱하지 않고 ${hours}를 곱하면 등차처럼 읽은 것입니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'exp-apply',
    kind: 'hard',
    levels: [4, 5],
    make: (rng, level, nonce) => {
      const half = pick(rng, [2, 4])
      const steps = pick(rng, [2, 3])
      const time = half * steps
      const start = pick(rng, [40, 80, 160])
      const value = start / 2 ** steps
      if (!Number.isInteger(value)) return null
      const packed = pack(
        String(value),
        [String(start / 2), String(start - half * steps), String(value * 2), String(start / half), String(steps)],
        rng,
      )
      if (!packed) return null
      return q(
        {
          id: `alg-half-${nonce}`,
          unitId: 'exp-apply',
          difficulty: level,
          kind: 'hard',
          skill: '반감기',
          stem: `처음 양이 ${start}이고 반감기가 ${half}시간인 물질이 있다. ${time}시간 뒤에 남는 양은?`,
          explanation: `${time}시간은 반감기 ${steps}번입니다. 남는 양은 ${start} × (1/2)^${steps} = ${value}입니다. 반감기가 한 번 지날 때마다 절반이 되며, 지난 시간만큼 일정량을 빼는 계산이 아닙니다.`,
        },
        packed,
      )
    },
  },
  {
    unitId: 'induct',
    kind: 'variation',
    levels: [2, 3, 4],
    make: (rng, level, nonce) => {
      const a1 = int(rng, 1, 4)
      const mult = pick(rng, [2, 3])
      const add = pick(rng, [-1, 1, 2])
      const n = level >= 4 ? 5 : 4
      let value = a1
      for (let i = 1; i < n; i++) value = mult * value + add
      const oneStepShort = (() => {
        let v = a1
        for (let i = 1; i < n - 1; i++) v = mult * v + add
        return v
      })()
      const packed = pack(String(value), [String(oneStepShort), String(mult * value + add), String(a1 * mult ** (n - 1)), String(value + add), String(a1 + n)], rng)
      if (!packed) return null
      return q(
        {
          id: `alg-rec-${nonce}`,
          unitId: 'induct',
          difficulty: level,
          kind: kindFor(level, 'variation'),
          skill: '귀납적 정의',
          stem: `a₁ = ${a1}, a_(n+1) = ${mult}a_n ${add < 0 ? add : `+ ${add}`} 일 때 a_${n} 의 값은?`,
          explanation: `앞 항으로 다음 항을 ${n - 1}번 계산하면 a_${n} = ${value}입니다. 한 단계 덜 계산하면 ${oneStepShort}이 됩니다.`,
        },
        packed,
      )
    },
  },
]

function emittedUnitIds(factory: Factory): string[] {
  if (factory.unitId === 'exp-law' && factory.kind === 'hard') return ['exp-apply']
  if (factory.unitId === 'log-prop' && factory.kind === 'hard') return ['exp-apply']
  return [factory.unitId]
}

function matches(factory: Factory, unitIds: string[], level: Level, kinds: Kind[]): boolean {
  if (!emittedUnitIds(factory).some((id) => unitIds.includes(id))) return false
  if (!factory.levels.includes(level)) return false
  const outKind = kindFor(level, factory.kind)
  return kinds.includes(outKind) || kinds.includes(factory.kind)
}

export function generateAlgebraQuestions(opts: {
  unitIds: string[]
  level: Level
  kinds: Kind[]
  count: number
  seed: number
}): Question[] {
  const { unitIds, level, kinds, count, seed } = opts
  const rng = mulberry32(seed || 1)
  const usable = factories.filter((factory) => matches(factory, unitIds, level, kinds))
  const made: Question[] = []
  let nonce = 1
  let spins = 0
  while (made.length < count && usable.length > 0 && spins < count * 40) {
    spins++
    const factory = usable[Math.floor(rng() * usable.length)]
    const question = factory.make(rng, level, nonce++)
    if (!question) continue
    if (!unitIds.includes(question.unitId)) continue
    if (!kinds.includes(question.kind)) continue
    if (question.difficulty !== level) continue
    if (new Set(question.choices).size !== 5) continue
    if (question.answer < 0 || question.choices[question.answer] === undefined) continue
    if (question.choices.some((choice) => choice.includes('NaN') || choice.includes('Infinity'))) continue
    if (made.some((item) => item.stem === question.stem)) continue
    made.push(question)
  }
  return made
}

export function algebraGeneratorUnitIds(): string[] {
  return [
    'exp-root',
    'exp-law',
    'log-prop',
    'common-log',
    'exp-fn',
    'log-fn',
    'exp-apply',
    'angle',
    'trig',
    'trig-graph',
    'law',
    'seq',
    'geo',
    'sigma',
    'induct',
  ]
}

export function assertAlgebraFormulas(): void {
  if (arithTerm(3, -2, 10) !== -15) throw new Error('arith term')
  if (arithSum(3, -2, 10) !== -60) throw new Error('arith sum')
  if (geoTerm(2, -2, 4) !== -16) throw new Error('geo term')
  if (geoSum(2, -2, 4) !== -10) throw new Error('geo sum')
  if (geoSum(3, 2, 5) !== 93) throw new Error('geo sum 2')
  if (sumLinear(3, 1, 10) !== 175) throw new Error('sigma')
  if (sumSquares(10) !== 385) throw new Error('squares')
  for (const [a, b, c, angle] of cosineTriples) {
    const cos = angle === 60 ? 0.5 : angle === 120 ? -0.5 : angle === 90 ? 0 : NaN
    const expected = a * a + b * b - 2 * a * b * cos
    if (expected !== c * c) throw new Error(`cosine ${a},${b},${c},${angle}`)
  }
  for (const level of LEVELS) {
    const questions = generateAlgebraQuestions({
      unitIds: algebraGeneratorUnitIds(),
      level,
      kinds: ['basic', 'variation', 'hard'],
      count: 25,
      seed: 1000 + level,
    })
    if (questions.length < 12) throw new Error(`too few at level ${level}: ${questions.length}`)
    for (const question of questions) {
      if (question.choices.length !== 5) throw new Error('choices')
      if (new Set(question.choices).size !== 5) throw new Error(`dup ${question.stem}`)
    }
  }
}
