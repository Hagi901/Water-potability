const { useEffect, useMemo, useState } = React;

function formatMetricLabel(label) {
  return label.replace(/_/g, " ").toUpperCase();
}

function App() {
  const [config, setConfig] = useState(null);
  const [formData, setFormData] = useState({});
  const [result, setResult] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState({ csv: false, pdf: false });
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch("/api/config");
        const payload = await response.json();
        setConfig(payload);
        const initialValues = {};
        payload.fields.forEach((field) => {
          initialValues[field.key] = "";
        });
        setFormData(initialValues);
      } catch (fetchError) {
        setError("Konfigurasi aplikasi gagal dimuat. Coba refresh halaman.");
      } finally {
        setLoadingConfig(false);
      }
    }

    fetchConfig();
  }, []);

  const completion = useMemo(() => {
    if (!config) {
      return 0;
    }
    const filled = config.fields.filter((field) => formData[field.key] !== "").length;
    return Math.round((filled / config.fields.length) * 100);
  }, [config, formData]);

  function handleChange(key, value) {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Prediksi gagal diproses.");
      }

      setResult(payload.data);
    } catch (submitError) {
      setResult(null);
      setError(submitError.message || "Terjadi kesalahan saat menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function downloadExport(format) {
    if (!result) {
      return;
    }

    setError("");
    setExporting((current) => ({
      ...current,
      [format]: true,
    }));

    try {
      const response = await fetch(`/api/export/${format}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let message = `Export ${format.toUpperCase()} gagal diproses.`;
        try {
          const payload = await response.json();
          message = payload.error || message;
        } catch (_error) {
          // Fallback to the default message when response is not JSON.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition") || "";
      const filenameMatch = contentDisposition.match(/filename=([^;]+)/i);
      const filename = filenameMatch
        ? filenameMatch[1].trim().replace(/^"|"$/g, "")
        : `water_quality_prediction.${format}`;

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setError(downloadError.message || "Export file gagal dibuat.");
    } finally {
      setExporting((current) => ({
        ...current,
        [format]: false,
      }));
    }
  }

  function fillSampleData() {
    setFormData({
      ph: "7.1",
      Hardness: "204.9",
      Solids: "20791.3",
      Chloramines: "7.3",
      Sulfate: "368.5",
      Conductivity: "564.3",
      Organic_carbon: "10.3",
      Trihalomethanes: "86.9",
      Turbidity: "2.96",
    });
    setError("");
  }

  function resetForm() {
    if (!config) {
      return;
    }
    const nextValues = {};
    config.fields.forEach((field) => {
      nextValues[field.key] = "";
    });
    setFormData(nextValues);
    setResult(null);
    setError("");
  }

  if (loadingConfig) {
    return (
      <main className="page-shell">
        <section className="hero loading-hero">
          <div className="loading-orb"></div>
          <p>Menyiapkan dashboard kualitas air...</p>
        </section>
      </main>
    );
  }

  if (!config) {
    return (
      <main className="page-shell">
        <section className="hero error-state">
          <h1>Aplikasi belum siap</h1>
          <p>{error || "Konfigurasi tidak tersedia."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">React + Flask</span>
          <h1>{config.appTitle}</h1>
          <p>{config.appSubtitle}</p>
        </div>
        <div className="hero-stats">
          <div className="hero-stat-card">
            <span className="hero-stat-value">{config.fields.length}</span>
            <span className="hero-stat-label">parameter input</span>
          </div>
          <div className="hero-stat-card">
            <span className="hero-stat-value">{completion}%</span>
            <span className="hero-stat-label">form terisi</span>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        {Object.entries(config.metrics).map(([key, value]) => (
          <article className="metric-card" key={key}>
            <span className="metric-label">{formatMetricLabel(key)}</span>
            <strong className="metric-value">{Number(value).toFixed(3)}</strong>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <section className="panel glass-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Input</span>
              <h2>Masukkan parameter air</h2>
            </div>
            <div className="panel-actions">
              <button type="button" className="ghost-btn" onClick={fillSampleData}>
                Isi contoh
              </button>
              <button type="button" className="ghost-btn" onClick={resetForm}>
                Reset
              </button>
            </div>
          </div>

          <form className="prediction-form" onSubmit={handleSubmit}>
            <div className="input-grid">
              {config.fields.map((field) => (
                <label className="field-card" key={field.key}>
                  <span className="field-topline">
                    <span className="field-label">{field.label}</span>
                    <span className="field-range">Max {field.max}</span>
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    placeholder={field.placeholder}
                    value={formData[field.key] ?? ""}
                    onChange={(event) => handleChange(field.key, event.target.value)}
                    required
                  />
                  <small>{field.description}</small>
                </label>
              ))}
            </div>

            {error ? <div className="alert-box">{error}</div> : null}

            <div className="form-footer">
              <div className="completion-card">
                <span>Progress input</span>
                <strong>{completion}%</strong>
                <div className="progress-track">
                  <div className="progress-bar-fill" style={{ width: `${completion}%` }}></div>
                </div>
              </div>
              <button className="submit-btn" type="submit" disabled={submitting}>
                {submitting ? "Memproses prediksi..." : "Prediksi kualitas air"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel result-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Hasil</span>
              <h2>Ringkasan prediksi</h2>
            </div>
          </div>

          {!result ? (
            <div className="empty-result">
              <div className="empty-badge">Siap</div>
              <h3>Belum ada hasil</h3>
              <p>
                Lengkapi semua parameter lalu kirim form untuk melihat klasifikasi,
                confidence score, dan distribusi probabilitas kategori.
              </p>
            </div>
          ) : (
            <div className="result-stack">
              <article className="result-hero-card">
                <span className="result-pill" style={{ backgroundColor: result.resultColor }}>
                  {result.result}
                </span>
                <h3>{result.result}</h3>
                <p>{result.resultDescription}</p>
              </article>

              <article className="confidence-card">
                <div className="confidence-row">
                  <span>Confidence score</span>
                  <strong>{result.confidence}%</strong>
                </div>
                <div className="progress-track large">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${result.confidence}%`,
                      backgroundColor: result.resultColor,
                    }}
                  ></div>
                </div>
              </article>

              <article className="distribution-card">
                <h3>Distribusi kategori</h3>
                <div className="distribution-list">
                  {config.probabilityOrder.map((label) => {
                    const value = result.allProbabilities[label] ?? 0;
                    return (
                      <div className="distribution-row" key={label}>
                        <span className="distribution-label">{label}</span>
                        <div className="progress-track">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${value}%`,
                              backgroundColor:
                                label === result.result ? result.resultColor : "#2563eb",
                            }}
                          ></div>
                        </div>
                        <strong>{value}%</strong>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="summary-card">
                <div className="card-topline">
                  <h3>Input terakhir</h3>
                  <div className="export-actions">
                    <button
                      type="button"
                      className="ghost-btn export-btn"
                      onClick={() => downloadExport("csv")}
                      disabled={exporting.csv || exporting.pdf}
                    >
                      {exporting.csv ? "Membuat CSV..." : "Export CSV"}
                    </button>
                    <button
                      type="button"
                      className="ghost-btn export-btn"
                      onClick={() => downloadExport("pdf")}
                      disabled={exporting.csv || exporting.pdf}
                    >
                      {exporting.pdf ? "Membuat PDF..." : "Export PDF"}
                    </button>
                  </div>
                </div>
                <div className="summary-grid">
                  {result.inputs.map((item) => (
                    <div className="summary-item" key={item.key}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
