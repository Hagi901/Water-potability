# Deploy ke Render

## Ringkasan

Project ini sudah disiapkan untuk deploy ke Render dengan:

- `requirements.txt`
- `.python-version`
- `render.yaml`

Start command yang dipakai:

```bash
gunicorn app:app
```

## Persiapan

1. Pastikan folder yang di-push ke Git hanya folder ini:

```text
water_potability_ML/
```

2. Jangan push `.venv` dari folder luar.

3. Pastikan file model berikut ikut ter-commit:

- `model/final_model.pkl`
- `static/metrics.json`
- seluruh folder `templates/`
- seluruh folder `static/`

## Opsi deploy

### Opsi 1: paling mudah

Push folder ini ke GitHub, lalu di Render pilih **New + Web Service** dan hubungkan repo tersebut.

### Opsi 2: Blueprint

Push folder ini ke GitHub, lalu di Render pilih **New + Blueprint** agar `render.yaml` terbaca otomatis.
