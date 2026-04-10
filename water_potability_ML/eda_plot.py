import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import os

# Load data
df = pd.read_csv('model/water_potability.csv')
df.fillna(df.mean(), inplace=True)

# Buat folder output gambar
os.makedirs('static/img', exist_ok=True)

# 1. Korelasi antar fitur
plt.figure(figsize=(10, 8))
sns.heatmap(df.corr(), annot=True, cmap='coolwarm', fmt=".2f")
plt.title('Korelasi Antar Fitur')
plt.tight_layout()
plt.savefig('static/img/heatmap.png')
plt.close()

# 2. Distribusi Potability
plt.figure(figsize=(6, 4))
sns.countplot(x='Potability', data=df, palette='pastel')
plt.title('Distribusi Potability (Layak vs Tidak Layak)')
plt.xlabel('Potability')
plt.ylabel('Jumlah')
plt.savefig('static/img/potability_dist.png')
plt.close()

# 3. Histogram tiap fitur
for col in df.columns[:-1]:
    plt.figure(figsize=(6, 4))
    sns.histplot(df[col], kde=True, color='skyblue')
    plt.title(f'Distribusi {col}')
    plt.xlabel(col)
    plt.ylabel('Frekuensi')
    plt.tight_layout()
    plt.savefig(f'static/img/hist_{col}.png')
    plt.close()
