import { algebraBank } from './bankAlgebra'
import { englishBank } from './bankEnglish'
import { historyBank } from './bankHistory'
import { koreanBank } from './bankKorean'
import { scienceBank } from './bankScience'
import { socialBank } from './bankSocial'

export const bank = [
  ...algebraBank,
  ...scienceBank,
  ...koreanBank,
  ...englishBank,
  ...socialBank,
  ...historyBank,
]
