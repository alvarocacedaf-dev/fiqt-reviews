import json
import sys
from statistics import median

from paddleocr import PaddleOCR


def collect_text(value, output):
    if isinstance(value, dict):
        if isinstance(value.get("rec_texts"), list):
            output.extend(text.strip() for text in value["rec_texts"] if isinstance(text, str) and text.strip())
            return
        for child in value.values():
            collect_text(child, output)
        return
    if isinstance(value, (list, tuple)):
        for child in value:
            collect_text(child, output)


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Uso: ocr_extract.py <imagen> <resultado.json>")

    image_path, output_path = sys.argv[1], sys.argv[2]
    ocr = PaddleOCR(
        # Los modelos por defecto son "server/medium" y tardan mucho en CPU.
        # Esta evidencia contiene texto latino impreso, por lo que los modelos
        # mobile conservan la precisión necesaria con una carga mucho menor.
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_recognition_model_name="latin_PP-OCRv5_mobile_rec",
        text_recognition_batch_size=16,
        device="cpu",
        # La compilación de PaddlePaddle para Windows usa OpenBLAS y puede
        # cerrarse con 0xC0000005 cuando se fuerzan varios hilos.
        cpu_threads=1,
        enable_mkldnn=False,
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )
    predictions = ocr.predict(image_path)
    lines = []

    for prediction in predictions:
        data = getattr(prediction, "json", prediction)
        result = data.get("res", data) if isinstance(data, dict) else {}
        texts = result.get("rec_texts", []) if isinstance(result, dict) else []
        polygons = result.get("dt_polys", []) if isinstance(result, dict) else []

        if texts and len(texts) == len(polygons):
            cells = []
            heights = []
            for text, polygon in zip(texts, polygons):
                if not isinstance(text, str) or not text.strip() or not polygon:
                    continue
                xs = [point[0] for point in polygon]
                ys = [point[1] for point in polygon]
                height = max(ys) - min(ys)
                heights.append(height)
                cells.append({"text": text.strip(), "x": min(xs), "y": (min(ys) + max(ys)) / 2})

            tolerance = max(4, median(heights) * 0.7) if heights else 8
            rows = []
            for cell in sorted(cells, key=lambda item: (item["y"], item["x"])):
                row = next((candidate for candidate in rows if abs(candidate["y"] - cell["y"]) <= tolerance), None)
                if row is None:
                    rows.append({"y": cell["y"], "cells": [cell]})
                else:
                    row["cells"].append(cell)
                    row["y"] = sum(item["y"] for item in row["cells"]) / len(row["cells"])

            for row in sorted(rows, key=lambda item: item["y"]):
                lines.append(" | ".join(cell["text"] for cell in sorted(row["cells"], key=lambda item: item["x"])))
        else:
            collect_text(data, lines)

    # Conserva el orden, eliminando duplicados exactos.
    unique_lines = list(dict.fromkeys(lines))
    with open(output_path, "w", encoding="utf-8") as output_file:
        json.dump({"lines": unique_lines}, output_file, ensure_ascii=False)


if __name__ == "__main__":
    main()
