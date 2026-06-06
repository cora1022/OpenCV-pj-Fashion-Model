import base64
import json
from urllib import error, request

from backend.app.schemas.search_schema import ImageFeatureAnalysis


class GeminiFeatureService:
    def __init__(
        self,
        api_key: str | None,
        model_name: str,
        timeout_seconds: int = 20,
    ):
        self.api_key = api_key
        self.model_name = model_name
        self.timeout_seconds = timeout_seconds

    def analyze_image(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
    ) -> ImageFeatureAnalysis:
        if not self.api_key:
            return ImageFeatureAnalysis(
                available=False,
                error="GEMINI_API_KEY is not configured.",
            )

        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": base64.b64encode(image_bytes).decode("utf-8"),
                            }
                        },
                        {"text": self._prompt()},
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "response_mime_type": "application/json",
            },
        }

        endpoint = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model_name}:generateContent"
        )
        req = request.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": self.api_key,
            },
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=self.timeout_seconds) as response:
                body = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            return ImageFeatureAnalysis(
                available=False,
                error=f"Gemini API error: {exc.code}",
            )
        except Exception as exc:
            return ImageFeatureAnalysis(
                available=False,
                error=f"Gemini analysis failed: {exc}",
            )

        text = self._extract_text(body)
        if not text:
            return ImageFeatureAnalysis(
                available=False,
                error="Gemini returned an empty feature analysis.",
            )

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            data = self._extract_json_object(text)

        if not isinstance(data, dict):
            return ImageFeatureAnalysis(
                available=False,
                error="Gemini returned an invalid feature analysis format.",
            )

        return ImageFeatureAnalysis(
            available=True,
            summary=self._as_text(data.get("summary")),
            item_type=self._as_text(data.get("item_type")),
            colors=self._as_text_list(data.get("colors")),
            materials=self._as_text_list(data.get("materials")),
            patterns=self._as_text_list(data.get("patterns")),
            style_keywords=self._as_text_list(data.get("style_keywords")),
            search_keywords=self._as_text_list(data.get("search_keywords")),
        )

    def _prompt(self) -> str:
        return (
            "업로드된 패션 이미지를 분석해서 쇼핑 검색에 도움이 되는 특징만 "
            "한국어 JSON으로 반환해줘. 과장하지 말고 이미지에서 보이는 근거만 사용해. "
            "반드시 다음 키를 포함해: summary, item_type, colors, materials, "
            "patterns, style_keywords, search_keywords. "
            "colors/materials/patterns/style_keywords/search_keywords는 문자열 배열로 반환해."
        )

    def _extract_text(self, body: dict) -> str | None:
        candidates = body.get("candidates") or []
        if not candidates:
            return None

        parts = candidates[0].get("content", {}).get("parts", [])
        texts = [part.get("text", "") for part in parts if part.get("text")]
        return "\n".join(texts).strip() or None

    def _extract_json_object(self, text: str) -> dict | None:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None

        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None

    def _as_text(self, value) -> str | None:
        if value is None:
            return None
        return str(value).strip() or None

    def _as_text_list(self, value) -> list[str]:
        if not isinstance(value, list):
            return []
        return [str(item).strip() for item in value if str(item).strip()]
