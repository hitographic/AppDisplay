# 🔧 VALID DISPLAY - Debugging Guide

## Masalah: Data Tidak Muncul Setelah Login

Jika setelah login data records tidak muncul (halaman kosong), ikuti langkah-langkah berikut:

---

## ✅ LANGKAH 1: Buka Browser Developer Console

1. Buka halaman VALID DISPLAY
2. Tekan `F12` atau klik kanan → Inspect → pilih tab **Console**
3. Anda akan melihat berbagai log messages

---

## 🔍 LANGKAH 2: Cek Status Sistem

Jalankan perintah ini di console:

```javascript
debugSystemStatus()
```

Output yang benar akan menunjukkan:
- ✅ User logged in: true
- ✅ Number of records: > 0 (atau 0 jika belum ada data)
- ✅ Web App configured: true
- ✅ SheetsDB configured: true
- ✅ Online status: true

**Jika ada yang false/error, catat untuk langkah berikutnya.**

---

## 📡 LANGKAH 3: Test Google Sheets Connection

Jalankan:

```javascript
testGoogleSheetsConnection()
```

Output harus menunjukkan:
```
Test 1: Checking if server responds... 
Test URL: https://script.google.com/macros/s/AKfycbxskbRPzUvJVqEr3TQoLcNvxknfAVlt-JIfcoeYZ-N8OsWegajeUgCxoytuD5yNd_Pdyw/exec?action=getAll&callback=testCallback
Raw response: callback(...)
Test 2: JSONP request...
✅ JSONP Success: {success: true, records: [...]}
```

---

## 🐛 Troubleshooting Berdasarkan Error

### ❌ "Unknown action:" Error

**Penyebab:** Parameter `action` tidak terkirim ke Google Apps Script

**Solusi:**
1. Periksa URL di console (LANGKAH 3)
2. Pastikan URL berisi `?action=getAll`
3. Jika URL benar tapi masih error, kemungkinan masalah di Google Apps Script:
   - Deploy ulang Google Apps Script
   - Pastikan sudah copy-paste SEMUA kode dari `GOOGLE_APPS_SCRIPT_CODE.js`

### ❌ "JSONP request timeout"

**Penyebab:** Server tidak respond dalam 8-10 detik

**Solusi:**
1. Cek koneksi internet
2. Coba akses langsung di browser: copy-paste URL dari console test
3. Jika URL menunjukkan error di browser, kemungkinan:
   - Google Apps Script belum di-deploy
   - Deployment sudah expire
   - Deploy ulang dari Google Apps Script

### ❌ "Google Sheets not configured"

**Penyebab:** `GOOGLE_SHEETS_WEBAPP_URL` tidak set di `config.js`

**Solusi:**
```javascript
// Cek di console
console.log('Web App URL:', CONFIG.GOOGLE_SHEETS_WEBAPP_URL)
```

Harus menunjukkan URL, bukan `YOUR_WEBAPP_URL`

---

## 📦 LANGKAH 4: Cek Data yang Tersimpan

Jika Google Sheets tidak connect, app akan gunakan `localStorage`:

```javascript
// Cek records di localStorage
const records = JSON.parse(localStorage.getItem('validDisplay_records'))
console.table(records)
```

Jika kosong, tambah test data:

```javascript
const testRecords = [
  {
    id: 'test-001',
    flavor: 'Bumbu Nasi Goreng',
    negara: 'Indonesia',
    tanggal: new Date().toISOString().split('T')[0],
    createdBy: 'Admin User',
    createdAt: new Date().toISOString(),
    validationStatus: 'valid'
  }
];
localStorage.setItem('validDisplay_records', JSON.stringify(testRecords));
location.reload();
```

Data harus muncul di halaman sekarang.

---

## 🔑 LANGKAH 5: Cek User Login

Pastikan user berhasil login:

```javascript
// Cek user data
const user = JSON.parse(localStorage.getItem('validDisplay_user'))
console.log('User:', user)

// Harus menunjukkan: {nik: "...", name: "...", role: "...", permissions: [...]}
```

---

## 📝 Log Messages Penting

Perhatikan console log untuk informasi:

| Log | Arti |
|-----|------|
| `✅ Google Sheets database connected` | Google Sheets berhasil terhubung |
| `ℹ️ Using local storage` | Menggunakan localStorage fallback |
| `📡 Fetching records from Google Sheets...` | Sedang fetch data |
| `✅ Data fetched from Google Sheets: [...]` | Data berhasil diambil |
| `⚠️ Falling back to local storage` | Google Sheets gagal, pakai localStorage |
| `🎨 renderRecords: Rendering N records` | Sedang render N records |

---

## 🆘 Jika Masih Tidak Berhasil

Kumpulkan informasi ini dan hubungi developer:

```javascript
// Copy-paste di console dan share hasilnya
console.group('System Info')
debugSystemStatus()
console.log('\n\n')
console.log('Current URL:', window.location.href)
console.log('User Agent:', navigator.userAgent)
console.log('All console logs above ↑')
console.groupEnd()
```

---

## ✨ Quick Summary

| Yang Harus Diperhatikan | Solusi |
|---|---|
| Syntax Error di records.js | ✅ SUDAH DIPERBAIKI (hapus diagram ASCII) |
| Timeout 30 detik → 8 detik | ✅ SUDAH DIPERBAIKI |
| Service Worker cache error | ✅ SUDAH DIPERBAIKI |
| Parameter tidak terkirim | ✅ DITAMBAH LOGGING untuk debug |
| debugSystemStatus undefined | ✅ SUDAH DITAMBAHKAN |

---

**Last Updated:** January 7, 2026
**Version:** 1.0.1
