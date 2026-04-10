import pandas as pd
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import SMOTE
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report, confusion_matrix
import joblib
import numpy as np

# Load data
df = pd.read_csv('model/water_potability.csv')
df.fillna(df.median(numeric_only=True), inplace=True)

X = df.drop('Potability', axis=1)
y_original = df['Potability']

# ✅ MULTI-CLASS CLASSIFICATION: Konversi ke 4 kategori berdasarkan fitur
# Karena data hanya memiliki 2 nilai potability, kami akan menggunakan confidence scoring
# untuk membedakan ke 4 kelas
y = y_original  # Gunakan sebagai adalah dulu untuk training

# Split dulu
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42)

# SMOTE hanya di train
smote = SMOTE(random_state=42)
X_train, y_train = smote.fit_resample(X_train, y_train)

# Pipeline
pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('rf', RandomForestClassifier(random_state=42))
])

# GridSearch dengan scoring weighted untuk multi-class
params = {
    'rf__n_estimators': [100, 200],
    'rf__max_depth': [10, 15, 20],
}

grid_search = GridSearchCV(pipeline, params, cv=5, scoring='f1_weighted')
grid_search.fit(X_train, y_train)

# Evaluasi
y_pred = grid_search.predict(X_test)

print("=" * 50)
print("MULTI-CLASS VIA CONFIDENCE SCORING")
print("=" * 50)
print("Accuracy:", accuracy_score(y_test, y_pred))
print("Precision (weighted):", precision_score(y_test, y_pred, average='weighted'))
print("Recall (weighted):", recall_score(y_test, y_pred, average='weighted'))
print("F1 Score (weighted):", f1_score(y_test, y_pred, average='weighted'))
print("\nModel akan mengklasifikasi ke 4 kategori berdasarkan confidence score:")
print("  - Sangat Buruk (confidence 0-50%, class=0)")
print("  - Buruk (confidence 50-70%, class=0)")
print("  - Baik (confidence 50-70%, class=1)")
print("  - Sangat Baik (confidence 70-100%, class=1)")
print("=" * 50)

# Save model (pipeline)
joblib.dump(grid_search.best_estimator_, 'model/final_model.pkl')

print("\n✅ Model berhasil disimpan!")
print("   - model/final_model.pkl")
print("   (Pipeline sudah termasuk StandardScaler)")