#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Import catalog data from the local folder:
  НАШ САЙТ АКВИЛОН

Creates:
  - data/products.json
  - assets/products/<product-id>/* images

Run:
  python3 scripts/import_catalog.py
"""

import re
import json
import hashlib
import zipfile
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "НАШ САЙТ АКВИЛОН"
EXTRA_SOURCE = ROOT / "Взрывозащищенные АВД"
SOURCES = [SOURCE, EXTRA_SOURCE]
ASSETS = ROOT / "assets" / "products"
OUT = ROOT / "data" / "products.json"

CATEGORY_MAP = {
    "Автохимия": "equipment-chemistry",
    "Аксессуары для АВД": "equipment-accessories",
    "Аксессуары для автомоек": "equipment-wash-accessories",
    "Аппараты высокого давления(+-)": "equipment-high-pressure",
    "Насосы ВД и двигатели(+)": "equipment-engines",
    "Пеногенераторы(+)": "equipment-foam",
    "Поломоечные машины(+)": "equipment-cleaning",
    "Пылесосы и Химчистка(+)": "equipment-vacuums",
}

SUBCATEGORY_MAP = {
    # High pressure subcategories
    "взрыв": "equipment-high-pressure-explosion",
}

SUBCATEGORY_RULES = {
    "Аппараты высокого давления(+-)": [
        ("equipment-high-pressure-explosion", ["взрыв"]),
        ("equipment-high-pressure-heated", ["подогрев"]),
        ("equipment-high-pressure-gas", ["бензин"]),
        ("equipment-high-pressure-boilers", ["бойлер", "нагрев"]),
        ("equipment-high-pressure-household", ["бытов", "200"]),
        ("equipment-high-pressure-mobile", ["мобильн", "колес"]),
        ("equipment-high-pressure-monoblock", ["моноблок"]),
        ("equipment-high-pressure-stationary", ["стационар", "профес"]),
    ],
    "Насосы ВД и двигатели(+)": [
        ("equipment-engines-gas", ["бензин", "двиг"]),
        ("equipment-engines-pumps-gas", ["насос", "бензин"]),
        ("equipment-engines-pumps-hotwater", ["горяч", "вода"]),
        ("equipment-engines-plunger", ["плунжер"]),
        ("equipment-engines-electric", ["электро", "двиг"]),
    ],
    "Пылесосы и Химчистка(+)": [
        ("equipment-vacuums-wetdry", ["пылеводосос"]),
        ("equipment-vacuums-tornador", ["торнадор"]),
        ("equipment-vacuums-turbodry", ["турбосуш"]),
        ("equipment-vacuums-dryclean", ["химчист"]),
    ],
    "Поломоечные машины(+)": [
        ("equipment-cleaning-scrubbers", ["поломоеч"]),
        ("equipment-sweepers-sweepers", ["подмет"]),
    ],
    "Аксессуары для АВД": [
        ("equipment-accessories-quick", ["быстрос", "соедин"]),
        ("equipment-accessories-mud", ["грязев"]),
        ("equipment-accessories-lances", ["копь"]),
        ("equipment-accessories-guns", ["курк", "пистолет"]),
        ("equipment-accessories-tank", ["емкост"]),
        ("equipment-accessories-surface", ["поверхн"]),
        ("equipment-accessories-foam", ["пенообраз", "пеноген"]),
        ("equipment-accessories-sandblast", ["пескостру"]),
        ("equipment-accessories-nozzles", ["форсун"]),
        ("equipment-accessories-hoses", ["шланг"]),
    ],
    "Аксессуары для автомоек": [
        ("equipment-wash-accessories-reels", ["барабан"]),
        ("equipment-wash-accessories-mat-holders", ["коврик"]),
        ("equipment-wash-accessories-canisters", ["канистр"]),
        ("equipment-wash-accessories-hose-holders", ["держател", "шланг"]),
        ("equipment-wash-accessories-swivel-parts", ["поворотн", "консол"]),
        ("equipment-wash-accessories-high-pressure-lines", ["магистрал"]),
        ("equipment-wash-accessories-swivel-booms", ["консол"]),
        ("equipment-wash-accessories-car-stands", ["подстав"]),
        ("equipment-wash-accessories-shelves", ["полк"]),
        ("equipment-wash-accessories-sinks", ["рукомойн"]),
        ("equipment-wash-accessories-mat-stands", ["стенд", "коврик"]),
    ],
}

LABELS = [
    "Артикул", "Торговая марка", "Производитель", "Страна", "Габаритные размеры",
    "Вес", "Материал", "Вход", "Выход", "Давление", "Рабочее давление",
    "Макс. давление", "Производительность", "Температура", "Длина", "Ширина",
    "Высота", "Объем", "Мощность", "Напряжение", "Количество", "Диаметр",
]
LABEL_PATTERN = r"(" + "|".join(re.escape(l) for l in LABELS) + r")"


def extract_text(docx_path: Path) -> str:
    with zipfile.ZipFile(docx_path) as z:
        xml = z.read("word/document.xml").decode("utf-8", errors="ignore")
    xml = xml.replace("</w:p>", "\n")
    text = re.sub(r"<[^>]+>", "", xml)
    text = text.replace("\xa0", " ")
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    joined = " ".join(lines)
    return re.sub(r"\s+", " ", joined).strip()


def parse_specs(text: str):
    sku = ""
    specs = []
    if not text:
        return sku, specs, ""
    text = text.replace("Общие характеристики", "").strip()
    matches = list(re.finditer(LABEL_PATTERN, text))
    for i, m in enumerate(matches):
        label = m.group(1)
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        value = text[start:end].strip(" :;,-")
        if not value:
            continue
        if label == "Артикул" and not sku:
            sku = value.split(" ")[0]
        specs.append(f"{label}: {value}")
    if matches:
        last = matches[-1]
        tail = text[last.end():].strip()
        tail = re.sub(r"^\S+\s*", "", tail)
        desc = tail.strip() or text
    else:
        desc = text
    return sku, specs, desc


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "item"

def normalize(text: str) -> str:
    return text.lower().replace("ё", "е")

def match_subcategory(top: str, title: str) -> str | None:
    rules = SUBCATEGORY_RULES.get(top)
    if not rules:
        return None
    t = normalize(title)
    for cid, keywords in rules:
        if all(k in t for k in keywords):
            return cid
    for cid, keywords in rules:
        if any(k in t for k in keywords):
            return cid
    return None


def main():
    if not SOURCE.exists():
        raise SystemExit(f"Folder not found: {SOURCE}")
    ASSETS.mkdir(parents=True, exist_ok=True)

    products = []

    for source_root in SOURCES:
        if not source_root.exists():
            continue
        for docx in source_root.rglob("Документ Microsoft Word.docx"):
            rel = docx.relative_to(source_root)
            if source_root == EXTRA_SOURCE:
                top = "Аппараты высокого давления(+-)"
                category_id = "equipment-high-pressure-explosion"
            else:
                top = rel.parts[0]
                if top == "Страницы сайта":
                    continue
                category_id = CATEGORY_MAP.get(top)
                if not category_id:
                    continue

            product_dir = docx.parent
            title = product_dir.name.strip()
            # Override category by subfolder name when needed (e.g. explosion-proof AVD)
            subfolder = rel.parts[1] if len(rel.parts) > 1 else ""
            subfolder_norm = subfolder.lower()
            if top == "Аппараты высокого давления(+-)":
                for key, cid in SUBCATEGORY_MAP.items():
                    if key in subfolder_norm:
                        category_id = cid
                        break

            # Prefer subfolder-based match, then title-based match for subcategories
            subcat_id = match_subcategory(top, subfolder) if subfolder else None
            if not subcat_id:
                subcat_id = match_subcategory(top, title)
            if subcat_id:
                category_id = subcat_id

            try:
                text = extract_text(docx)
            except Exception:
                continue

            sku, specs, desc = parse_specs(text)
            short_desc = (desc[:160].strip() if desc else "")

            images = sorted([p for p in product_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}])
            if not images:
                continue

            pid = f"{slugify(title)}-{hashlib.md5(str(rel).encode()).hexdigest()[:8]}"
            dest_dir = ASSETS / pid
            if dest_dir.exists():
                shutil.rmtree(dest_dir)
            dest_dir.mkdir(parents=True, exist_ok=True)

            img_paths = []
            for idx, img in enumerate(images):
                safe_name = f"{slugify(title)}-{idx + 1}{img.suffix.lower()}"
                dest = dest_dir / safe_name
                shutil.copy2(img, dest)
                img_paths.append(str(dest.relative_to(ROOT)).replace("\\", "/"))

            products.append({
                "id": pid,
                "title": title,
                "price": 0,
                "sku": sku,
                "shortDescription": short_desc or "Описание будет добавлено позже.",
                "description": desc or "Описание будет добавлено позже.",
                "specs": specs,
                "images": img_paths,
                "categoryId": category_id,
            })

    OUT.write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Imported products: {len(products)}")


if __name__ == "__main__":
    main()
