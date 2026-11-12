# SeleSele

Aplikasi catatan dan kolaborasi tim seperti Notion
Fitur utama: workspace dengan undangan anggota, folder dan page dengan drag-and-drop, editor kolaboratif realtime, komentar pada teks, ekspor Markdown, login Microsoft, pencarian global, favorites/recent, template, riwayat versi, trash, notifikasi realtime dan email, serta bantuan menulis dan tanya jawab workspace melalui AI gateway OpenAI-compatible.

## Menjalankan dengan Docker

Memerlukan Docker dan Docker Compose. Stack mencakup aplikasi, MySQL, migrasi otomatis, serta Caddy untuk HTTPS dan WebSocket.

```sh
cp .env.docker.example .env.docker
```

Isi `.env.docker` sebelum menjalankan:

| Konfigurasi | Keterangan |
| --- | --- |
| `APP_ORIGIN` | URL aplikasi; default `https://localhost` |
| `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD` | Password berbeda untuk user database dan root |
| `AUTH_SECRET` | Secret acak minimal 32 karakter |
| `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | Kredensial Microsoft Entra ID |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | Opsional, untuk bantuan menulis AI |

Gunakan `DB_USER` non-root, misalnya `selesele`. Buat masing-masing password/secret dengan:

```sh
bun -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Jika Bun belum terpasang, gunakan `openssl rand -hex 32`.

```sh
docker compose --env-file .env.docker up -d --build
# Status dan log:
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f app migrate proxy
```

Buka **https://localhost**. Untuk sertifikat lokal, salin root certificate Caddy lalu percayai melalui pengaturan sistem/browser:

```sh
docker compose --env-file .env.docker cp proxy:/data/caddy/pki/authorities/local/root.crt ./caddy-local-root.crt
# macOS:
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain caddy-local-root.crt
```

Untuk server publik, gunakan `APP_ORIGIN=https://domain-anda`, arahkan DNS ke server, dan buka TCP 80/443. Caddy mengurus sertifikat HTTPS otomatis. Database, upload, dan sertifikat disimpan dalam volume; `docker compose --env-file .env.docker down` mempertahankannya, sedangkan `down -v` menghapusnya.

## Development lokal

Memerlukan **Bun 1.4.4+** dan **MySQL 8** yang sudah berjalan dengan database tersedia.

```sh
bun install --frozen-lockfile
cp .env.example .env
# Isi koneksi database, Microsoft Entra ID, dan AUTH_SECRET di .env.
bun run db:migrate
bun run dev
```

Buka **http://localhost:3000**. Migrasi lokal dijalankan manual; Docker menjalankannya sebelum aplikasi dimulai.

## Menjalankan dengan PM2

Memerlukan Node.js LTS untuk PM2, Bun, MySQL, dan reverse proxy HTTPS. Siapkan `.env` seperti development, lalu ubah `APP_ORIGIN` ke domain HTTPS dan gunakan `UPLOAD_DIR` persisten di luar `.output`.

```sh
npm install -g pm2
bun install --frozen-lockfile
bun run build
bun run db:migrate
BUN_BIN="$(command -v bun)" pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
# Jalankan perintah yang ditampilkan oleh pm2 startup.
```

Aplikasi mendengarkan `127.0.0.1:8030`; arahkan reverse proxy ke alamat ini dengan dukungan WebSocket dan streaming. Untuk port berbeda, tambahkan `PORT=3000` pada perintah start. Konfigurasi memakai satu proses Bun dan memberi waktu 30 detik untuk shutdown.

```sh
pm2 status
pm2 logs sele-sele
pm2 restart sele-sele
pm2 stop sele-sele
```

Untuk update, hentikan aplikasi, install dependency, build, jalankan migrasi, lalu restart. Jika mengubah nilai `HOST`/`PORT` dari shell, jalankan ulang ecosystem dengan `pm2 restart ecosystem.config.cjs --update-env`, lalu `pm2 save`. Secrets dibaca Bun dari `.env` pada direktori project.

## Konfigurasi Microsoft dan AI

Daftarkan aplikasi **Web, single-tenant** di Microsoft Entra ID. Isi tenant/client ID serta client secret, lalu daftarkan redirect URI sesuai `APP_ORIGIN`:

- Lokal: `http://localhost:3000/api/auth/microsoft/callback`
- Docker lokal: `https://localhost/api/auth/microsoft/callback`
- Production: `https://domain-anda/api/auth/microsoft/callback`

AI menggunakan endpoint `/chat/completions` dengan streaming. Isi `AI_BASE_URL` beserta prefix `/v1`, API key, dan model ID yang tersedia di gateway. Kredensial tetap di server; tanpa konfigurasi AI, fitur lain tetap bisa digunakan. File `.env` dan `.env.docker` tidak masuk Git maupun image Docker.

## Email notifikasi

Aktifkan `MAIL_ENABLED=true` lalu isi `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, dan `SMTP_FROM` pada `.env` atau `.env.docker`. `APP_ORIGIN` menjadi alamat link di email. Gunakan `SMTP_SECURE=true` untuk port 465; port 587 memakai `SMTP_SECURE=false` dan `SMTP_REQUIRE_TLS=true`. Untuk relay port 1025 tanpa TLS, set keduanya `false` sesuai konfigurasi server. Restart aplikasi setelah mengubah konfigurasi.

```sh
bun run db:migrate
bun run mail:check        # Verifikasi koneksi dan autentikasi, tanpa mengirim email
```

Undangan (termasuk penerima yang belum punya akun), komentar baru, balasan, dan mention masuk ke antrean MySQL. Request hanya menunggu penyimpanan antrean; pengiriman SMTP berjalan di background dalam proses aplikasi. Worker memeriksa antrean setiap lima detik, mencoba ulang kegagalan maksimal enam kali dengan jeda bertambah, dan melanjutkan pekerjaan setelah restart. Hak akses dan masa berlaku undangan diperiksa lagi sebelum pengiriman. Email tidak dikirim ke pelaku aksinya sendiri.

Status tersedia pada tabel `email_deliveries`: `pending`, `processing`, `sent`, `skipped`, dan `failed`; `last_error` hanya menyimpan kode kegagalan. Setelah memperbaiki SMTP, job `failed` dapat dijadwalkan ulang oleh operator dengan mengubah status ke `pending`, `attempts=0`, dan `available_at=CURRENT_TIMESTAMP(3)`. Pengiriman bersifat *at least once*: crash setelah SMTP menerima email tetapi sebelum status tersimpan dapat menghasilkan duplikat. `MAIL_ENABLED=false` menghentikan enqueue dan pengiriman email; notifikasi aplikasi tetap aktif.

## Cara menggunakan

1. Login dengan Microsoft, lalu buat workspace.
2. Ubah nama, ikon, dan deskripsi langsung pada heading.
3. Undang anggota melalui **Members**; undangan muncul di home penerima setelah login.
4. Tambahkan folder/page melalui tombol tambah di sidebar. Pindahkan page dengan drag-and-drop.
5. Pilih **Templates** untuk membuat meeting notes, SOP, project brief, atau dokumentasi siap pakai.
6. Gunakan **Ctrl/Cmd + K** untuk mencari judul dan isi dokumen. Tandai page dengan tombol bintang agar masuk **Favorites**; **Recently opened** menampilkan dokumen terakhir dibuka.
7. Tulis bersama secara realtime. Blok teks lalu pilih **Comment**; gunakan tombol mention pada composer untuk menyebut anggota. Notifikasi undangan, komentar, mention, dan balasan muncul pada ikon lonceng tanpa refresh manual.
8. Gunakan menu link editor untuk menautkan page dalam workspace. **Backlinks** menampilkan page yang merujuk dokumen tersebut.
9. Buka **Version history** untuk preview, menyimpan snapshot manual, atau restore. Maksimal 100 versi; snapshot otomatis dibuat paling sering sekali per menit, dan isi saat ini disimpan sebelum restore.
10. Item yang dihapus masuk **Trash**. Folder menyimpan page di dalamnya; workspace yang dihapus hanya bisa dipulihkan oleh owner. Penghapusan permanen memerlukan owner/admin (workspace: owner).
11. Pilih **Ask workspace** untuk tanya jawab berdasarkan maksimal lima cuplikan dokumen yang dapat diakses, dengan referensi sumber. Kualitas jawaban bergantung pada dokumen dan model gateway.

## Perintah penting

```sh
bun run lint             # Pemeriksaan kode
bun run typecheck        # Pemeriksaan tipe
bun run test             # Unit test
bun run verify           # Verifikasi lengkap, membutuhkan MySQL + izin CREATE/DROP database test
bun run db:generate      # Buat migrasi setelah perubahan schema
bun run db:migrate       # Terapkan migrasi
bun run build            # Build production
bun run start            # Jalankan hasil build
```

Untuk memperbarui deployment Docker:

```sh
docker compose --env-file .env.docker build
docker compose --env-file .env.docker stop proxy app
docker compose --env-file .env.docker run --rm migrate
docker compose --env-file .env.docker up -d --force-recreate
```

Production membutuhkan HTTPS dan penyimpanan upload persisten. Jalankan satu instance aplikasi karena koordinasi kolaborasi masih berada dalam proses. Penjelasan struktur kode tersedia di [panduan arsitektur](docs/architecture.md).

## Lisensi

[MIT](LICENSE)
