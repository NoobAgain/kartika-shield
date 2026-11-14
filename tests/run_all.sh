#!/bin/sh
# Menjalankan seluruh pengujian dan menulis hasil ke eval/hasil/*.json, lalu membuat TEST_REPORT.md.
# Prasyarat: Node >= 22, Python 3 + playwright (chromium). Lihat INSTALLATION.md.
set -e
cd "$(dirname "$0")/.."
node tools/build.js
node tests/unit_engine.js --json | tail -1
node tests/test_public_news.js
node tests/test_news_analysis.js
node tests/test_mini_tv.js
node tests/test_n8n_image_payload.js
node tests/eval_teks.js eval/dataset_dev.csv --json | tail -1 > eval/hasil/teks_dev.json
node tests/eval_teks.js eval/dataset_uji_tertahan.csv --json | tail -1 > eval/hasil/teks_uji_tertahan.json
node tests/eval_narasi.js --json | tail -1
node --expose-gc tests/perf.js --json | tail -3
python3 tests/test_functional.py index.html
python3 tests/test_functional.py dist/kartika-shield.html kartika-shield
python3 tests/test_security.py index.html
python3 tests/buat_laporan.py
