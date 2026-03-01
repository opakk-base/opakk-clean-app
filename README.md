# Electron Cleaner

Aplikasi Electron untuk:

1. Scan folder cache/junk default sistem
2. Clean target junk langsung ke Trash
3. Cari file besar berdasarkan folder target
4. Filter ekstensi file (opsional)
5. Tampilkan statistik folder terbesar
6. Hapus file terpilih ke Trash

## Prioritas Platform

- **macOS (prioritas utama)**: target cache Safari/Chrome/Library Caches
- **Windows**: Temp/INetCache/Chrome Cache/VS Code Cache
- **Linux**: `/tmp`, `~/.cache`, Trash, VS Code cache

## Menjalankan

```bash
cd electron-cleaner
npm install
npm start
```

`npm start` sekarang akan compile TypeScript dulu (`build:ts`) lalu menjalankan Electron.

## Packaging / Build Installer

```bash
cd electron-cleaner
npm install
```

Build semua target (sesuai OS/dukungan environment):

```bash
npm run dist
```

Build spesifik:

```bash
npm run dist:mac   # universal (x64 + arm64)
npm run dist:win
npm run dist:linux
```

Output installer ada di folder `dist/`.

## Struktur Project (baru)

```text
my-project/
├─ src/
│  ├─ main/
│  │  └─ index.ts
│  ├─ preload/
│  │  └─ index.ts
│  ├─ renderer/
│  │  └─ index.ts
│  ├─ common/
│  ├─ shared/
│  └─ resources/
└─ static/
```

> Catatan: struktur TypeScript sudah disiapkan sebagai fondasi.
> Runtime saat ini masih memakai file JS lama sampai migrasi logic selesai.

## Catatan

- Penghapusan memakai `shell.trashItem()` (lebih aman dari delete permanen).
- Scan file besar bisa berat jika folder sangat besar.
- Scan default mengabaikan folder umum: `node_modules`, `.git`, `dist`, `build`.
- Cross-build kadang butuh environment OS yang sesuai (contoh: build `.dmg` paling aman dijalankan di macOS).
