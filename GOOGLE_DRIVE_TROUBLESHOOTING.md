# Google Drive Connection Troubleshooting Guide

## Masalah
Ketika membuka `create-display.html`, semua folder Google Drive tidak ditemukan:
- ❌ "Folder Bumbu not found"
- ❌ "Folder Minyak Bumbu not found"
- ❌ "Subfolder Kode Karton not found"
- ❌ "Folder Kode Etiket not found"
- ❌ "Folder Five or Six in One not found"
- ❌ "Folder Plakban not found"

---

## Solusi Yang Sudah Diterapkan (v2.10)

### 1. Graceful Error Handling
**File:** `js/create-display.js` (v2.10)
**Perubahan:**
- Mengganti `console.error()` dengan `console.warn()` ⚠️
- Menambah try-catch untuk setiap Google Drive API call
- Menambah fallback behavior jika folder tidak ditemukan
- User bisa input manual jika dropdown kosong

**Kode Improvements:**

```javascript
// OLD (v2.9): Hard fail on error
if (response.result.files && response.result.files.length > 0) {
    // success
} else {
    console.error(`Folder "${folderName}" not found`);
    return null;
}

// NEW (v2.10): Graceful fallback
if (response.result.files && response.result.files.length > 0) {
    // success
} else {
    console.warn(`⚠️ Folder "${folderName}" not found. Using raw photo names instead.`);
    return null;  // Graceful return, not hard error
}
```

**Hasil:**
- ✅ Aplikasi tidak crash jika folder tidak ditemukan
- ✅ Dropdown menampilkan "-- Tidak ada data --" bukan error
- ✅ User bisa continue work dengan input manual

---

## Penyebab Masalah (Kemungkinan)

### A. Google Drive Authorization Issue
**Kemungkinan Penyebab:**
1. User belum login dengan akun Google yang punya akses ke folder
2. Token Google Drive sudah expired
3. API scopes tidak include `drive.file` permission

**Cara Check:**
```javascript
// Buka Console browser (F12) pada create-display.html
// Lihat apakah ada message seperti:
❌ "User not authenticated"
❌ "Invalid token"
❌ "Insufficient permissions"
```

**Solusi:**
1. Refresh halaman
2. Login ulang dengan akun Google yang tepat
3. Pastikan accept permissions untuk "Google Drive access"

---

### B. Folder Structure Changed
**Kemungkinan Penyebab:**
1. Folder di Google Drive sudah dihapus atau diganti nama
2. Folder structure di Google Drive berbeda dari yang dikonfigurasi
3. Main folder ID di config sudah tidak valid

**Folder Yang Seharusnya Ada (di Google Drive):**

```
📁 [Main Folder ID: 1oVQJZfkorSrsSd49CPzRsmAybUHX7J23]
├── 📁 Bumbu/
├── 📁 Minyak Bumbu/
├── 📁 Kode SI/
├── 📁 Kode Karton/
│   ├── 📁 Depan/
│   └── 📁 Belakang/
├── 📁 Kode Etiket/
├── 📁 Five or Six in One/
└── 📁 Plakban/
```

**Cara Check:**
1. Login ke Google Drive: https://drive.google.com
2. Verify semua folder di atas ada
3. Verify main folder ID masih benar: `1oVQJZfkorSrsSd49CPzRsmAybUHX7J23`

---

### C. API Configuration Issue
**Kemungkinan Penyebab:**
1. Google API Key tidak valid
2. Google Client ID tidak valid
3. API scopes tidak configured dengan benar

**File to Check:**
- `js/config.js` - Verify semua credentials ada

**Solusi:**
```javascript
// Check config.js
CONFIG.GOOGLE_CLIENT_ID      // Harus ada, bukan "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
CONFIG.GOOGLE_API_KEY        // Harus ada, bukan "YOUR_GOOGLE_API_KEY"
CONFIG.GOOGLE_FOLDER_ID      // Harus '1oVQJZfkorSrsSd49CPzRsmAybUHX7J23'
```

---

## Debugging Steps

### Step 1: Open Browser Console
```
1. Buka create-display.html di browser
2. Press F12 to open Developer Tools
3. Pergi ke Console tab
```

### Step 2: Check Auth Messages
Lihat apakah ada message:
- ✅ "✅ Google Sheets database connected" → OK
- ❌ "ℹ️ Using local storage" → Google Sheets tidak connect (tapi aplikasi bisa tetap jalan)

### Step 3: Check Drive API Messages
Lihat apakah ada warning:
- ⚠️ "⚠️ Folder 'Bumbu' not found. Using raw photo names instead." → Folder tidak found
- ✅ "✅ Found folder 'Bumbu' with ID: xxx" → Folder found

### Step 4: Check Login Status
```javascript
// Klik button "Logout" lalu "Login"
// Verify Google login popup muncul
// Accept semua permissions
```

---

## Workaround (Temporary Fix)

Jika Google Drive tidak connect, user bisa:

### Option 1: Manual Photo Input
1. Dropdown akan kosong ("-- Tidak ada data --")
2. Typed directly dalam field: `photo_name` (e.g., "GSS-MF", "GSS-E-TP EM")
3. Sistem akan accept manual input

### Option 2: Fallback to Raw Names
Jika tahu nama foto, bisa input langsung tanpa browse Google Drive

---

## Recent Changes (v2.10)
**Commit:** `d166d19`
**Date:** Latest

### What Changed:
1. ✅ Improved `getFolderIdByName()` function
   - Added try-catch for each API call
   - Changed error messages dari `error` ke `warn`
   - Returns null gracefully

2. ✅ Improved `loadDropdown()` function
   - Handle null folder ID gracefully
   - Show "-- Tidak ada data --" instead of error
   - Allow user to continue

3. ✅ Updated version in `create-display.html`
   - Was: `create-display.js?v=2.9`
   - Now: `create-display.js?v=2.10`

### Testing:
- Open create-display.html
- Check browser console
- Should see warnings instead of errors
- Dropdowns should show "-- Tidak ada data --" jika folder kosong
- User should bisa continue work

---

## Long-term Solution Checklist

- [ ] Verify Google Drive folder structure is correct
- [ ] Verify user has access to all folders
- [ ] Test Google Drive login in incognito/private window
- [ ] Verify API credentials in Config
- [ ] Check Google API quota usage
- [ ] Monitor browser console untuk errors

---

## Files Modified
- `js/create-display.js` - v2.9 → v2.10
- `create-display.html` - Updated script version reference

## Testing
Run the following in browser console:
```javascript
// Check if Google Drive library loaded
console.log(typeof gapi !== 'undefined' ? '✅ gapi loaded' : '❌ gapi not loaded');

// Check if CONFIG loaded
console.log(typeof CONFIG !== 'undefined' ? '✅ CONFIG loaded' : '❌ CONFIG not loaded');

// Check folder map
console.log(PHOTO_FOLDER_MAP);
```

---

## Next Steps
1. User refresh create-display.html (Ctrl+Shift+R to force reload)
2. Check browser console for warnings/errors
3. If folders still not found:
   - Verify folder structure in Google Drive
   - Verify user login credentials
   - Check API configuration

---

**Last Updated:** v2.10
**Status:** ✅ Error handling improved, graceful fallback implemented
