from flask import Flask, Response, jsonify, render_template, request
from datetime import datetime
from io import BytesIO, StringIO
import csv
import json
import joblib
import pandas as pd
import textwrap

app = Flask(__name__)

model = joblib.load("model/final_model.pkl")

FIELDS = [
    {
        "key": "ph",
        "label": "pH",
        "max": 14,
        "placeholder": "Contoh: 7.2",
        "description": "Nilai pH air. Rentang aman umumnya 6.5 sampai 8.5.",
    },
    {
        "key": "Hardness",
        "label": "Hardness",
        "max": 300,
        "placeholder": "Contoh: 180",
        "description": "Tingkat kekerasan air dalam mg/L.",
    },
    {
        "key": "Solids",
        "label": "Solids",
        "max": 5000,
        "placeholder": "Contoh: 1400",
        "description": "Total padatan terlarut di dalam air.",
    },
    {
        "key": "Chloramines",
        "label": "Chloramines",
        "max": 10,
        "placeholder": "Contoh: 7.1",
        "description": "Kadar chloramines yang digunakan sebagai disinfektan.",
    },
    {
        "key": "Sulfate",
        "label": "Sulfate",
        "max": 500,
        "placeholder": "Contoh: 320",
        "description": "Kandungan sulfat dalam air.",
    },
    {
        "key": "Conductivity",
        "label": "Conductivity",
        "max": 1000,
        "placeholder": "Contoh: 425",
        "description": "Konduktivitas listrik yang menunjukkan kadar ion terlarut.",
    },
    {
        "key": "Organic_carbon",
        "label": "Organic Carbon",
        "max": 30,
        "placeholder": "Contoh: 12.5",
        "description": "Jumlah karbon organik terlarut.",
    },
    {
        "key": "Trihalomethanes",
        "label": "Trihalomethanes",
        "max": 120,
        "placeholder": "Contoh: 68",
        "description": "Senyawa hasil samping proses desinfeksi.",
    },
    {
        "key": "Turbidity",
        "label": "Turbidity",
        "max": 10,
        "placeholder": "Contoh: 3.5",
        "description": "Tingkat kekeruhan air.",
    },
]

CLASS_LABELS = {
    0: {
        "name": "Sangat Buruk",
        "accent": "danger",
        "color": "#c2410c",
        "description": "Tidak aman untuk diminum dan membutuhkan penanganan menyeluruh.",
    },
    1: {
        "name": "Buruk",
        "accent": "warning",
        "color": "#ea580c",
        "description": "Kualitas air rendah dan perlu perbaikan sebelum digunakan.",
    },
    2: {
        "name": "Baik",
        "accent": "caution",
        "color": "#ca8a04",
        "description": "Cukup baik, namun tetap idealnya digunakan dengan pengawasan.",
    },
    3: {
        "name": "Sangat Baik",
        "accent": "success",
        "color": "#15803d",
        "description": "Kualitas air terbaik dari model ini dan aman untuk diminum.",
    },
}

PROBABILITY_ORDER = ["Sangat Buruk", "Buruk", "Baik", "Sangat Baik"]


def load_metrics():
    with open("static/metrics.json", encoding="utf-8") as metrics_file:
        return json.load(metrics_file)


def parse_features(payload):
    values = []
    for field in FIELDS:
        raw_value = payload.get(field["key"])
        if raw_value in (None, ""):
            raise ValueError(f"Field {field['label']} wajib diisi.")
        values.append(float(raw_value))
    return values


def build_prediction_response(features):
    input_frame = pd.DataFrame([features], columns=[field["key"] for field in FIELDS])
    prediction = int(model.predict(input_frame)[0])
    probabilities = model.predict_proba(input_frame)[0]
    confidence = float(probabilities[prediction])

    if prediction == 0:
        multi_class = 0 if confidence < 0.6 else 1
        all_probabilities = {
            "Sangat Buruk": round((1 - confidence) * 100, 2),
            "Buruk": round(confidence * 100, 2),
            "Baik": 0,
            "Sangat Baik": 0,
        }
    else:
        multi_class = 2 if confidence < 0.6 else 3
        all_probabilities = {
            "Sangat Buruk": 0,
            "Buruk": 0,
            "Baik": round((1 - confidence) * 100, 2),
            "Sangat Baik": round(confidence * 100, 2),
        }

    result_info = CLASS_LABELS[multi_class]

    return {
        "prediction": prediction,
        "multiClass": multi_class,
        "result": result_info["name"],
        "resultColor": result_info["color"],
        "resultDescription": result_info["description"],
        "confidence": round(confidence * 100, 2),
        "allProbabilities": all_probabilities,
        "inputs": [
            {
                "key": field["key"],
                "label": field["label"],
                "value": round(value, 2),
            }
            for field, value in zip(FIELDS, features)
        ],
    }


def build_export_payload(features):
    prediction_data = build_prediction_response(features)
    exported_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return {
        "exportedAt": exported_at,
        "metrics": load_metrics(),
        "prediction": prediction_data,
    }


def build_csv_content(export_payload):
    output = StringIO()
    writer = csv.writer(output)

    writer.writerow(["Water Quality Prediction Export"])
    writer.writerow(["Exported At", export_payload["exportedAt"]])
    writer.writerow([])
    writer.writerow(["Prediction Summary"])
    writer.writerow(["Result", export_payload["prediction"]["result"]])
    writer.writerow(["Description", export_payload["prediction"]["resultDescription"]])
    writer.writerow(["Confidence (%)", export_payload["prediction"]["confidence"]])
    writer.writerow([])
    writer.writerow(["Input Parameters"])
    writer.writerow(["Key", "Label", "Value"])
    for item in export_payload["prediction"]["inputs"]:
        writer.writerow([item["key"], item["label"], item["value"]])

    writer.writerow([])
    writer.writerow(["Probability Distribution"])
    writer.writerow(["Category", "Probability (%)"])
    for label in PROBABILITY_ORDER:
        writer.writerow([label, export_payload["prediction"]["allProbabilities"].get(label, 0)])

    writer.writerow([])
    writer.writerow(["Model Metrics"])
    writer.writerow(["Metric", "Value"])
    for key, value in export_payload["metrics"].items():
        writer.writerow([key, value])

    return output.getvalue().encode("utf-8-sig")


def escape_pdf_text(value):
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_pdf_content(export_payload):
    lines = [
        ("title", "Water Quality Prediction Report"),
        ("meta", f"Exported at: {export_payload['exportedAt']}"),
        ("blank", ""),
        ("heading", "Prediction Summary"),
        ("body", f"Result: {export_payload['prediction']['result']}"),
        ("body", f"Confidence: {export_payload['prediction']['confidence']}%"),
        ("body", f"Description: {export_payload['prediction']['resultDescription']}"),
        ("blank", ""),
        ("heading", "Input Parameters"),
    ]

    for item in export_payload["prediction"]["inputs"]:
        lines.append(("body", f"{item['label']}: {item['value']}"))

    lines.extend(
        [
            ("blank", ""),
            ("heading", "Probability Distribution"),
        ]
    )

    for label in PROBABILITY_ORDER:
        value = export_payload["prediction"]["allProbabilities"].get(label, 0)
        lines.append(("body", f"{label}: {value}%"))

    lines.extend(
        [
            ("blank", ""),
            ("heading", "Model Metrics"),
        ]
    )

    for key, value in export_payload["metrics"].items():
        lines.append(("body", f"{key.upper()}: {round(float(value), 4)}"))

    page_width = 595
    page_height = 842
    top_margin = 64
    bottom_margin = 56
    line_height = 16
    left_margin = 52

    pages = []
    current_page = []
    current_y = page_height - top_margin

    for style, raw_text in lines:
        wrapped_lines = [""]
        if style != "blank":
            width = 34 if style == "title" else 82
            wrapped_lines = textwrap.wrap(raw_text, width=width) or [raw_text]

        for index, segment in enumerate(wrapped_lines):
            if current_y < bottom_margin:
                pages.append(current_page)
                current_page = []
                current_y = page_height - top_margin

            if style == "blank":
                current_y -= line_height * 0.6
                continue

            font = "F2" if style in {"title", "heading"} else "F1"
            size = 20 if style == "title" else 13 if style == "heading" else 10.5
            current_page.append((font, size, left_margin, current_y, segment))
            current_y -= 22 if style == "title" and index == len(wrapped_lines) - 1 else line_height

        if style == "heading":
            current_y -= 2

    if current_page:
        pages.append(current_page)

    objects = []

    def add_object(data):
        objects.append(data)
        return len(objects)

    font_regular_id = add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font_bold_id = add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

    page_ids = []
    content_ids = []

    for page in pages:
        stream_commands = ["BT"]
        for font, size, x, y, text in page:
            stream_commands.append(f"/{font} {size} Tf")
            stream_commands.append(f"1 0 0 1 {x} {y} Tm")
            stream_commands.append(f"({escape_pdf_text(text)}) Tj")
        stream_commands.append("ET")
        stream_data = "\n".join(stream_commands).encode("latin-1", errors="replace")
        content_id = add_object(
            f"<< /Length {len(stream_data)} >>\nstream\n"
            + stream_data.decode("latin-1", errors="replace")
            + "\nendstream"
        )
        page_id = add_object(
            "<< /Type /Page /Parent PAGES_ID 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 {font_regular_id} 0 R /F2 {font_bold_id} 0 R >> >> "
            f"/Contents {content_id} 0 R >>"
        )
        content_ids.append(content_id)
        page_ids.append(page_id)

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    pages_id = add_object(f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>")

    for page_id in page_ids:
        objects[page_id - 1] = objects[page_id - 1].replace("PAGES_ID", str(pages_id))

    catalog_id = add_object(f"<< /Type /Catalog /Pages {pages_id} 0 R >>")

    buffer = BytesIO()
    buffer.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]

    for index, obj in enumerate(objects, start=1):
        offsets.append(buffer.tell())
        buffer.write(f"{index} 0 obj\n".encode("latin-1"))
        buffer.write(obj.encode("latin-1"))
        buffer.write(b"\nendobj\n")

    xref_position = buffer.tell()
    buffer.write(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    buffer.write(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        buffer.write(f"{offset:010d} 00000 n \n".encode("latin-1"))

    buffer.write(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\n"
            f"startxref\n{xref_position}\n%%EOF"
        ).encode("latin-1")
    )

    return buffer.getvalue()


def export_filename(extension):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"water_quality_prediction_{timestamp}.{extension}"


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/config")
def api_config():
    return jsonify(
        {
            "appTitle": "Water Quality Classifier",
            "appSubtitle": "React frontend connected to Flask prediction API",
            "fields": FIELDS,
            "metrics": load_metrics(),
            "classLabels": CLASS_LABELS,
            "probabilityOrder": PROBABILITY_ORDER,
        }
    )


@app.route("/api/predict", methods=["POST"])
def api_predict():
    try:
        payload = request.get_json(silent=True)
        if payload is None:
            payload = request.form

        features = parse_features(payload)
        return jsonify({"ok": True, "data": build_prediction_response(features)})
    except ValueError as error:
        return jsonify({"ok": False, "error": str(error)}), 400
    except Exception as error:
        return jsonify(
            {"ok": False, "error": f"Terjadi kesalahan saat memproses prediksi: {error}"}
        ), 500


@app.route("/api/export/csv", methods=["POST"])
def export_csv():
    try:
        payload = request.get_json(silent=True) or request.form
        features = parse_features(payload)
        file_bytes = build_csv_content(build_export_payload(features))
        return Response(
            file_bytes,
            content_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f"attachment; filename={export_filename('csv')}"
            },
        )
    except ValueError as error:
        return jsonify({"ok": False, "error": str(error)}), 400
    except Exception as error:
        return jsonify({"ok": False, "error": f"Gagal membuat CSV: {error}"}), 500


@app.route("/api/export/pdf", methods=["POST"])
def export_pdf():
    try:
        payload = request.get_json(silent=True) or request.form
        features = parse_features(payload)
        file_bytes = build_pdf_content(build_export_payload(features))
        return Response(
            file_bytes,
            mimetype="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={export_filename('pdf')}"
            },
        )
    except ValueError as error:
        return jsonify({"ok": False, "error": str(error)}), 400
    except Exception as error:
        return jsonify({"ok": False, "error": f"Gagal membuat PDF: {error}"}), 500


if __name__ == "__main__":
    app.run(debug=True)
