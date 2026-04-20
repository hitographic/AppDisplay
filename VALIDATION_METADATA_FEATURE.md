# Validation Metadata Feature (v6.1)

## Deskripsi Fitur
Menambahkan informasi metadata validation di bagian bawah validation section dalam preview popup, meliputi:
- **Tanggal Update**: Waktu kapan validasi terakhir dilakukan
- **Diupdate oleh**: Email user yang melakukan validasi
- **Elemen yang Divalidasi**: Checklist foto-foto yang ada (Bumbu, Karton Depan, Karton Belakang, Etiket, Etiket Banded)

## Perubahan File

### 1. **records.html** (v6.1)
**Ditambahkan:**
- Section `previewValidationMetadata` dengan:
  - `.metadata-info`: Container untuk tanggal update dan diupdate oleh
  - `.metadata-row`: Baris individual untuk setiap metadata
  - `.changes-section`: Container untuk daftar elemen yang divalidasi
  - `#previewValidationChanges`: Container untuk list checklist

**HTML Structure:**
```html
<!-- Validation Metadata Section -->
<div id="previewValidationMetadata" class="validation-metadata hidden">
    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e5e5;">
    
    <div class="metadata-info">
        <div class="metadata-row">
            <span class="metadata-label"><i class="fas fa-calendar-alt"></i> Tanggal Update:</span>
            <span id="previewValidationDate" class="metadata-value">-</span>
        </div>
        <div class="metadata-row">
            <span class="metadata-label"><i class="fas fa-user-circle"></i> Diupdate oleh:</span>
            <span id="previewValidatedBy" class="metadata-value">-</span>
        </div>
    </div>
    
    <div class="changes-section">
        <h4 style="margin: 15px 0 10px 0; color: #333;"><i class="fas fa-list-check"></i> Elemen yang Divalidasi:</h4>
        <div id="previewValidationChanges" class="changes-list">
            <!-- Checklist will be rendered here -->
        </div>
    </div>
</div>
```

### 2. **css/style.css** (v6.1)
**Ditambahkan ~100+ baris CSS:**

- `.validation-metadata`: Container metadata dengan margin dan padding
- `.metadata-info`: Styling untuk info container dengan background abu-abu
- `.metadata-row`: Flexbox layout untuk setiap baris metadata
- `.metadata-label`: Styling untuk label dengan icon
- `.metadata-value`: Styling untuk value metadata
- `.changes-section`: Container untuk changes list
- `.changes-list`: Flex layout untuk list items
- `.change-item`: Individual item dalam checklist dengan styling untuk checked/unchecked state
- `.change-item i`: Icon styling untuk check circle atau circle kosong
- `.change-item-text`: Text styling untuk label elemen

**Responsive Design:**
- Mobile layout (max-width: 768px): Metadata rows stack vertically

### 3. **js/records.js** (v6.1)
**Fungsi baru ditambahkan:**

#### `showValidationMetadata()`
- Menampilkan metadata section saat ada validation data
- Format tanggal ke format Indonesia (contoh: "20 April 2026, 14:30")
- Set nilai tanggal dan email ke DOM
- Call `renderValidationChanges()` untuk render checklist

#### `renderValidationChanges()`
- Render checklist elemen yang divalidasi
- Check setiap photo field apakah ada atau tidak
- Display dengan icon check circle (✓) atau circle kosong (○)
- Mapping photo fields:
  - `photo_bumbu` → "Bumbu"
  - `photo_kartonDepan` → "Karton Depan"
  - `photo_kartonBelakang` → "Karton Belakang"
  - `photo_etiket` → "Etiket"
  - `photo_etiketbanded` → "Etiket Banded"

**Modified Functions:**

#### `renderValidationInPreview()`
- Sekarang call `showValidationMetadata()` saat record sudah memiliki validation data
- Hide metadata section jika belum ada validation

#### `submitValidationFromPreview()`
- Tambah logic untuk collect validated elements berdasarkan photos yang ada
- Save `updatedFields` array ke storage untuk track elemen yang divalidasi
- Format: `["Bumbu", "Karton Depan", "Karton Belakang", "Etiket", "Etiket Banded"]`
- Update `currentPreviewRecord.updatedFields` setelah submit

## Alur Kerja

### Saat Membuka Preview Record:
1. `openPreview()` membuka preview popup
2. `renderValidationInPreview()` dipanggil
3. Jika record sudah pernah divalidasi:
   - `showValidationMetadata()` dipanggil
   - Metadata section ditampilkan dengan:
     - Tanggal update (format: "20 April 2026, 14:30")
     - Email yang melakukan validasi
     - Checklist elemen yang ada

### Saat Submit Validasi Baru:
1. User pilih Valid/Invalid
2. Jika Invalid, user isi keterangan
3. User click "Simpan Validasi"
4. `submitValidationFromPreview()` dikerjakan:
   - Collect elements yang ada (yang punya photos)
   - Create `validationData` dengan `updatedFields` array
   - Send ke Google Sheets via `storage.updateRecord()`
   - Update local `currentPreviewRecord` dan `allRecords`
   - Show success toast

## Data Structure

### Validation Object di Google Sheets (Column T-X):
```javascript
{
  id: "1",
  validationStatus: "valid",           // Column T (19)
  validatedBy: "user@example.com",     // Column U (20)
  validatedAt: "2026-04-20T14:30:00Z", // Column V (21)
  validationReason: "Data ok",         // Column W (22)
  updatedFields: ["Bumbu", "Karton Depan", "Karton Belakang", "Etiket", "Etiket Banded"]  // Column X (23)
}
```

## Fitur Tambahan
- **Auto-detect elements**: Sistem otomatis detect elemen mana yang divalidasi berdasarkan ada/tidaknya photo
- **Date formatting**: Tanggal ditampilkan dalam format lokal Indonesia (hari, bulan, tahun, jam:menit)
- **Visual feedback**: Icon check circle (hijau) untuk elemen yang ada, circle kosong (abu-abu) untuk yang tidak

## Testing Checklist
- [ ] Buka record yang sudah divalidasi → metadata section tampil dengan data benar
- [ ] Tanggal ditampilkan dalam format Indonesia
- [ ] Email validator ditampilkan dengan benar
- [ ] Checklist menampilkan elemen yang ada dengan icon check circle
- [ ] Elemen yang tidak ada ditampilkan dengan icon circle kosong
- [ ] Submit validasi baru → metadata section langsung tampil setelah close popup
- [ ] Refresh page → metadata masih tampil dengan data dari Google Sheets
- [ ] Mobile view → metadata layout responsive dengan rows yang stack vertical

## Version Info
- Version: 6.1
- Release Date: 2026-04-20
- Status: Production Ready
