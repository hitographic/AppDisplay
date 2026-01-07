# Valid Display

Aplikasi Web untuk manajemen Display Produk dengan penyimpanan di Google Drive.

## Fitur

1. **Login** - Autentikasi dengan NIK dan Password
2. **Display Records** - Melihat semua data display dengan card list
3. **Advanced Search** - Filter berdasarkan negara dan flavor
4. **Tambah Data** - Menambah record display baru
5. **Create Display** - Upload foto dan input kode produksi
6. **Google Drive Integration** - Penyimpanan foto di Google Drive (GRATIS)

## Setup Google Drive API (GRATIS)

### Langkah 1: Buat Google Cloud Project
1. Buka https://console.cloud.google.com/
2. Login dengan akun Google Anda
3. Klik "Select a project" > "New Project"
4. Nama project: `AppDisplay` > Create

### Langkah 2: Enable Google Drive API
1. Di menu sebelah kiri, pilih "APIs & Services" > "Library"
2. Cari "Google Drive API"
3. Klik "Enable"

### Langkah 3: Buat API Key
1. Pergi ke "APIs & Services" > "Credentials"
2. Klik "Create Credentials" > "API Key"
3. Copy API Key tersebut

### Langkah 4: Buat OAuth 2.0 Client ID
1. Klik "Create Credentials" > "OAuth client ID"
2. Jika diminta configure consent screen:
   - User Type: External > Create
   - App name: `AppDisplay`
   - User support email: (email Anda)
   - Developer contact: (email Anda)
   - Save and Continue (skip semua optional)
   - Add test user: (email Anda)
3. Kembali ke Credentials > Create OAuth client ID
4. Application type: "Web application"
5. Name: `AppDisplay Web`
6. Authorized JavaScript origins:
   - `https://hitographic.github.io`
   - `http://localhost:5500`
7. Authorized redirect URIs:
   - `https://hitographic.github.io/AppDisplay/`
8. Create dan copy Client ID

### Langkah 5: Buat Folder di Google Drive
1. Buka Google Drive
2. Buat folder baru: `AppDisplay_Data`
3. Klik kanan folder > Share > Anyone with link > Viewer
4. Copy folder ID dari URL (bagian setelah `/folders/`)

### Langkah 6: Update Config
Edit file `js/config.js`:

```javascript
const CONFIG = {
    GOOGLE_CLIENT_ID: 'PASTE_YOUR_CLIENT_ID_HERE',
    GOOGLE_API_KEY: 'PASTE_YOUR_API_KEY_HERE',
    GOOGLE_FOLDER_ID: 'PASTE_YOUR_FOLDER_ID_HERE',
    // ...
};
```

## Kredensial Login Default

| NIK | Password |
|-----|----------|
| 50086913 | Ind0f00d25 |
| 12345678 | password123 |

## Struktur Folder

```
VALID-DISPLAY/
├── index.html          # Halaman Login
├── records.html        # Halaman Display Records
├── create-display.html # Halaman Create Display
├── css/
│   └── style.css       # Stylesheet
├── js/
│   ├── config.js       # Konfigurasi
│   ├── auth.js         # Autentikasi
│   ├── storage.js      # Penyimpanan (Local + Google Drive)
│   ├── login.js        # Login page script
│   ├── records.js      # Records page script
│   └── create-display.js # Create display script
├── assets/
│   └── logo.png        # Logo (opsional)
└── README.md           # Dokumentasi
```

## Deploy ke GitHub Pages

1. Push semua file ke repository GitHub
2. Buka Settings > Pages
3. Source: Deploy from a branch
4. Branch: main / (root)
5. Save

Aplikasi akan tersedia di: `https://hitographic.github.io/AppDisplay/`

## Cara Penggunaan

1. **Login**: Masukkan NIK dan Password
2. **Display Records**: Lihat semua data, gunakan Advanced Search untuk filter
3. **Tambah Data**: Klik tombol "Tambah Data", isi form popup
4. **Create Display**: Upload foto untuk setiap kategori, isi kode produksi
5. **Simpan Sementara**: Menyimpan progress tanpa meninggalkan halaman
6. **Simpan Semua**: Menyimpan dan kembali ke Display Records

## Teknologi

- HTML5 / CSS3 / JavaScript (Vanilla)
- Google Drive API v3
- Google Identity Services
- Font Awesome Icons
- LocalStorage untuk offline support


