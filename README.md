# 0G_UploadTool

Alat otomatis untuk mengunggah data/file ke jaringan berbasis blockchain dengan sistem antrian dan kontrol penuh dari sisi user.

> Dibuat oleh: [@didinska](https://t.me/didinska)

---

## 🚀 Fitur
- Otomatisasi pengiriman data menggunakan private key wallet
- Berbasis Node.js + ethers.js
- Support jaringan EVM (Ethereum Sepolia by default)
- Logging TX secara real-time

---

## 📦 Instalasi

```bash
git clone https://github.com/didinska21/0G_UploadTool.git
cd 0G_UploadTool```

Jika belum install npm, jalankan:

```apt install npm```

Lalu install dependensi:

```npm install```

Jika muncul pertanyaan Y/n, pilih Y dan tunggu hingga proses selesai.

Kalau gagal atau belum semua module terpasang, ulangi:

```npm install```


---

⚙️ Konfigurasi ```.env```

Edit file .env:

```nano .env```

Lalu isi dengan private key milikmu:

```
PRIVATE_KEY=0xyourprivatekey```


> Simpan dengan CTRL + X, tekan Y, lalu Enter.
