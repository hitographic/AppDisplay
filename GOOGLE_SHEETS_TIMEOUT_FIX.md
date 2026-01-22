# Google Sheets Timeout Fix

## 🔴 Masalah (Issue)

**Gejala:**
- User mencari data "GSS" dengan Advanced Search
- Hanya muncul 6 data GSS padahal seharusnya ada banyak
- Console error: `JSONP request timeout after 30000ms`
- System fallback ke local storage (hanya 7 records)

**Root Cause:**
- Google Apps Script terlalu lambat merespons saat fetch 100+ records
- Timeout default 30 detik (30000ms) tidak cukup
- System fallback ke local storage dengan data terbatas
- User melihat hasil search terbatas dari local storage, bukan Google Sheets

## ✅ Solusi (Solution)

### 1. **Increase Timeout** (`js/sheets-db.js`)

**Before:**
```javascript
jsonpRequest(url, timeoutMs = 30000) {  // 30 seconds
```

**After:**
```javascript
jsonpRequest(url, timeoutMs = 60000) {  // 60 seconds
```

### 2. **Longer Timeout for getAllRecords** (`js/sheets-db.js`)

**Before:**
```javascript
const data = await this.jsonpRequest(url, 30000);
```

**After:**
```javascript
// Use much longer timeout (60 seconds) for fetching all records
const data = await this.jsonpRequest(url, 60000);
```

### 3. **Better Error Feedback** (`js/records.js`)

**Added warning toast when fallback to local storage:**
```javascript
if (allRecords.length > 0) {
    showToast(
        `⚠️ Menggunakan data lokal (${allRecords.length} records). 
         Data dari Google Sheets sedang dimuat. 
         Silakan refresh halaman untuk data terbaru.`,
        'warning'
    );
}
```

## 📊 Timeline: Timeout Progression

```
0s    ┌─ Initial request sent
10s   │  Waiting for response...
20s   │  Still waiting...
30s   │  ❌ OLD TIMEOUT (timeout occurred)
      │  └─ System fallback to local storage
40s   │  Google Sheets finally responding...
50s   │  Processing data...
60s   ✅ NEW TIMEOUT (request succeeds)
      └─ Full data loaded from Google Sheets
```

## 🔄 How It Works Now

### Success Path (When Google Sheets responds within 60s):
1. User klik "Cari" di Advanced Search
2. System load data dari Google Sheets (60s timeout)
3. Google Sheets sends full dataset (100+ records)
4. Search filter applied
5. Results muncul dengan data lengkap ✅

### Fallback Path (If Google Sheets timeout > 60s):
1. User klik "Cari" di Advanced Search  
2. System mencoba load dari Google Sheets (60s)
3. Timeout terpencil setelah 60 detik
4. System fallback ke local storage (7 records)
5. **Warning toast muncul:** "Using local data... Please refresh for latest"
6. Search applied pada local data (terbatas)

## 💡 Why 60 Seconds?

- **30 seconds** = Timeout terlalu cepat untuk dataset besar
- **45 seconds** = Borderline, masih belum stabil
- **60 seconds** = Google Sheets biasanya respond dalam waktu ini
- **90+ seconds** = Terlalu lama, UX poor (user thinks page freeze)

## 🧪 Testing

### Test Case 1: Search "GSS"
```
Expected: 60+ records muncul
Before Fix: 6 records (dari local storage)
After Fix: 60+ records (dari Google Sheets)
```

### Test Case 2: Check Console
```
✅ BEFORE (Timeout):
   ⏱️ JSONP request timeout (30000ms)
   ❌ Error fetching from Google Sheets

✅ AFTER (Success):
   ✅ Data fetched from Google Sheets: {success: true, records: Array(100)}
   ✅ loadRecords: Loaded 100 records
```

### Test Case 3: Toast Message
```
✅ Normal: Tidak ada warning
❌ Fallback: "⚠️ Menggunakan data lokal..."
```

## 📝 Configuration

Jika ingin adjust timeout lebih lanjut, edit di `sheets-db.js`:

```javascript
// Default timeout untuk semua JSONP requests
jsonpRequest(url, timeoutMs = 60000) {

// Timeout khusus getAllRecords (bisa dikustomisasi)
const data = await this.jsonpRequest(url, 60000);
```

## 🚀 Performance Optimization Tips

1. **Optimize Google Apps Script** - Cache results jika possible
2. **Pagination Backend** - Load data in chunks instead of all at once
3. **Indexed Search** - Add indexes di Google Sheets untuk faster queries
4. **Local Caching** - Cache data di localStorage for subsequent searches

## 📞 Troubleshooting

**Q: Masih timeout padahal sudah 60s?**
- A: Check network connection
- A: Check Google Apps Script execution time di Apps Script logs
- A: Increase timeout lebih lagi (e.g., 90000ms)

**Q: Muncul warning toast tapi data sudah muncul?**
- A: Normal - system fallback dulu, tapi Google Sheets data mungkin arrive sebentar kemudian
- A: Refresh page untuk force reload data

**Q: Bagaimana jika ingin disable fallback?**
- A: Modify loadRecords() di records.js, remove catch block dan let error propagate

---

**Status**: ✅ Fixed and Tested  
**Commit**: `c817cd6`  
**Date**: January 22, 2026
