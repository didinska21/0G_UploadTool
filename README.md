tutorial install 0G_Uploadtool

git clone https://github.com/didinska21/0G_UploadTool.git

cd 0G_UploadTool

npm install
jika belum install npm
install dulu dengan cara
apt install npm

jika ada Y/n pilih saja Y dan tunggu hingga selesai

setelah itu ulangi npm install
setelah semua module selesai di download

lanjut configurasi

nano .env

ubah bagian PRIVATE_KEY=0x your private key
ubah jadi punya kamu 
setelah itu save ctrl X Y enter

setelah itu run botnya

node main.js
