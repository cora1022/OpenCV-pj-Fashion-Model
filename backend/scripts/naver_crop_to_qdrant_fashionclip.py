"""네이버 상품 이미지를 OpenCV로 선별/crop한 뒤 Qdrant 컬렉션을 만드는 도구.

이 스크립트는 완성된 웹 서비스 이전 단계에서 실행하는 데이터 구축 파이프라인이다.
네이버 쇼핑 API로 패션 이미지를 가져오고, 원본 전체를 그대로 벡터화하지 않도록
OpenCV 기반 관심 영역 후보를 잡거나 사용자가 의류 영역을 직접 crop한 뒤
FashionCLIP 벡터와 상품 payload를 Qdrant에 저장한다.

중요한 점:
- Qdrant 컬렉션 품질은 저장되는 이미지 벡터의 품질에 크게 좌우된다.
- 그래서 상품 이미지 저장 전 OpenCV/HOG로 사람 또는 상반신 후보를 제안한다.
- 사용자는 추천 박스를 보고 의류 영역을 보정하거나 직접 crop한다.
- 최종적으로 Qdrant에는 원본 배경보다 의류 영역 중심의 이미지 벡터가 쌓인다.
"""

#python naver_crop_to_qdrant_fashionclip.py "스트릿 맨투맨" --display 20
#python naver_crop_to_qdrant_fashionclip.py "반팔티" --display 20

import os
import re
import html
import uuid
import argparse
from io import BytesIO
from datetime import datetime

import cv2
import numpy as np
import requests
from dotenv import load_dotenv
from PIL import Image, ImageTk

import tkinter as tk
from tkinter import messagebox

import torch
from transformers import CLIPProcessor, CLIPModel

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct


# =========================
# 기본 설정
# =========================

load_dotenv()

# 보안을 위해 .env 파일에서 읽습니다.
# .env 예시:
# NAVER_CLIENT_ID=여기에_ID
# NAVER_CLIENT_SECRET=여기에_SECRET
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")

# FashionCLIP으로 새롭게 저장할 컬렉션입니다.
# 기존 일반 CLIP 컬렉션과 섞지 않는 것이 중요합니다.
COLLECTION_NAME = "naver_fashion_images_fashionclip"
IMAGE_SAVE_DIR = "saved_cropped_images_fashionclip"

QDRANT_HOST = "localhost"
QDRANT_PORT = 6333

FASHIONCLIP_MODEL_NAME = "patrickjohncyh/fashion-clip"

CANVAS_WIDTH = 400
CANVAS_HEIGHT = 400

# 네이버 쇼핑 API는 start가 보통 1~1000 범위입니다.
NAVER_MAX_START = 1000

# Qdrant 구축 전에 상품 이미지에서 의류 중심 영역을 제안하기 위한 OpenCV detector입니다.
# YOLO 모델이 없는 독립 실행 스크립트에서도 OpenCV 전처리 흐름이 유지되도록 HOG를 사용합니다.
OPENCV_HOG_PADDING_X_RATIO = 0.12
OPENCV_HOG_PADDING_Y_RATIO = 0.10
OPENCV_UPPER_BODY_RATIO = 0.72


# =========================
# 네이버 쇼핑 API
# =========================

def clean_html_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<.*?>", "", text)
    return html.unescape(text)


def search_naver_shopping(query="의류", display=20, start=1):
    """네이버 쇼핑 API 검색 호출. start를 사용해 다음 페이지를 계속 가져옵니다."""
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        raise RuntimeError(
            ".env 파일에 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET을 설정하세요.\n"
            "예:\n"
            "NAVER_CLIENT_ID=xxxxx\n"
            "NAVER_CLIENT_SECRET=xxxxx"
        )

    display = max(1, min(int(display), 100))
    start = max(1, int(start))

    url = "https://openapi.naver.com/v1/search/shop.json"

    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    }

    params = {
        "query": query,
        "display": display,
        "start": start,
    }

    response = requests.get(url, headers=headers, params=params, timeout=10)

    if response.status_code != 200:
        raise RuntimeError(
            f"네이버 API 호출 실패: {response.status_code}\n{response.text}"
        )

    data = response.json()
    items = data.get("items", [])

    cleaned_items = []

    for item in items:
        cleaned_items.append({
            "title": clean_html_text(item.get("title", "")),
            "link": item.get("link", ""),
            "image_url": item.get("image", ""),
            "mall_name": item.get("mallName", ""),
            "lprice": item.get("lprice", ""),
            "hprice": item.get("hprice", ""),
            "product_id": item.get("productId", ""),
            "brand": item.get("brand", ""),
            "maker": item.get("maker", ""),
            "category1": item.get("category1", ""),
            "category2": item.get("category2", ""),
            "category3": item.get("category3", ""),
            "category4": item.get("category4", ""),
        })

    return cleaned_items


def download_image(image_url: str) -> Image.Image:
    headers = {
        "User-Agent": "Mozilla/5.0",
    }

    response = requests.get(image_url, headers=headers, timeout=15)
    response.raise_for_status()

    img = Image.open(BytesIO(response.content)).convert("RGB")
    return img


# =========================
# OpenCV crop 후보 생성
# =========================

def get_opencv_suggested_crop_box(image: Image.Image) -> tuple[int, int, int, int] | None:
    """
    Qdrant에 저장할 상품 이미지를 만들기 전에 OpenCV로 의류 중심 crop 후보를 제안합니다.

    네이버 쇼핑 이미지는 배경, 모델 얼굴, 손, 여백, 쇼핑몰 워터마크가 함께 들어올 수 있습니다.
    원본 전체를 그대로 FashionCLIP 벡터로 만들면 의류보다 배경 특징이 섞일 수 있으므로,
    OpenCV HOG person detector로 사람 영역을 찾고 상반신/의류 영역에 가까운 박스를 추천합니다.

    반환값은 PIL 이미지 좌표계 기준 (x1, y1, x2, y2)입니다.
    """
    rgb = image.convert("RGB")
    array = np.array(rgb)

    # OpenCV는 BGR 채널 순서를 기본으로 사용하므로 RGB 이미지를 BGR로 변환합니다.
    bgr = cv2.cvtColor(array, cv2.COLOR_RGB2BGR)

    hog = cv2.HOGDescriptor()
    hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

    boxes, weights = hog.detectMultiScale(
        bgr,
        winStride=(8, 8),
        padding=(16, 16),
        scale=1.05,
    )

    if boxes is None or len(boxes) == 0:
        return None

    weighted_boxes = []
    for index, (x, y, width, height) in enumerate(boxes):
        confidence = float(weights[index]) if weights is not None and len(weights) > index else 1.0
        area = int(width) * int(height)
        weighted_boxes.append((int(x), int(y), int(width), int(height), area, confidence))

    x, y, width, height, _area, _confidence = max(
        weighted_boxes,
        key=lambda item: item[4] * item[5],
    )

    # 패션 상품 검색에서는 전신보다 상의/의류 영역이 더 중요하므로 상반신 중심으로 줄입니다.
    upper_height = max(1, int(height * OPENCV_UPPER_BODY_RATIO))

    pad_x = int(width * OPENCV_HOG_PADDING_X_RATIO)
    pad_y = int(upper_height * OPENCV_HOG_PADDING_Y_RATIO)

    left = max(0, x - pad_x)
    top = max(0, y - pad_y)
    right = min(image.width, x + width + pad_x)
    bottom = min(image.height, y + upper_height + pad_y)

    if right - left < 10 or bottom - top < 10:
        return None

    return left, top, right, bottom


# =========================
# 중복 판별 유틸
# =========================

def _safe_value(value):
    if value is None:
        return ""
    return str(value).strip()


def get_item_keys(item: dict) -> set:
    """
    상품 중복 판별용 key 묶음.
    product_id, link, image_url 중 하나라도 같으면 같은 상품으로 취급합니다.
    """
    keys = set()

    product_id = _safe_value(item.get("product_id"))
    link = _safe_value(item.get("link"))
    image_url = _safe_value(item.get("image_url"))

    if product_id:
        keys.add(f"product_id:{product_id}")
    if link:
        keys.add(f"link:{link}")
    if image_url:
        keys.add(f"image_url:{image_url}")

    return keys


def make_primary_item_key(item: dict) -> str:
    """payload에 기록할 대표 중복 key."""
    keys = get_item_keys(item)
    if not keys:
        return f"unknown:{uuid.uuid4()}"

    for key in keys:
        if key.startswith("product_id:"):
            return key
    return sorted(keys)[0]


# =========================
# Qdrant + FashionCLIP
# =========================

def get_device():
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def load_fashionclip_model():
    print(f"FashionCLIP 모델 로딩 중: {FASHIONCLIP_MODEL_NAME}")
    device = get_device()
    print(f"사용 장치: {device}")

    processor = CLIPProcessor.from_pretrained(FASHIONCLIP_MODEL_NAME)
    model = CLIPModel.from_pretrained(FASHIONCLIP_MODEL_NAME)
    model.to(device)
    model.eval()

    return model, processor, device


def feature_output_to_tensor(model, output):
    """
    Transformers/모델 버전에 따라 get_image_features의 반환 형태가 다를 수 있어서
    Tensor, 객체 출력, tuple 출력을 모두 안전하게 처리합니다.
    """
    if torch.is_tensor(output):
        return output

    # 일부 모델은 image_embeds를 가질 수 있습니다.
    image_embeds = getattr(output, "image_embeds", None)
    if torch.is_tensor(image_embeds):
        return image_embeds

    # BaseModelOutputWithPooling 계열 대응
    pooled = getattr(output, "pooler_output", None)
    if pooled is None:
        last_hidden_state = getattr(output, "last_hidden_state", None)
        if torch.is_tensor(last_hidden_state):
            pooled = last_hidden_state[:, 0]

    # tuple/list 출력 대응
    if pooled is None and isinstance(output, (tuple, list)) and len(output) > 0:
        first = output[0]
        if torch.is_tensor(first):
            if first.ndim == 3:
                pooled = first[:, 0]
            else:
                pooled = first

    if pooled is None or not torch.is_tensor(pooled):
        raise TypeError(f"이미지 feature Tensor를 찾을 수 없습니다. output type={type(output)}")

    # visual_projection은 입력 차원이 맞을 때만 적용합니다.
    # FashionCLIP 환경에 따라 pooled가 이미 512차원으로 나오는 경우가 있어서 무조건 적용하면 에러가 납니다.
    projection = getattr(model, "visual_projection", None)
    if projection is not None:
        in_features = getattr(projection, "in_features", None)
        if in_features == pooled.shape[-1]:
            return projection(pooled)

    return pooled


@torch.inference_mode()
def image_to_vector(model, processor, device, image: Image.Image):
    if image.mode != "RGB":
        image = image.convert("RGB")

    inputs = processor(images=image, return_tensors="pt")
    pixel_values = inputs["pixel_values"].to(device)

    # 일반적으로 CLIPModel.get_image_features는 Tensor를 반환합니다.
    # 일부 환경에서는 객체 출력이 나올 수 있어서 아래에서 한 번 더 안전 처리합니다.
    output = model.get_image_features(pixel_values=pixel_values)
    features = feature_output_to_tensor(model, output)

    features = torch.nn.functional.normalize(features, p=2, dim=-1)
    return features[0].detach().cpu().float().numpy().tolist()


def get_vector_size(model, processor, device) -> int:
    dummy = Image.new("RGB", (224, 224), color=(255, 255, 255))
    vector = image_to_vector(model, processor, device, dummy)
    return len(vector)


def connect_qdrant():
    return QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)


def ensure_collection(client: QdrantClient, collection_name: str, vector_size: int):
    collections = client.get_collections().collections
    existing_names = [collection.name for collection in collections]

    if collection_name not in existing_names:
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE,
            ),
        )
        print(f"Qdrant 컬렉션 생성 완료: {collection_name} / vector_size={vector_size}")
    else:
        print(f"Qdrant 컬렉션 사용: {collection_name}")


def load_existing_item_keys(client: QdrantClient, collection_name: str) -> set:
    """
    FashionCLIP 컬렉션에 이미 저장된 상품들의 product_id/link/image_url을 읽어옵니다.
    프로그램을 다시 실행해도 이전에 저장한 상품은 다시 나오지 않게 하기 위함입니다.
    """
    existing_keys = set()
    offset = None

    try:
        while True:
            points, next_offset = client.scroll(
                collection_name=collection_name,
                limit=100,
                offset=offset,
                with_payload=True,
                with_vectors=False,
            )

            for point in points:
                payload = point.payload or {}
                keys = get_item_keys(payload)
                existing_keys.update(keys)

                duplicate_key = _safe_value(payload.get("duplicate_key"))
                if duplicate_key:
                    existing_keys.add(duplicate_key)

            if next_offset is None:
                break

            offset = next_offset

    except Exception as e:
        print(f"기존 Qdrant 데이터 확인 중 오류: {e}")

    print(f"이미 저장된 FashionCLIP 상품 key {len(existing_keys)}개를 중복 제외 목록에 추가했습니다.")
    return existing_keys


def save_image_file(image: Image.Image) -> str:
    os.makedirs(IMAGE_SAVE_DIR, exist_ok=True)

    file_name = f"{uuid.uuid4()}.jpg"
    file_path = os.path.join(IMAGE_SAVE_DIR, file_name)

    image.save(file_path, format="JPEG", quality=95)

    return file_path


def upsert_image_to_qdrant(
    client: QdrantClient,
    model,
    processor,
    device,
    image: Image.Image,
    item: dict,
    query: str,
    crop_used: bool,
    crop_method: str,
):
    vector = image_to_vector(model, processor, device, image)
    saved_path = save_image_file(image)

    point_id = str(uuid.uuid4())

    payload = {
        "title": item.get("title"),
        "link": item.get("link"),
        "image_url": item.get("image_url"),
        "mall_name": item.get("mall_name"),
        "lprice": item.get("lprice"),
        "hprice": item.get("hprice"),
        "product_id": item.get("product_id"),
        "brand": item.get("brand"),
        "maker": item.get("maker"),
        "category1": item.get("category1"),
        "category2": item.get("category2"),
        "category3": item.get("category3"),
        "category4": item.get("category4"),
        "query": query,
        "crop_used": crop_used,
        "crop_method": crop_method,
        "saved_image_path": saved_path,
        "duplicate_key": make_primary_item_key(item),
        "embedding_model": FASHIONCLIP_MODEL_NAME,
        "collection_name": COLLECTION_NAME,
        "created_at": datetime.now().isoformat(timespec="seconds"),
    }

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            PointStruct(
                id=point_id,
                vector=vector,
                payload=payload,
            )
        ],
    )

    return point_id, saved_path


# =========================
# Tkinter GUI
# =========================

class CropReviewApp:
    def __init__(self, root, query, qdrant_client, fashionclip_model, processor, device, display=20):
        self.root = root
        self.query = query
        self.qdrant_client = qdrant_client
        self.fashionclip_model = fashionclip_model
        self.processor = processor
        self.device = device
        self.display = max(1, min(int(display), 100))

        self.items = []
        self.index = 0
        self.naver_start = 1

        self.saved_count = 0
        self.skipped_count = 0

        self.existing_keys = load_existing_item_keys(
            client=self.qdrant_client,
            collection_name=COLLECTION_NAME,
        )
        self.session_seen_keys = set(self.existing_keys)

        self.current_item = None
        self.current_image = None
        self.display_image = None
        self.tk_image = None

        self.scale = 1.0
        self.offset_x = 0
        self.offset_y = 0

        self.start_x = None
        self.start_y = None
        self.rect_id = None

        self.root.title("네이버 쇼핑 이미지 크롭 후 FashionCLIP + Qdrant 저장")
        self.root.resizable(False, False)

        self.info_label = tk.Label(
            root,
            text="",
            justify="left",
            anchor="w",
            wraplength=700,
            font=("맑은 고딕", 10),
        )
        self.info_label.pack(fill="x", padx=10, pady=8)

        self.canvas = tk.Canvas(
            root,
            width=CANVAS_WIDTH,
            height=CANVAS_HEIGHT,
            bg="#222222",
            cursor="crosshair",
        )
        self.canvas.pack(padx=10, pady=8)

        self.canvas.bind("<ButtonPress-1>", self.on_mouse_down)
        self.canvas.bind("<B1-Motion>", self.on_mouse_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_mouse_up)

        button_frame = tk.Frame(root)
        button_frame.pack(pady=6)

        self.save_crop_button = tk.Button(
            button_frame,
            text="크롭 저장(S)",
            command=self.save_cropped_to_qdrant,
            width=18,
            height=2,
        )
        self.save_crop_button.grid(row=0, column=0, padx=4, pady=3)

        self.opencv_suggest_button = tk.Button(
            button_frame,
            text="OpenCV 자동영역(A)",
            command=self.apply_opencv_suggested_crop,
            width=18,
            height=2,
        )
        self.opencv_suggest_button.grid(row=0, column=1, padx=4, pady=3)

        self.save_original_button = tk.Button(
            button_frame,
            text="원본 저장(O)",
            command=self.save_original_to_qdrant,
            width=18,
            height=2,
        )
        self.save_original_button.grid(row=0, column=2, padx=4, pady=3)

        self.skip_button = tk.Button(
            button_frame,
            text="건너뛰기(N)",
            command=self.next_item,
            width=18,
            height=2,
        )
        self.skip_button.grid(row=0, column=3, padx=4, pady=3)

        self.reset_button = tk.Button(
            button_frame,
            text="크롭 초기화(R)",
            command=self.reset_crop,
            width=18,
            height=2,
        )
        self.reset_button.grid(row=1, column=0, padx=4, pady=3)

        self.quit_button = tk.Button(
            button_frame,
            text="종료(ESC)",
            command=root.quit,
            width=18,
            height=2,
        )
        self.quit_button.grid(row=1, column=1, padx=4, pady=3)

        self.status_label = tk.Label(
            root,
            text="",
            anchor="w",
            font=("맑은 고딕", 9),
        )
        self.status_label.pack(fill="x", padx=10, pady=5)

        self.root.bind("<s>", lambda event: self.save_cropped_to_qdrant())
        self.root.bind("<S>", lambda event: self.save_cropped_to_qdrant())
        self.root.bind("<a>", lambda event: self.apply_opencv_suggested_crop())
        self.root.bind("<A>", lambda event: self.apply_opencv_suggested_crop())
        self.root.bind("<o>", lambda event: self.save_original_to_qdrant())
        self.root.bind("<O>", lambda event: self.save_original_to_qdrant())
        self.root.bind("<n>", lambda event: self.next_item())
        self.root.bind("<N>", lambda event: self.next_item())
        self.root.bind("<r>", lambda event: self.reset_crop())
        self.root.bind("<R>", lambda event: self.reset_crop())
        self.root.bind("<Escape>", lambda event: self.root.quit())

        self.load_more_items()
        self.load_current_item()

    def load_more_items(self):
        while self.naver_start <= NAVER_MAX_START:
            current_start = self.naver_start
            print(f"네이버 쇼핑 추가 검색: query={self.query}, start={current_start}, display={self.display}")

            try:
                new_items = search_naver_shopping(
                    query=self.query,
                    display=self.display,
                    start=current_start,
                )
            except Exception as e:
                messagebox.showerror("네이버 검색 실패", str(e))
                return False

            self.naver_start += self.display

            if not new_items:
                return False

            filtered_items = []
            duplicate_count = 0

            for item in new_items:
                keys = get_item_keys(item)

                if keys and (keys & self.session_seen_keys):
                    duplicate_count += 1
                    continue

                if not keys:
                    keys = {f"temp:{uuid.uuid4()}"}

                self.session_seen_keys.update(keys)
                filtered_items.append(item)

            print(
                f"검색 start={current_start}: {len(new_items)}개 중 "
                f"중복 {duplicate_count}개 제외, {len(filtered_items)}개 추가"
            )

            if filtered_items:
                self.items.extend(filtered_items)
                return True

        return False

    def load_current_item(self):
        if self.index >= len(self.items):
            has_more = self.load_more_items()

            if not has_more:
                messagebox.showinfo(
                    "완료",
                    "더 이상 가져올 상품이 없습니다.\n"
                    f"이번 실행에서 저장: {self.saved_count}개, 건너뜀: {self.skipped_count}개"
                )
                self.root.quit()
                return

        self.current_item = self.items[self.index]

        try:
            self.current_image = download_image(self.current_item["image_url"])
        except Exception as e:
            messagebox.showwarning(
                "이미지 다운로드 실패",
                f"{self.index + 1}번째 이미지 다운로드 실패\n\n{e}\n\n다음 이미지로 넘어갑니다.",
            )
            self.index += 1
            self.load_current_item()
            return

        self.reset_crop()
        self.render_image()

        title = self.current_item.get("title", "")
        mall = self.current_item.get("mall_name", "")
        price = self.current_item.get("lprice", "")
        link = self.current_item.get("link", "")
        product_id = self.current_item.get("product_id", "")

        info_text = (
            f"[FashionCLIP 저장 모드] [현재 {self.index + 1}번째 / 로드된 {len(self.items)}개] "
            f"저장 {self.saved_count}개 / 건너뜀 {self.skipped_count}개\n"
            f"컬렉션: {COLLECTION_NAME}\n"
            f"다음 네이버 start 위치: {self.naver_start}\n"
            f"상품명: {title}\n"
            f"쇼핑몰: {mall} / 최저가: {price} / product_id: {product_id}\n"
            f"링크: {link}\n"
            f"단축키: A OpenCV 자동영역 / S 크롭저장 / O 원본저장 / N 건너뛰기 / R 초기화 / ESC 종료"
        )

        self.info_label.config(text=info_text)
        self.status_label.config(
            text="A를 누르면 OpenCV가 의류 후보 영역을 제안합니다. 필요하면 마우스로 보정한 뒤 Qdrant에 저장하세요."
        )

    def render_image(self):
        self.canvas.delete("all")

        img_w, img_h = self.current_image.size

        self.scale = min(
            CANVAS_WIDTH / img_w,
            CANVAS_HEIGHT / img_h,
        )

        display_w = int(img_w * self.scale)
        display_h = int(img_h * self.scale)

        self.offset_x = (CANVAS_WIDTH - display_w) // 2
        self.offset_y = (CANVAS_HEIGHT - display_h) // 2

        self.display_image = self.current_image.resize(
            (display_w, display_h),
            Image.LANCZOS,
        )

        self.tk_image = ImageTk.PhotoImage(self.display_image)

        self.canvas.create_image(
            self.offset_x,
            self.offset_y,
            anchor="nw",
            image=self.tk_image,
        )

    def on_mouse_down(self, event):
        self.start_x = event.x
        self.start_y = event.y

        if self.rect_id is not None:
            self.canvas.delete(self.rect_id)

        self.rect_id = self.canvas.create_rectangle(
            self.start_x,
            self.start_y,
            self.start_x,
            self.start_y,
            outline="red",
            width=2,
        )

    def on_mouse_drag(self, event):
        if self.rect_id is None:
            return

        self.canvas.coords(
            self.rect_id,
            self.start_x,
            self.start_y,
            event.x,
            event.y,
        )

    def on_mouse_up(self, event):
        if self.rect_id is None:
            return

        self.canvas.coords(
            self.rect_id,
            self.start_x,
            self.start_y,
            event.x,
            event.y,
        )

    def reset_crop(self):
        if self.rect_id is not None:
            self.canvas.delete(self.rect_id)

        self.rect_id = None
        self.start_x = None
        self.start_y = None

    def apply_opencv_suggested_crop(self):
        if self.current_image is None:
            return

        box = get_opencv_suggested_crop_box(self.current_image)
        if box is None:
            self.status_label.config(
                text="OpenCV HOG가 의류/사람 후보 영역을 찾지 못했습니다. 마우스로 직접 의류 영역을 선택하세요."
            )
            return

        img_x1, img_y1, img_x2, img_y2 = box
        canvas_x1 = int(img_x1 * self.scale + self.offset_x)
        canvas_y1 = int(img_y1 * self.scale + self.offset_y)
        canvas_x2 = int(img_x2 * self.scale + self.offset_x)
        canvas_y2 = int(img_y2 * self.scale + self.offset_y)

        if self.rect_id is not None:
            self.canvas.delete(self.rect_id)

        self.start_x = canvas_x1
        self.start_y = canvas_y1
        self.rect_id = self.canvas.create_rectangle(
            canvas_x1,
            canvas_y1,
            canvas_x2,
            canvas_y2,
            outline="red",
            width=2,
        )
        self.status_label.config(
            text=(
                "OpenCV 자동 후보 영역 적용: "
                f"x={img_x1}, y={img_y1}, width={img_x2 - img_x1}, height={img_y2 - img_y1}. "
                "의류 영역에 맞게 필요하면 마우스로 다시 조정하세요."
            )
        )

    def get_cropped_image(self):
        if self.rect_id is None:
            return None

        x1, y1, x2, y2 = self.canvas.coords(self.rect_id)

        x1, x2 = sorted([x1, x2])
        y1, y2 = sorted([y1, y2])

        img_x1 = int((x1 - self.offset_x) / self.scale)
        img_y1 = int((y1 - self.offset_y) / self.scale)
        img_x2 = int((x2 - self.offset_x) / self.scale)
        img_y2 = int((y2 - self.offset_y) / self.scale)

        img_w, img_h = self.current_image.size

        img_x1 = max(0, min(img_x1, img_w))
        img_y1 = max(0, min(img_y1, img_h))
        img_x2 = max(0, min(img_x2, img_w))
        img_y2 = max(0, min(img_y2, img_h))

        if img_x2 - img_x1 < 10 or img_y2 - img_y1 < 10:
            return None

        cropped = self.current_image.crop((img_x1, img_y1, img_x2, img_y2))
        return cropped

    def mark_current_item_as_saved(self):
        keys = get_item_keys(self.current_item)
        self.existing_keys.update(keys)
        self.session_seen_keys.update(keys)
        self.saved_count += 1

    def save_cropped_to_qdrant(self):
        cropped = self.get_cropped_image()

        if cropped is None:
            messagebox.showwarning(
                "크롭 영역 없음",
                "크롭 영역이 너무 작거나 선택되지 않았습니다.",
            )
            return

        try:
            point_id, saved_path = upsert_image_to_qdrant(
                client=self.qdrant_client,
                model=self.fashionclip_model,
                processor=self.processor,
                device=self.device,
                image=cropped,
                item=self.current_item,
                query=self.query,
                crop_used=True,
                crop_method="manual_or_opencv_suggested_crop",
            )

            self.mark_current_item_as_saved()

            self.status_label.config(
                text=f"FashionCLIP 크롭 저장 완료: {saved_path} / Qdrant ID: {point_id}"
            )

            self.next_item(count_as_skip=False)

        except Exception as e:
            messagebox.showerror("저장 실패", str(e))

    def save_original_to_qdrant(self):
        try:
            point_id, saved_path = upsert_image_to_qdrant(
                client=self.qdrant_client,
                model=self.fashionclip_model,
                processor=self.processor,
                device=self.device,
                image=self.current_image,
                item=self.current_item,
                query=self.query,
                crop_used=False,
                crop_method="original_without_crop",
            )

            self.mark_current_item_as_saved()

            self.status_label.config(
                text=f"FashionCLIP 원본 저장 완료: {saved_path} / Qdrant ID: {point_id}"
            )

            self.next_item(count_as_skip=False)

        except Exception as e:
            messagebox.showerror("저장 실패", str(e))

    def next_item(self, count_as_skip=True):
        if count_as_skip:
            self.skipped_count += 1

        self.index += 1
        self.load_current_item()


# =========================
# 실행
# =========================

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("query", nargs="?", default="스트릿 맨투맨")
    parser.add_argument("--display", type=int, default=20, help="한 번에 가져올 상품 수. 최대 100")
    args = parser.parse_args()

    query = args.query
    display = max(1, min(args.display, 100))

    print(f"네이버 쇼핑 검색어: {query}")
    print(f"한 번에 가져올 개수: {display}")
    print(f"저장 컬렉션: {COLLECTION_NAME}")
    print(f"저장 이미지 폴더: {IMAGE_SAVE_DIR}")

    fashionclip_model, processor, device = load_fashionclip_model()
    vector_size = get_vector_size(fashionclip_model, processor, device)
    print(f"FashionCLIP vector size: {vector_size}")

    qdrant_client = connect_qdrant()
    ensure_collection(
        client=qdrant_client,
        collection_name=COLLECTION_NAME,
        vector_size=vector_size,
    )

    root = tk.Tk()
    CropReviewApp(
        root=root,
        query=query,
        qdrant_client=qdrant_client,
        fashionclip_model=fashionclip_model,
        processor=processor,
        device=device,
        display=display,
    )
    root.mainloop()


if __name__ == "__main__":
    main()
