#!/bin/bash

# Step 1: Clone repo
git clone https://github.com/didinska21/0G_UploadTool.git

# Step 2: Masuk ke direktori
cd 0G_UploadTool || { echo "Gagal masuk ke direktori 0G_UploadTool"; exit 1; }

# Step 3: Install dependencies
npm install

# Step 4: Isi .env
echo "Masukkan PRIVATE_KEY Anda (awali dengan 0x):"
read -r PRIVATE_KEY

# Simpan ke file .env
echo "PRIVATE_KEY=$PRIVATE_KEY" > .env

# Step 5: Jalankan script
echo "Menjalankan main.js..."
node main.js
