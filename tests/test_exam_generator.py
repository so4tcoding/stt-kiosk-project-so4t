import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "exam_studio"))

import generator


class StyleTrainingTests(unittest.TestCase):
    def setUp(self):
        if generator.CUSTOM_PATH.exists():
            generator.CUSTOM_PATH.unlink()

    def tearDown(self):
        if generator.CUSTOM_PATH.exists():
            generator.CUSTOM_PATH.unlink()

    def test_bank_and_house_styles(self):
        bank = generator.validate_bank()
        self.assertGreaterEqual(len(bank), 30)
        styles = generator.get_styles()
        workbook = styles["workbook"]
        mock = styles["mock"]
        self.assertTrue(workbook["showConceptCard"])
        self.assertTrue(workbook["showTrapOnItem"])
        self.assertTrue(workbook["showDifficulty"])
        self.assertFalse(workbook["showPointsOnItem"])
        self.assertFalse(workbook["headerTime"])
        self.assertEqual(workbook["choiceCount"], 5)
        self.assertEqual(workbook["shape"], "round")
        self.assertTrue(mock["showPointsOnItem"])
        self.assertTrue(mock["headerTime"])
        self.assertTrue(mock["headerScore"])
        self.assertTrue(mock["separateAnswerSheet"])
        self.assertTrue(mock["separateCommentary"])
        self.assertFalse(mock["showConceptCard"])
        self.assertFalse(mock["showTrapOnItem"])
        self.assertEqual(mock["variantLabel"], "홀수형")
        self.assertEqual(mock["studentFields"], ["반", "번호", "이름"])
        blob = json.dumps(styles, ensure_ascii=False)
        self.assertNotIn("FORMAT-SAMPLE-WB-001", blob)
        self.assertNotIn("FORMAT-SAMPLE-MOCK-001", blob)
        self.assertNotIn("서점 진열대의 오른쪽 페이지처럼", blob)

    def test_learn_keeps_structure_not_source_text(self):
        secret = "UNIQUE-SECRET-SENTENCE-기말고사원문저장금지"
        payload = generator.learn("mock", f"제한 시간 40분\n총점 100점\n① 가 ② 나 ③ 다 ④ 라 ⑤ 마\n{secret}\n답안지\n해설")
        saved = generator.CUSTOM_PATH.read_text(encoding="utf-8")
        self.assertNotIn(secret, saved)
        self.assertNotIn(secret, json.dumps(payload, ensure_ascii=False))
        self.assertTrue(payload["mock"]["profile"]["headerTime"])

    def test_workbook_layout(self):
        paper = generator.generate("workbook", "수학", ["이차방정식", "이차함수"], count=2, seed=3)
        self.assertEqual(paper["questionCount"], 2)
        self.assertIsNone(paper["minutes"])
        self.assertEqual(paper["answerSheet"], [])
        ids = [item["id"] for section in paper["sections"] for item in section["items"]]
        self.assertEqual(ids, ["m-qe-sum", "m-fn-vertex"])
        concepts = [section["concept"]["title"] for section in paper["sections"]]
        self.assertEqual(concepts, ["근과 계수의 관계", "꼭짓점과 최댓값·최솟값"])
        for section in paper["sections"]:
            for item in section["items"]:
                self.assertIsNone(item["face"]["points"])
                self.assertTrue(item["face"]["trap"])
                self.assertIn(item["face"]["difficulty"], ("하", "중", "상"))
                self.assertEqual(item["face"]["tag"], "대표 유형")
        full = generator.generate("workbook", "수학", ["이차방정식"], count=7, seed=1)
        short = [item for section in full["sections"] for item in section["items"] if item["face"]["type"] == "short"]
        self.assertEqual([item["commentary"]["answerLabel"] for item in short], ["1"])
        self.assertEqual(short[0]["face"]["choices"], [])

    def test_mock_layout_and_seed(self):
        first = generator.generate("mock", "수학", count=10, seed=7)
        again = generator.generate("mock", "수학", count=10, seed=7)
        other = generator.generate("mock", "영어", count=8, seed=7)
        self.assertEqual([item["id"] for section in first["sections"] for item in section["items"]],
                         [item["id"] for section in again["sections"] for item in section["items"]])
        self.assertEqual(first["minutes"], 20)
        self.assertEqual(first["totalPoints"], 100)
        self.assertEqual(first["variant"], "홀수형")
        points = [row["points"] for row in first["answerSheet"]]
        self.assertEqual(sum(points), 100)
        self.assertEqual(len(first["answerSheet"]), 10)
        for section in first["sections"]:
            self.assertIsNone(section["concept"])
            for item in section["items"]:
                self.assertIsNone(item["face"]["trap"])
                self.assertIsNone(item["face"]["difficulty"])
                self.assertGreater(item["face"]["points"], 0)
                if item["face"]["type"] == "objective":
                    self.assertEqual(len(item["face"]["choices"]), 5)
        self.assertTrue(any(row["type"] == "short" or row["type"] == "objective" for row in first["answerSheet"]))
        english_ids = [item["id"] for section in other["sections"] for item in section["items"]]
        self.assertTrue(all(item_id.startswith("e-") for item_id in english_ids))
        self.assertNotEqual(
            [item["id"] for section in first["sections"] for item in section["items"]],
            [item["id"] for section in generator.generate("mock", "수학", count=10, seed=8)["sections"] for item in section["items"]],
        )

    def test_rounded_stylesheet(self):
        css = (ROOT / "exam_studio" / "static" / "styles.css").read_text(encoding="utf-8")
        self.assertIn("--radius-card: 28px", css)
        self.assertIn("--radius-pill: 999px", css)
        self.assertIn("border-radius: var(--radius-card)", css)
        self.assertIn("border-radius: var(--radius-pill)", css)


if __name__ == "__main__":
    unittest.main()
