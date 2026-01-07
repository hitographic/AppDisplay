# 🚀 QUICK START - Masalah Data Tidak Muncul

## Langkah Cepat (2 menit)

### 1️⃣ Reload Page
```
Ctrl+Shift+R (Windows/Linux) atau Cmd+Shift+R (Mac)
```

### 2️⃣ Login
- NIK: `50086913`
- Password: `Ind0f00d25`

### 3️⃣ Buka Console
```
F12 → pilih tab "Console"
```

### 4️⃣ Copy-Paste Salah Satu:

**Option A: Lihat Status Sistem**
```javascript
debugSystemStatus()
```

**Option B: Test Google Sheets**
```javascript
testGoogleSheetsConnection()
```

**Option C: Tambah Test Data** 
```javascript
addTestRecords()
```

---

## 🎯 Expected Hasil

### Jika Berhasil:
✅ Data akan muncul di halaman dalam bentuk cards  
✅ Console menunjukkan: `✅ Data fetched from Google Sheets`  
✅ Lihat N records ter-load  

### Jika Belum Berhasil (Offline/Error):
⚠️ Page menampilkan "Tidak ada data"  
⚠️ Console menunjukkan: `⚠️ Falling back to local storage`  
→ **Jalankan:** `addTestRecords()` untuk test dengan dummy data

---

## 🔧 Advanced Debugging

### Cek Records di localStorage:
```javascript
JSON.parse(localStorage.getItem('validDisplay_records'))
```

### Cek User Data:
```javascript
JSON.parse(localStorage.getItem('validDisplay_user'))
```

### Export Data:
```javascript
exportRecords()
```
Akan download file JSON ke komputer

### Clear Semua (⚠️ HATI-HATI):
```javascript
clearAllData()
```

---

## 📋 File Yang Sudah Diupdate

✅ `js/records.js` - Fix syntax error  
✅ `js/sheets-db.js` - Better timeout & logging  
✅ `js/storage.js` - Better error handling  
✅ `js/auth.js` - Tambah debug functions  
✅ `sw.js` - Fix cache error  
✅ `js/test-data.js` - NEW: Test data functions  
✅ `records.html` - Link test-data.js  

---

## 📞 Hubungi Developer Jika:

❌ Console menunjukkan red error  
❌ `debugSystemStatus()` menunjukkan false semua  
❌ `testGoogleSheetsConnection()` gagal  
❌ Data tetap tidak muncul setelah `addTestRecords()`  

---

**Versi:** 1.0.1  
**Update:** 7 January 2026
