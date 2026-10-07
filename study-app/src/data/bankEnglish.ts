import { q } from './q'

const travel = `Some travelers fill every hour. Others leave one afternoon empty. On a three-day trip, Mina tried both. The planned museum visit taught her a clear route. The empty afternoon led her to a neighborhood market she would have missed.`

const art = `Norman Rockwell, an American illustrator, painted hundreds of magazine covers. Many pictures show ordinary people at home, at school, or on the street. Some later works also ask viewers to think about unfair treatment. A careful reading names both the everyday scene and the question it raises.`

const heritage = `A museum abroad opened one room for Korean crafts. Each label told how a skill was passed down and why a community still uses it. Visitors could see the objects, but one label never said who tells the story today.`

const tech = `A school club tested a small water filter. In one hour it made cloudy water look clear. The club also wrote that the filter did not remove every dissolved chemical. Their poster listed one benefit and one limit.`

const poster = `A poster shows smiling students under the words "Everyone joins." The photo includes only students in new sports shoes. A careful reader asks who is missing before trusting the slogan.`

export const englishBank = [
  q('eng-tr-1', 'travel', 1, 'basic', '요지', `${travel}\n\n이 글의 요지로 가장 적절한 것은?`, ['빈 오후가 계획에 없던 시장으로 이끌었다', '미나는 사흘 내내 박물관만 방문했다', '시장은 박물관보다 항상 더 교육적이다', '여행자는 시간을 비우면 길을 잃는다', '박물관에는 안내 지도가 없었다'], 0, '계획된 방문과 비운 오후를 비교합니다. 비운 오후가 동네 시장이라는 예상 밖 경험으로 이어진 점이 중심입니다.'),
  q('eng-tr-2', 'travel', 2, 'basic', '세부 내용', `${travel}\n\n글의 내용과 일치하는 것은?`, ['여행은 사흘이었고, 박물관 방문은 계획된 일정이었다', '시장은 여행 첫날 아침에 예약되어 있었다', '미나는 빈 오후를 호텔에서만 보냈다', '박물관은 문을 닫아 가지 못했다', '글은 비행기 연착을 설명한다'], 0, 'three-day trip와 planned museum visit가 본문에 있습니다. 시장의 예약이나 연착은 없습니다.'),
  q('eng-tr-3', 'travel', 3, 'variation', '비교', `${travel}\n\n두 여행 방식을 비교한 말로 가장 적절한 것은?`, ['계획된 일정은 경로를 분명히 했고, 빈 시간은 예상 밖 장소를 열었다', '둘 다 같은 시장을 반복해서 방문했다', '빈 오후는 박물관 관람을 취소한 실패였다', '계획된 방문에는 아무런 성과가 없었다', '글은 두 방식 중 하나만 옳다고 단정한다'], 0, 'taught her a clear route와 would have missed가 각 방식의 결과입니다. 하나를 실패로 바꾸면 글의 비교가 사라집니다.'),
  q('eng-tr-4', 'travel', 5, 'hard', '가정법', '지금과 다른 선택을 가정한 문장으로 가장 적절한 것은?', ['If Mina left every hour full, she would miss the market.', 'If Mina leaves every hour full, she missed the market yesterday.', 'If Mina would leave it full, she misses the market last year.', 'If Mina left it full, she will missed the market now.', 'If Mina is leaving it full, she had miss the market.'], 0, '가정법 과거는 지금의 다른 선택을 말합니다. If + 과거형, would + 동사원형입니다. 과거 시점의 사실 문장과 섞지 않습니다.'),

  q('eng-art-1', 'art', 1, 'basic', '소재', `${art}\n\n글의 내용과 일치하는 것은?`, ['록웰은 보통 사람들의 장면을 잡지 표지에 많이 그렸다', '그는 조선 시대의 산수화를 주로 그렸다', '그의 그림은 인물이 없는 지도뿐이다', '잡지 표지는 한 장만 남았다', '글은 그림 값을 비교한다'], 0, 'hundreds of magazine covers와 ordinary people이 본문입니다. 산수화나 가격은 이 글의 내용이 아닙니다.'),
  q('eng-art-2', 'art', 2, 'basic', '읽기', `${art}\n\n그림을 읽는 태도로 가장 적절한 것은?`, ['일상 장면과, 그 장면이 던지는 질문을 함께 말한다', '표지 장수만 세면 해석이 끝난다', '불공정에 대한 질문은 그림과 무관하므로 지운다', '화가의 이름을 안내자의 이름과 바꾼다', '잡지라는 단어를 보면 뉴스 기사로만 읽는다'], 0, '글은 everyday scene와 the question it raises를 함께 보라고 합니다. 장수나 가격으로 읽기를 끝내면 질문이 빠집니다.'),
  q('eng-art-3', 'art', 4, 'variation', '분사', '어법상 적절한 것은?', ['The students waiting by the painting looked curious.', 'The students waited by the painting looked curious.', 'The cover painting by Rockwell were one picture only.', 'The question raising by the picture was ignored it.', 'The people show in the cover was maps.'], 0, 'waiting은 학생들이 직접 기다리고 있으므로 현재분사입니다. waited만 쓰면 뒤에 looked와 동사가 겹칩니다.'),
  q('eng-art-4', 'art', 5, 'hard', '범위', `${art}\n\n요지 선지로 적절하지 않은 것은?`, ['모든 잡지 표지는 사회 문제를 해결하는 정책 문서이다', '록웰의 그림에는 보통 사람의 장면이 많다', '일부 작품은 불공정에 대해 묻는다', '그는 미국 일러스트레이터이다', '읽기는 장면과 질문을 함께 본다'], 0, '글은 한 화가의 표지와 질문 방식을 말합니다. 모든 표지를 정책 문서로 바꾸면 범위를 넘어섭니다.'),

  q('eng-her-1', 'heritage', 1, 'basic', '세부 내용', `${heritage}\n\n글의 내용과 일치하는 것은?`, ['라벨은 기술이 어떻게 이어졌는지 설명했다', '전시는 한국이 아니라 국내 학교 복도에서만 열렸다', '라벨은 오늘날 이야기하는 사람을 모두 적었다', '방문객은 물건을 볼 수 없었다', '글은 입장료의 인상만을 다룬다'], 0, 'how a skill was passed down이 라벨의 내용입니다. who tells the story today는 빠졌다고 했습니다.'),
  q('eng-her-2', 'heritage', 2, 'basic', '요지', `${heritage}\n\n이 글이 남기는 점으로 가장 적절한 것은?`, ['물건은 보이지만, 이야기를 전하는 사람은 라벨에서 빠질 수 있다', '해외 전시는 항상 주인을 분명히 밝힌다', '공예 기술은 더 이상 쓰이지 않는다', '라벨이 길면 전시가 실패한다', '방문객은 글자를 읽지 말아야 한다'], 0, '객체는 보이지만 one label never said who tells the story today. 빠진 화자를 요지에 남깁니다.'),
  q('eng-her-3', 'heritage', 3, 'variation', '추론의 한계', `${heritage}\n\n추론으로 가장 적절한 것은?`, ['전시가 기술을 소개해도, 이야기의 주체는 더 물어야 할 수 있다', '그 공예는 세계 최고가로 팔렸다', '라벨은 법률 문서와 같다', '방문객은 모두 한국어를 읽는다', '박물관은 전시를 하루 만에 닫았다'], 0, '빠진 정보에서 질문을 끌어내는 추론입니다. 가격, 법률, 폐관은 글에 없습니다.'),
  q('eng-her-4', 'heritage', 5, 'hard', '관계절', '어법상 올바른 문장은?', ['The label which explains the skill is short.', 'The label which it explains the skill is short.', 'The visitors which saw the room was many person.', 'The skill who passed down it is old.', 'The room which visitors entered it was closed.'], 0, 'which가 관계절의 주어이므로 it을 다시 넣지 않습니다. 사물에는 which, 사람에는 who를 씁니다.'),

  q('eng-tech-1', 'tech', 1, 'basic', '세부 내용', `${tech}\n\n글의 내용과 일치하는 것은?`, ['필터는 물을 맑게 했지만 모든 용해 물질을 없애지는 못했다', '필터는 한 시간 만에 모든 화학 물질을 제거했다', '동아리는 포스터에 장점만 적었다', '실험은 우주선 안에서 진행되었다', '물은 처음부터 맑았다'], 0, 'clear와 did not remove every dissolved chemical이 함께 있습니다. 포스터는 benefit과 limit를 둘 다 적었습니다.'),
  q('eng-tech-2', 'tech', 2, 'basic', '주제', `${tech}\n\n글의 주제로 가장 적절한 것은?`, ['기술의 효과와 한계를 함께 적어야 한다', '우주 여행 일정을 짜는 방법', '모든 정수기는 화학 물질을 완전히 없앤다', '동아리 포스터는 불필요하다', '흐린 물은 실험할 필요가 없다'], 0, '한 시간 뒤의 변화와, 남긴 한계가 글의 중심입니다. 우주 여행 일정으로 바꾸면 소재가 달라집니다.'),
  q('eng-tech-3', 'tech', 4, 'variation', '요약', `${tech}\n\n요약으로 가장 적절한 것은?`, ['The filter cleared cloudy water but left a chemical limit.', 'The poster hid every result.', 'The club removed all chemicals in one hour.', 'The test took place on a spacecraft.', 'Cloudy water was already safe without a filter.'], 0, '요약은 맑아진 결과와 용해 물질의 한계를 같이 남깁니다. 모든 물질을 제거했다는 선지는 본문과 반대입니다.'),
  q('eng-tech-4', 'tech', 5, 'hard', '범위', `${tech}\n\n본문이 직접 말한 범위로 옳은 것은?`, ['실험 주체는 학교 동아리이고, 시간은 한 시간이다', '우주 연구소가 이 필터를 인증했다', '모든 가정이 같은 필터를 써야 한다', '용해 물질은 건강에 무해하다고 단정했다', '포스터는 한계를 지웠다'], 0, 'A school club과 in one hour가 본문입니다. 인증, 가정 의무, 무해 단정은 글이 말하지 않습니다.'),

  q('eng-pic-1', 'picture', 1, 'basic', '그림 읽기', `${poster}\n\n포스터를 읽는 태도로 가장 적절한 것은?`, ['표어와 사진에 나온 사람이 같은 범위인지 확인한다', '웃는 얼굴이 있으면 표어는 자동으로 참이다', '운동화 색깔만 세면 충분하다', '빠진 사람은 물을 필요가 없다', '표어가 영어이면 사실을 검사하지 않는다'], 0, 'Everyone joins와 only students in new sports shoes의 범위가 다릅니다. 표어를 증명된 사실로 바꾸지 않습니다.'),
  q('eng-pic-2', 'picture', 2, 'basic', '세부 내용', `${poster}\n\n글의 내용과 일치하는 것은?`, ['사진에는 새 운동화를 신은 학생만 나온다', '포스터에는 글이 없다', '모든 학년의 신발이 보인다', '표어는 참여를 반대한다', '글을 읽는 사람은 질문을 하면 안 된다'], 0, 'only students in new sports shoes가 사진의 범위입니다. 표어는 Everyone joins입니다.'),
  q('eng-pic-3', 'picture', 3, 'variation', '추론', `${poster}\n\n추론으로 가장 적절한 것은?`, ['새 운동화를 신지 않은 학생은 사진 밖에 있을 수 있다', '표어가 학교 규칙을 이미 증명했다', '운동화를 신으면 누구나 사진에 들어간다', '포스터는 신발 가격표이다', '웃는 표정은 반대 의견을 없앤다'], 0, '사진에 없는 사람을 묻는 읽기입니다. 표어가 곧 증명이라고 보면 이미지를 사실로 착각합니다.'),
  q('eng-pic-4', 'picture', 5, 'hard', '요지의 범위', `${poster}\n\n요지로 적절하지 않은 것은?`, ['운동화를 새로 사면 모든 차별이 사라진다', '표어와 사진의 범위가 다를 수 있다', '누가 빠졌는지 물어야 한다', '웃는 얼굴만으로 표어를 믿기 어렵다', '이미지도 주장을 담을 수 있다'], 0, '글은 빠진 사람을 묻자고 합니다. 새 신발이 차별을 없앤다는 문장은 포스터의 표어를 사실로 확대한 것입니다.'),
]
