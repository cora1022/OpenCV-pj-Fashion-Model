from io import BytesIO

import torch
from PIL import Image, UnidentifiedImageError
from transformers import CLIPModel, CLIPProcessor


class InvalidImageError(ValueError):
    pass


class FashionClipService:
    def __init__(self, model_name: str, model_revision: str = "main"):
        self.model_name = model_name
        self.model_revision = model_revision
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.processor: CLIPProcessor | None = None
        self.model: CLIPModel | None = None

    def load(self) -> None:
        if self.model is not None and self.processor is not None:
            return

        self.processor = CLIPProcessor.from_pretrained(
            self.model_name, revision=self.model_revision
        )
        self.model = CLIPModel.from_pretrained(self.model_name, revision=self.model_revision)
        self.model.to(self.device)
        self.model.eval()

    @property
    def model_version(self) -> str:
        return f"{self.model_name}@{self.model_revision}"

    @property
    def loaded(self) -> bool:
        return self.model is not None and self.processor is not None

    def embed_image_bytes(self, image_bytes: bytes) -> list[float]:
        if self.model is None or self.processor is None:
            raise RuntimeError("FashionCLIP model is not loaded.")

        try:
            image = Image.open(BytesIO(image_bytes)).convert("RGB")
        except (UnidentifiedImageError, OSError) as exc:
            raise InvalidImageError("Invalid image file.") from exc

        return self.embed_image(image)

    @torch.inference_mode()
    def embed_image(self, image: Image.Image) -> list[float]:
        if self.model is None or self.processor is None:
            raise RuntimeError("FashionCLIP model is not loaded.")

        if image.mode != "RGB":
            image = image.convert("RGB")

        inputs = self.processor(images=image, return_tensors="pt")
        pixel_values = inputs["pixel_values"].to(self.device)

        output = self.model.get_image_features(pixel_values=pixel_values)
        features = self._feature_output_to_tensor(output)
        features = torch.nn.functional.normalize(features, p=2, dim=-1)

        return features[0].detach().cpu().float().numpy().tolist()

    def _feature_output_to_tensor(self, output):
        if torch.is_tensor(output):
            return output

        image_embeds = getattr(output, "image_embeds", None)
        if torch.is_tensor(image_embeds):
            return image_embeds

        pooled = getattr(output, "pooler_output", None)
        if pooled is None:
            last_hidden_state = getattr(output, "last_hidden_state", None)
            if torch.is_tensor(last_hidden_state):
                pooled = last_hidden_state[:, 0]

        if pooled is None and isinstance(output, (tuple, list)) and output:
            first = output[0]
            if torch.is_tensor(first):
                pooled = first[:, 0] if first.ndim == 3 else first

        if pooled is None or not torch.is_tensor(pooled):
            raise TypeError(f"Image feature tensor not found. output type={type(output)}")

        projection = getattr(self.model, "visual_projection", None)
        if projection is not None:
            in_features = getattr(projection, "in_features", None)
            if in_features == pooled.shape[-1]:
                return projection(pooled)

        return pooled
