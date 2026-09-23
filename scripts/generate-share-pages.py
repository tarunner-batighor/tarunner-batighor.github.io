#!/usr/bin/env python3
"""Build crawler-readable Open Graph pages and 1200x630 JPEG cards for published posts.

The public Firebase web API key is read from js/fb.js (it is already public site config).
This script performs read-only Firestore queries and writes only generated static files.
"""
from __future__ import annotations

import html
import json
import re
import shutil
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SITE_ORIGIN = "https://tarunner-batighor.github.io"
COLLECTION = "Posts"
PAGE_SIZE = 300
WIDTH, HEIGHT = 1200, 630

FONT_REGULAR = ROOT / "assets/fonts/NotoSansBengali-Regular.ttf"
FONT_BOLD = ROOT / "assets/fonts/NotoSansBengali-Bold.ttf"
BACKGROUND = ROOT / "assets/share/reading-desk-background.jpg"
MANIFEST = ROOT / "scripts/.share-manifest.json"

NAVY = (6, 16, 34)
GOLD = (244, 189, 85)
WHITE = (250, 248, 241)
CORAL = (230, 104, 61)
MUTED = (198, 208, 216)


def load_public_firebase_config() -> tuple[str, str]:
    """Read project ID/API key from the same public Firebase config as the web app."""
    source = (ROOT / "js/fb.js").read_text(encoding="utf-8")
    key_match = re.search(r"apiKey\s*:\s*['\"]([^'\"]+)['\"]", source)
    project_match = re.search(r"projectId\s*:\s*['\"]([^'\"]+)['\"]", source)
    if not key_match or not project_match:
        raise RuntimeError("Firebase public config could not be read from js/fb.js")
    return project_match.group(1), key_match.group(1)


def fs_value(value: dict[str, Any] | None) -> Any:
    """Decode a Firestore REST Value into a small set of normal Python values."""
    if not value:
        return None
    if "stringValue" in value:
        return value["stringValue"]
    if "integerValue" in value:
        try:
            return int(value["integerValue"])
        except (TypeError, ValueError):
            return 0
    if "doubleValue" in value:
        try:
            return float(value["doubleValue"])
        except (TypeError, ValueError):
            return 0.0
    if "booleanValue" in value:
        return bool(value["booleanValue"])
    if "timestampValue" in value:
        return value["timestampValue"]
    if "nullValue" in value:
        return None
    if "arrayValue" in value:
        return [fs_value(item) for item in value["arrayValue"].get("values", [])]
    if "mapValue" in value:
        return {key: fs_value(item) for key, item in value["mapValue"].get("fields", {}).items()}
    return None


def query_page(project_id: str, api_key: str, cursor: str | None) -> list[dict[str, Any]]:
    endpoint = (
        "https://firestore.googleapis.com/v1/projects/"
        + urllib.parse.quote(project_id, safe="-")
        + "/databases/(default)/documents:runQuery?key="
        + urllib.parse.quote(api_key, safe="")
    )
    structured_query: dict[str, Any] = {
        "from": [{"collectionId": COLLECTION}],
        "where": {
            "fieldFilter": {
                "field": {"fieldPath": "status"},
                "op": "EQUAL",
                "value": {"stringValue": "published"},
            }
        },
        "orderBy": [{"field": {"fieldPath": "__name__"}, "direction": "ASCENDING"}],
        "limit": PAGE_SIZE,
    }
    if cursor:
        structured_query["startAt"] = {
            "values": [{"referenceValue": cursor}],
            "before": False,
        }
    body = json.dumps({"structuredQuery": structured_query}).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            rows = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        # Do not expose the request URL; it contains the public API key.
        raise RuntimeError(f"Firestore public read failed (HTTP {error.code})") from None
    except urllib.error.URLError:
        raise RuntimeError("Could not reach the Firestore public read endpoint") from None
    except (TimeoutError, json.JSONDecodeError):
        raise RuntimeError("Firestore public read timed out or returned invalid JSON") from None
    return [row["document"] for row in rows if isinstance(row, dict) and row.get("document")]


def load_published_posts() -> list[dict[str, Any]]:
    project_id, api_key = load_public_firebase_config()
    documents: list[dict[str, Any]] = []
    cursor = None
    seen_names: set[str] = set()
    while True:
        page = query_page(project_id, api_key, cursor)
        if not page:
            break
        for document in page:
            name = str(document.get("name", ""))
            if name and name not in seen_names:
                documents.append(document)
                seen_names.add(name)
        if len(page) < PAGE_SIZE:
            break
        next_cursor = str(page[-1].get("name", ""))
        if not next_cursor or next_cursor == cursor:
            raise RuntimeError("Firestore pagination did not advance; refusing a partial share build")
        cursor = next_cursor
    return documents


def parse_categories() -> dict[str, tuple[str, str]]:
    """Use the app's category names/taglines so the card stays in sync with its UI."""
    text = (ROOT / "js/categories.js").read_text(encoding="utf-8")
    result: dict[str, tuple[str, str]] = {}
    pattern = re.compile(
        r'key:\s*["\']([^"\']+)["\']\s*,\s*name:\s*["\']([^"\']+)["\']\s*,\s*tagline:\s*["\']([^"\']*)["\']'
    )
    for match in pattern.finditer(text):
        result[match.group(1)] = (match.group(2), match.group(3))
    return result


def post_id_from_name(name: str) -> str:
    post_id = name.rsplit("/", 1)[-1]
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,150}", post_id):
        return ""
    return post_id


def read_post(document: dict[str, Any], category_map: dict[str, tuple[str, str]]) -> dict[str, str]:
    fields = document.get("fields", {})
    values = {key: fs_value(value) for key, value in fields.items()}
    post_id = post_id_from_name(str(document.get("name", "")))
    category_key = str(values.get("category") or "")
    category_name, category_tagline = category_map.get(category_key, ("অন্যান্য", "বাতিঘরের নির্বাচিত লেখা"))
    content = str(values.get("content") or "")
    content = re.sub(r"<[^>]*>", " ", content)
    content = re.sub(r"[\*_`#>]+", "", content)
    content = re.sub(r"\s+", " ", content).strip()
    excerpt = content[:170].rstrip()
    if len(content) > 170:
        excerpt = excerpt.rsplit(" ", 1)[0].rstrip() + "…"
    if not excerpt:
        excerpt = category_tagline or "তারুণ্যের বাতিঘরে পড়ুন নতুন লেখা।"
    return {
        "id": post_id,
        "title": str(values.get("title") or "তারুণ্যের বাতিঘরে নতুন লেখা").strip(),
        "content": content,
        "excerpt": excerpt,
        "category": category_key,
        "category_name": category_name,
        "author": str(values.get("authorPenName") or values.get("authorName") or "অজ্ঞাত লেখক").strip(),
    }


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size, layout_engine=ImageFont.Layout.RAQM)


def text_width(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont) -> float:
    try:
        return draw.textlength(text, font=face, language="bn")
    except TypeError:
        return draw.textlength(text, font=face)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return [""]
    words = text.split(" ")
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = (current + " " + word).strip()
        if text_width(draw, candidate, face) <= max_width:
            current = candidate
            continue
        if current:
            lines.append(current)
            current = ""
        # Split unusually long unspaced strings rather than letting them overflow.
        if text_width(draw, word, face) > max_width:
            part = ""
            for char in word:
                if part and text_width(draw, part + char, face) > max_width:
                    lines.append(part)
                    part = char
                else:
                    part += char
            current = part
        else:
            current = word
    if current:
        lines.append(current)
    return lines


def balanced_wrap_text(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, max_width: int, max_lines: int) -> list[str]:
    """Wrap a headline at its most balanced word boundary instead of filling line one first."""
    words = re.sub(r"\s+", " ", text).strip().split(" ")
    if not words or words == [""]:
        return [""]
    if len(words) == 1:
        return wrap_text(draw, text, face, max_width)

    from itertools import combinations

    for line_count in range(1, min(max_lines, len(words)) + 1):
        best_lines: list[str] | None = None
        best_score: float | None = None
        for cuts in combinations(range(1, len(words)), line_count - 1):
            edges = (0,) + cuts + (len(words),)
            lines = [" ".join(words[edges[i]:edges[i + 1]]) for i in range(line_count)]
            widths = [text_width(draw, line, face) for line in lines]
            if any(width > max_width for width in widths):
                continue
            if line_count == 1:
                score = 0.0
            else:
                spread = max(widths) - min(widths)
                average = sum(widths) / len(widths)
                orphan_penalty = sum(max(0.0, average * 0.38 - width) for width in widths) * 1.8
                score = spread + orphan_penalty
            if best_score is None or score < best_score:
                best_score, best_lines = score, lines
        if best_lines:
            return best_lines
    return wrap_text(draw, text, face, max_width)


def truncate_to_lines(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, max_width: int, count: int) -> list[str]:
    lines = wrap_text(draw, text, face, max_width)
    if len(lines) <= count:
        return lines
    lines = lines[:count]
    last = lines[-1].rstrip()
    while last and text_width(draw, last + "…", face) > max_width:
        last = last[:-1].rstrip()
    lines[-1] = (last + "…") if last else "…"
    return lines


def display_card(post: dict[str, str], output: Path) -> None:
    if not FONT_REGULAR.is_file() or not FONT_BOLD.is_file() or not BACKGROUND.is_file():
        raise RuntimeError("Share-card image/font asset is missing")

    image = ImageOps.fit(
        Image.open(BACKGROUND).convert("RGB"),
        (WIDTH, HEIGHT),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    ).convert("RGBA")

    # A navy gradient protects the text while allowing the chosen desk scene to remain visible.
    alpha_line = Image.new("L", (WIDTH, 1))
    alpha_pixels = alpha_line.load()
    for x in range(WIDTH):
        if x <= 520:
            alpha_pixels[x, 0] = 136
        elif x <= 765:
            alpha_pixels[x, 0] = int(136 * (765 - x) / 245)
        else:
            alpha_pixels[x, 0] = 0
    mask = alpha_line.resize((WIDTH, HEIGHT), Image.Resampling.BILINEAR)
    shade = Image.new("RGBA", (WIDTH, HEIGHT), NAVY + (0,))
    shade.putalpha(mask)
    image = Image.alpha_composite(image, shade)
    draw = ImageDraw.Draw(image)

    # Brand lock-up and hand-drawn vector-style lighthouse mark.
    draw.rounded_rectangle((68, 47, 113, 99), radius=14, outline=GOLD, width=2)
    draw.line((78, 54, 72, 49), fill=GOLD, width=2)
    draw.line((90, 52, 90, 47), fill=GOLD, width=2)
    draw.line((102, 54, 108, 49), fill=GOLD, width=2)
    draw.rounded_rectangle((82, 57, 99, 68), radius=3, fill=(240, 178, 65))
    draw.rectangle((85, 61, 96, 65), fill=(255, 228, 151))
    draw.polygon([(84, 69), (97, 69), (101, 87), (80, 87)], fill=CORAL)
    draw.rectangle((81, 74, 100, 78), fill=(245, 178, 60))
    draw.rectangle((80, 82, 101, 86), fill=(235, 118, 57))
    draw.line((77, 90, 103, 90), fill=GOLD, width=2)
    draw.line((75, 94, 105, 94), fill=GOLD, width=2)
    draw.text((130, 49), "তারুণ্যের বাতিঘর", font=font(FONT_BOLD, 22), fill=WHITE, language="bn")
    draw.text((131, 77), "আলোর পথে কলম, সত্যের কথা", font=font(FONT_REGULAR, 13), fill=MUTED, language="bn")

    # Category pill, measured from the real category label.
    category_face = font(FONT_BOLD, 17)
    category = post["category_name"] or "অন্যান্য"
    pill_w = min(260, max(170, int(text_width(draw, category, category_face)) + 52))
    draw.rounded_rectangle((70, 143, 70 + pill_w, 183), radius=20, fill=GOLD)
    draw.ellipse((83, 157, 93, 167), fill=(14, 45, 59))
    draw.text((103, 149), category, font=category_face, fill=(13, 30, 43), language="bn")

    # Title wraps within the left text field and scales down for long post titles.
    title = post["title"] or "তারুণ্যের বাতিঘরে নতুন লেখা"
    max_title_width = 500
    title_lines: list[str] = []
    title_face = font(FONT_BOLD, 58)
    for size in (60, 58, 56, 54, 52, 50, 48, 46, 44, 42, 40, 38, 36):
        candidate_face = font(FONT_BOLD, size)
        candidate_lines = balanced_wrap_text(draw, title, candidate_face, max_title_width, 3)
        line_step = int(size * 1.18)
        if len(candidate_lines) <= 3 and len(candidate_lines) * line_step <= 168:
            title_face, title_lines = candidate_face, candidate_lines
            break
    if not title_lines:
        title_face = font(FONT_BOLD, 36)
        title_lines = truncate_to_lines(draw, title, title_face, max_title_width, 3)
    title_top = 204
    line_step = int(title_face.size * 1.18)
    for index, line in enumerate(title_lines[:3]):
        color = GOLD if index == len(title_lines[:3]) - 1 and len(title_lines) > 1 else WHITE
        draw.text((69, title_top + index * line_step), line, font=title_face, fill=color, language="bn")

    # A two-line teaser keeps the card readable even for long article bodies.
    teaser = post["excerpt"] or "তারুণ্যের বাতিঘরে পড়ুন নতুন লেখা।"
    teaser_face = font(FONT_REGULAR, 20)
    teaser_lines = truncate_to_lines(draw, teaser, teaser_face, 430, 2)
    teaser_y = 382
    for index, line in enumerate(teaser_lines):
        draw.text((72, teaser_y + index * 29), line, font=teaser_face, fill=(225, 231, 235), language="bn")

    # Author line and CTA.
    draw.line((72, 493, 560, 493), fill=GOLD, width=2)
    draw.ellipse((72, 521, 81, 530), fill=GOLD)
    author = post["author"] or "অজ্ঞাত লেখক"
    author_face = font(FONT_REGULAR, 16)
    while author and text_width(draw, author, author_face) > 300:
        author = author[:-2].rstrip() + "…"
    draw.text((92, 510), author, font=author_face, fill=WHITE, language="bn")
    draw.rounded_rectangle((436, 509, 601, 550), radius=21, outline=GOLD, width=2, fill=(8, 21, 38, 100))
    cta = "সম্পূর্ণ লেখাটি পড়ুন"
    cta_face = font(FONT_BOLD, 14)
    cta_box = draw.textbbox((0, 0), cta, font=cta_face, language="bn")
    cta_w, cta_h = cta_box[2] - cta_box[0], cta_box[3] - cta_box[1]
    arrow_gap, arrow_w = 5, 9
    text_x = 436 + (165 - cta_w - arrow_gap - arrow_w) / 2
    text_y = 514 + (31 - cta_h) / 2 - cta_box[1]
    draw.text((text_x, text_y), cta, font=cta_face, fill=GOLD, language="bn")
    arrow_x = int(text_x + cta_w + arrow_gap)
    arrow_y = 530
    draw.line((arrow_x, arrow_y, arrow_x + 8, arrow_y), fill=GOLD, width=2)
    draw.line((arrow_x + 4, arrow_y - 4, arrow_x + 8, arrow_y), fill=GOLD, width=2)
    draw.line((arrow_x + 4, arrow_y + 4, arrow_x + 8, arrow_y), fill=GOLD, width=2)

    output.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(output, "JPEG", quality=88, optimize=True, progressive=True, subsampling=0)


def make_share_page(post: dict[str, str]) -> str:
    post_id = urllib.parse.quote(post["id"], safe="")
    share_url = f"{SITE_ORIGIN}/share/{post_id}/"
    image_url = f"{SITE_ORIGIN}/share-cards/{post_id}.jpg"
    app_url = f"{SITE_ORIGIN}/#/post/{post_id}"
    title = post["title"]
    full_title = title + " — তারুণ্যের বাতিঘর"
    description = post["excerpt"]
    alt = f"{post['category_name']} বিভাগে {title} — {post['author']}"
    e = lambda value: html.escape(str(value), quote=True)
    # Keep the crawler-facing head completely static. Human visitors are redirected only by JS,
    # while the visible fallback remains useful if JS is disabled.
    return f'''<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(full_title)}</title>
<meta name="description" content="{e(description)}">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="{e(share_url)}">
<meta property="og:site_name" content="তারুণ্যের বাতিঘর">
<meta property="og:type" content="article">
<meta property="og:locale" content="bn_BD">
<meta property="og:title" content="{e(full_title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:url" content="{e(share_url)}">
<meta property="og:image" content="{e(image_url)}">
<meta property="og:image:secure_url" content="{e(image_url)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{e(alt)}">
<meta property="article:author" content="{e(post['author'])}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(full_title)}">
<meta name="twitter:description" content="{e(description)}">
<meta name="twitter:image" content="{e(image_url)}">
<style>
*{{box-sizing:border-box}}body{{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#0b1220;color:#f7f4ec;font:16px/1.6 system-ui,"Noto Sans Bengali",sans-serif}}main{{width:min(100%,760px);background:#121d2d;border:1px solid rgba(255,255,255,.1);border-radius:18px;overflow:hidden;box-shadow:0 24px 70px #0008}}img{{display:block;width:100%;height:auto;aspect-ratio:1200/630;object-fit:cover}}section{{padding:20px}}.eyebrow{{color:#f4bd55;font-size:12px;font-weight:700}}h1{{font-size:clamp(23px,4vw,34px);line-height:1.3;margin:8px 0}}p{{color:#c4cfdb;margin:0 0 18px}}a{{display:inline-flex;padding:10px 16px;border:1px solid #f4bd55;border-radius:999px;color:#f4bd55;text-decoration:none;font-weight:700}}.hint{{font-size:13px;color:#a8b3c2;margin-top:14px}}
</style>
</head>
<body>
<main>
<img src="{e(image_url)}" alt="{e(alt)}">
<section><div class="eyebrow">{e(post['category_name'])} · {e(post['author'])}</div><h1>{e(title)}</h1><p>{e(description)}</p><a href="{e(app_url)}">লেখাটি পড়ুন</a><div class="hint">তারুণ্যের বাতিঘর · আপনার ব্রাউজার স্বয়ংক্রিয়ভাবে লেখাটিতে নিয়ে যাবে।</div></section>
</main>
<script>setTimeout(function(){{window.location.replace({json.dumps(app_url, ensure_ascii=False)});}},250);</script>
</body>
</html>
'''


def safe_remove_generated(post_id: str) -> None:
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,150}", post_id):
        return
    page_dir = ROOT / "share" / post_id
    image_path = ROOT / "share-cards" / f"{post_id}.jpg"
    if page_dir.exists() and page_dir.is_dir():
        shutil.rmtree(page_dir)
    if image_path.exists() and image_path.is_file():
        image_path.unlink()


def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + ".tmp")
    temp.write_text(content, encoding="utf-8")
    temp.replace(path)


def main() -> int:
    posts_raw = load_published_posts()
    category_map = parse_categories()
    posts: list[dict[str, str]] = []
    for document in posts_raw:
        post = read_post(document, category_map)
        if post["id"] and post["title"]:
            posts.append(post)

    previous: set[str] = set()
    if MANIFEST.is_file():
        try:
            saved = json.loads(MANIFEST.read_text(encoding="utf-8"))
            if isinstance(saved, list):
                previous = {str(item) for item in saved if re.fullmatch(r"[A-Za-z0-9_-]{1,150}", str(item))}
        except (OSError, json.JSONDecodeError):
            # Don't delete anything if the old manifest is unreadable.
            previous = set()

    current = {post["id"] for post in posts}
    for stale_id in sorted(previous - current):
        safe_remove_generated(stale_id)

    for post in posts:
        image_path = ROOT / "share-cards" / f"{post['id']}.jpg"
        display_card(post, image_path)
        page_path = ROOT / "share" / post["id"] / "index.html"
        atomic_write(page_path, make_share_page(post))

    atomic_write(MANIFEST, json.dumps(sorted(current), ensure_ascii=False, indent=2) + "\n")
    print(f"Generated social share previews for {len(posts)} published posts.")
    print(f"Image dimensions: {WIDTH}x{HEIGHT}; output: share/<post-id>/ and share-cards/<post-id>.jpg")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
