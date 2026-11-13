# SeleSele

Workspace kolaboratif untuk dokumen, kanban, whiteboard, dan diagram.
Satu monolith Nuxt + Bun dengan login Microsoft, folder dan izin akses per item, editor dokumen realtime, kanban task, whiteboard untuk menggambar, serta editor diagram node/konektor. Mendukung komentar dokumen, pencarian lintas jenis item, favorites, template, version history, arsip, Trash, AI workspace, email notifikasi, dan backup terjadwal.

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

Schema development memakai satu baseline `drizzle/0000_initial_schema.sql` dengan 24 tabel. Rewrite ini mengganti model konten menjadi `items`; untuk lingkungan development lama, jalankan `bun run db:reset` satu kali. **Reset menghapus semua data development, termasuk akun dan session.** Setelah itu gunakan `bun run db:migrate` untuk perubahan schema berikutnya.

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

## Anggota dan akses dokumen

Tambahkan satu atau beberapa email dari halaman **Members**. Akses langsung aktif tanpa persetujuan; email yang belum punya akun terhubung otomatis saat login Microsoft dengan email yang sama. Role tersedia: Owner, Admin, Member, dan Viewer. Pencarian, filter, grup, aksi massal, suspend, detail anggota, serta riwayat perubahan tersedia di halaman ini.

Owner mengelola grup dan Admin. Izin folder/item dapat diwariskan atau dibatasi untuk orang/grup tertentu: tanpa akses, baca, komentar, atau edit, dengan tanggal kedaluwarsa opsional. Atur dari **Manage access** pada dokumen atau **Members → Document access**. Izin item dibatasi oleh folder induknya; Admin tetap membutuhkan akses ke dokumen restricted. Pemeriksaan yang sama berlaku pada editor, komentar, pencarian, AI, ekspor, Trash, notifikasi, dan gambar.

## Workspace Settings

Pengaturan dikelompokkan menjadi General, Workspace rules, Notifications, Activity log, Data & recovery, serta Lifecycle. Members tetap berada pada halaman terpisah.

- **General:** nama, ikon, deskripsi, dan halaman pembuka workspace.
- **Workspace rules:** owner/admin menentukan siapa yang boleh mengundang anggota, membuat item/folder, dan menghapus konten. Hanya Owner yang dapat menetapkan atau mengelola Admin.
- **Notifications:** preferensi email pribadi per workspace, dengan pengiriman langsung atau ringkasan harian pukul **08:00 WIB**. Preferensi undangan berlaku untuk seluruh akun dan undangan dikirim langsung. Notifikasi aplikasi tetap aktif. Email yang sudah mengantre memeriksa preferensi dan hak akses lagi sebelum dikirim.
- **Activity log:** riwayat perubahan konten, anggota, dan pengaturan, hanya untuk owner/admin. Perubahan dokumen mengikuti interval snapshot agar pengetikan tidak memenuhi log.
- **Data & recovery:** statistik dokumen/lampiran dan ekspor `.tar.gz` berisi Markdown serta gambar yang diunggah dan dirujuk item aktif. Batas ekspor 50 MB. Retensi Trash dapat dipilih 7/30/90 hari atau manual; default manual. Penghapusan otomatis berlaku juga untuk item lama dan tidak dapat dibatalkan. Worker memeriksa setiap menit; workspace yang diarsipkan tidak diproses.
- **Lifecycle:** hanya owner dapat mengarsipkan/memulihkan dan mentransfer kepemilikan. Arsip tetap bisa dibaca, tetapi konten dan kolaborasinya tidak dapat diubah. Owner lama menjadi admin setelah transfer. Owner harus transfer kepemilikan sebelum keluar.

## Email notifikasi

Aktifkan `MAIL_ENABLED=true` lalu isi `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, dan `SMTP_FROM` pada `.env` atau `.env.docker`. `APP_ORIGIN` menjadi alamat link di email. Gunakan `SMTP_SECURE=true` untuk port 465; port 587 memakai `SMTP_SECURE=false` dan `SMTP_REQUIRE_TLS=true`. Untuk relay port 1025 tanpa TLS, set keduanya `false` sesuai konfigurasi server. Restart aplikasi setelah mengubah konfigurasi.

```sh
bun run db:migrate
bun run mail:check        # Verifikasi koneksi dan autentikasi, tanpa mengirim email
```

Undangan (termasuk penerima yang belum punya akun), komentar baru, balasan, dan mention masuk ke antrean MySQL. Request hanya menunggu penyimpanan antrean; pengiriman SMTP berjalan di background dalam proses aplikasi. Worker memeriksa antrean setiap lima detik (email ringkasan menunggu jadwalnya, maksimal 50 aktivitas per email), mencoba ulang kegagalan maksimal enam kali dengan jeda bertambah, dan melanjutkan pekerjaan setelah restart. Hak akses dan masa berlaku undangan diperiksa lagi sebelum pengiriman. Email tidak dikirim ke pelaku aksinya sendiri.

Status tersedia pada tabel `email_deliveries`: `pending`, `processing`, `sent`, `skipped`, dan `failed`; `last_error` hanya menyimpan kode kegagalan. Setelah memperbaiki SMTP, job `failed` dapat dijadwalkan ulang oleh operator dengan mengubah status ke `pending`, `attempts=0`, dan `available_at=CURRENT_TIMESTAMP(3)`. Pengiriman bersifat *at least once*: crash setelah SMTP menerima email tetapi sebelum status tersimpan dapat menghasilkan duplikat. `MAIL_ENABLED=false` menghentikan enqueue dan pengiriman email; notifikasi aplikasi tetap aktif.

## Cara menggunakan

1. Login dengan Microsoft, lalu buat workspace. Ubah nama, ikon, dan deskripsinya langsung pada heading.
2. Gunakan tombol tambah pada **Items** atau **New item**, lalu pilih **Document**, **Kanban**, **Whiteboard**, atau **Diagram**. Item langsung dibuat tanpa modal. Folder dapat berisi semua jenis item.
3. Pindahkan item dengan drag-and-drop pada sidebar. Jika izin anggota berubah akibat folder tujuan, tinjau dampaknya sebelum mengonfirmasi.
4. **Document:** tulis bersama secara realtime, tambahkan tabel/gambar, blok teks untuk komentar, mention anggota, gunakan backlinks dan ekspor Markdown.
5. **Kanban:** kelola kolom dan task dengan drag-and-drop atau menu Move to. Task memiliki nomor, deskripsi, prioritas, assignee, due date, labels, dan checklist. Tersedia board/list, pencarian, filter, duplikasi, urutan kolom, dan batas WIP.
6. **Whiteboard:** gunakan pen, bentuk, garis, panah, teks, sticky note, selection, eraser, warna, dan ketebalan garis. Objek dapat dipindahkan/duplikasi, dengan pan, zoom, fit, dan ekspor SVG. Mendukung pointer, touch, dan pen.
7. **Diagram:** tambahkan process, decision, start/end, atau note. Hubungkan handles, ubah label dan jalur konektor, resize node, gunakan grid, pan/zoom, minimap, serta ekspor SVG.
8. Editor kanban/whiteboard/diagram menyimpan otomatis. Gunakan undo/redo, impor/ekspor JSON, dan version history untuk preview atau restore. Perubahan dari pengguna lain muncul melalui invalidation realtime. Jika revisi bertabrakan, draft dipertahankan untuk ditinjau; aplikasi tidak menggabungkan perubahan secara diam-diam. Simpan/ekspor draft sebelum meninggalkan editor.
9. **Templates** menyediakan 10 pilihan bawaan: meeting notes, project brief, SOP, team documentation, project delivery, content pipeline, brainstorm, retrospective, review workflow, dan system architecture. Gunakan filter jenis dan pencarian untuk memilih, lalu buat item langsung dari kartu template. Workspace juga dapat menyimpan snapshot keempat jenis item. Hanya template dari sumber yang masih dapat dibaca yang ditampilkan. Owner/Admin dapat menyimpan template dari menu item.
10. **Members** mengelola anggota, grup, role, dan akses dokumen/item tanpa approval undangan. **Settings** mengelola aturan workspace, email, aktivitas, ekspor, retensi, dan lifecycle.
11. **Ctrl/Cmd + K** mencari judul dan isi dokumen, task kanban, teks whiteboard, serta label diagram sesuai izin. Favorites dan Recently opened berlaku untuk semua jenis item.
12. **Ask workspace** menyediakan chatbot dengan riwayat privat yang dapat dicari/disembunyikan, pesan Markdown, salin jawaban, sumber yang bisa dibuka, input di bawah, dan auto-scroll yang menghormati posisi baca. Enter mengirim, Shift + Enter membuat baris baru. Jawaban ditampilkan setelah respons server selesai; belum menggunakan streaming token. Sumber hanya berasal dari item yang dapat dibaca; jawaban yang kehilangan akses sumber disembunyikan. AI membaca teks item, bukan menganalisis gambar/coretan.
13. **Archive** menjaga item tetap dapat dibaca tanpa dapat diubah. Item yang dihapus masuk **Trash** dan dapat dipulihkan. Version history menyimpan maksimal 100 snapshot; restore menyimpan isi terkini terlebih dahulu.

## Model dan izin konten

API utama berada pada `/api/items` dan `/api/workspaces/:workspaceId/items`, dengan rute UI `/workspaces/:workspaceId/items/:id`. Jenis item ditentukan saat dibuat dan tidak dapat diganti lewat edit metadata. Dokumen memakai Yjs/WebSocket; item terstruktur memakai JSON dengan revision check dan SSE invalidation. Semua jenis memakai aturan akses item/folder yang sama. Role Viewer tidak dapat mengedit; arsip menolak penulisan. Komentar dengan anchor teks tersedia pada dokumen.

Ekspor workspace menghasilkan Markdown untuk dokumen, JSON untuk item terstruktur, manifest jenis item, serta lampiran dokumen yang diizinkan. Backup operator tetap mencakup seluruh database dan file upload. Aplikasi berjalan sebagai satu instance Bun untuk koordinasi kolaborasi dan invalidation.

## Backup

Aktifkan worker Docker dengan `docker compose --env-file .env.docker --profile backup up -d --build backup`. Default: backup saat mulai dan setiap pukul **01:00 WIB**, retensi **14 hari**, tersimpan di `./backups`. Backup mencakup seluruh database dan lampiran dengan pemeriksaan SHA-256; ekspor workspace tetap merupakan fitur berbeda. Lihat [panduan backup dan restore](docs/backup.md) untuk konfigurasi lokal/PM2, uji pemulihan, serta restore Docker.

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

Untuk memeriksa SSR halaman workspace saat `bun run dev` sedang berjalan, jalankan `bun run test:development` di terminal lain. Pengujian memakai fixture sementara dan tidak mengirim email.
