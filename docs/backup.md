# Backup dan pemulihan

Backup operator mencakup seluruh tabel MySQL (termasuk session, izin, komentar, riwayat AI, dan antrean email) serta seluruh file pada `UPLOAD_DIR`. Ini berbeda dari ekspor workspace yang hanya berisi dokumen dan lampirannya.

## Jadwal Docker

```sh
docker compose --env-file .env.docker --profile backup up -d --build backup
docker compose --env-file .env.docker logs -f backup
```

Worker membuat backup saat mulai, kemudian setiap hari pada `BACKUP_HOUR_UTC` (default `18`, yaitu 01:00 WIB). `BACKUP_RETENTION_DAYS` default 14; `0` mematikan penghapusan otomatis. Jadwal dan retensi dibaca dari `.env.docker`. Backup tersimpan pada `./backups` host; direktori ini dikecualikan dari Git dan image Docker. Simpan salinan terenkripsi di media/server terpisah untuk melindungi dari kerusakan host. Backup berisi data pribadi dan secret session; batasi akses operator.

Satu backup berisi `database.sql.gz`, `uploads.tar.gz`, dan `manifest.json` dengan ukuran dan SHA-256. Backup dipublikasikan setelah kedua arsip berhasil diverifikasi. Direktori `.partial` tidak dianggap backup yang selesai. Worker menggunakan lock agar create/restore tidak berjalan bersamaan. Jika proses mati paksa, periksa proses yang masih aktif sebelum menghapus `.backup.lock` yang tertinggal.

MySQL memakai snapshot transaksi InnoDB; arsip lampiran diambil setelah SQL. Jangan menjalankan migrasi saat backup berlangsung. Untuk titik pemulihan yang tepat antara database dan file, hentikan penulisan aplikasi selama backup manual. Backup online terjadwal tidak menjamin snapshot atomik lintas database dan filesystem.

## CLI lokal atau PM2

Memerlukan Bun, MySQL 8 client (`mysql`, `mysqldump`), `tar`, dan `gzip`. Konfigurasi koneksi memakai `DB_*` pada `.env`; `UPLOAD_DIR` harus menunjuk penyimpanan lampiran aplikasi yang sebenarnya.

```sh
bun run backup:create
bun run backup:verify -- /absolute/path/backup-directory
bun run backup:schedule
```

`BACKUP_DIR` default `.data/backups`. Jalankan scheduler sebagai service terpisah, misalnya `pm2 start scripts/backup.ts --interpreter bun --name sele-sele-backup -- schedule`, lalu `pm2 save`. Proses aplikasi tidak harus menjalankan scheduler. Jika MySQL client hanya tersedia dalam container yang berjalan, set `BACKUP_MYSQL_CONTAINER` ke nama container, dan `BACKUP_MYSQL_HOST`/`BACKUP_MYSQL_PORT` ke alamat MySQL dari dalam container tersebut. Password hanya diteruskan melalui environment proses, bukan argumen command line.

## Restore

Uji pemulihan ke database kosong dan direktori upload terpisah terlebih dahulu. Database tujuan harus sudah tersedia dan user SQL memerlukan hak untuk membuat/menghapus tabel. Restore menimpa tabel dalam backup; gunakan target kosong agar tidak menyisakan tabel dari versi schema lain. Restore bukan transaksi menyeluruh: kegagalan di tengah proses memerlukan pengulangan dari target bersih. Jangan menyalakan aplikasi jika restore gagal.

1. Hentikan aplikasi, worker backup, serta penulis lain ke database/upload tujuan.
2. Verifikasi backup dan buat backup tambahan dari target jika diperlukan.
3. Tetapkan koneksi `DB_*` dan `UPLOAD_DIR` tujuan, lalu jalankan dengan nama database tujuan sebagai konfirmasi eksplisit.

```sh
APP_STOPPED_FOR_RESTORE=1 DB_NAME=sele_sele_recovery \
  UPLOAD_DIR=/srv/sele-sele-recovery/uploads \
  bun run backup:restore -- /absolute/path/backup-directory sele_sele_recovery
```

CLI memeriksa SHA-256, gzip, tipe file, serta path arsip sebelum menjalankan SQL. File lampiran lama disalin ke `uploads-before-restore-*` dalam `BACKUP_DIR`, lalu diganti dengan hasil restore. Salinan ini tidak dihapus retensi otomatis. Pastikan ruang disk cukup. Jika berjalan sebagai root untuk aplikasi dengan user lain, set **keduanya** `RESTORE_UID` dan `RESTORE_GID` sesuai user aplikasi; file hasil restore berizin 600.

Pada Docker, service backup memasang upload read-only. Gunakan override sementara untuk restore yang memberikan volume upload writable dan capability `CHOWN` serta `DAC_OVERRIDE`. Jangan mengubah service backup harian menjadi writable. Contoh override pada direktori project:

```yaml
# compose.restore.yaml
services:
  backup:
    volumes:
      - uploads:/uploads
      - ./backups:/backups
    cap_add: [DAC_READ_SEARCH, DAC_OVERRIDE, CHOWN]
```

Default image menggunakan `RESTORE_UID=1000` dan `RESTORE_GID=1000` (user Bun); sesuaikan jika image aplikasi memakai user berbeda. Verifikasi dan jalankan restore dari direktori project:

```sh
docker compose --env-file .env.docker stop app backup proxy
docker compose --env-file .env.docker -f compose.yaml -f compose.restore.yaml \
  run --rm --no-deps -e APP_STOPPED_FOR_RESTORE=1 backup \
  restore /backups/backup-directory sele_sele
```

Ganti `sele_sele` dengan `DB_NAME` sebenarnya dan `backup-directory` dengan direktori backup yang dipilih. Container menggunakan konfigurasi database dari `.env.docker`. Untuk uji terisolasi, sediakan database recovery dahulu, override `DB_NAME`, dan gunakan volume upload recovery tersendiri; jangan memasang volume upload aplikasi kerja. Kembalikan stack setelah verifikasi berhasil menggunakan konfigurasi normal tanpa override restore.

Setelah restore, jalankan migrasi sesuai versi aplikasi, periksa dokumen, akses restricted, komentar, file gambar, dan login. Backup memulihkan antrean email juga; **nonaktifkan `MAIL_ENABLED` saat uji recovery** supaya notifikasi lama tidak dikirim ke pengguna. Cadangan `.env`, konfigurasi proxy, kredensial Microsoft/AI/SMTP, dan sertifikat tidak tercakup oleh backup ini.

## Pengujian otomatis

```sh
BACKUP_MYSQL_CONTAINER=mysql BACKUP_MYSQL_HOST=127.0.0.1 bun run test:backup
```

Pengujian membuat database sementara, menjalankan seluruh migrasi, menyimpan data Unicode/biner dan lampiran, lalu memulihkannya ke database tujuan sementara yang berbeda dari sumber. Pengujian juga menolak konfirmasi target salah dan backup rusak. Database kerja tidak digunakan sebagai target restore.
