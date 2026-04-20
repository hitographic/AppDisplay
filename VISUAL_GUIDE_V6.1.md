# Visual Guide - Validation Metadata Feature (v6.1)

## 📸 UI Layout

### Desktop View (Before & After)

#### BEFORE v6.0
```
┌─────────────────────────────────────────────────────────────┐
│ Display Records > KAD-SAF 8x5                              │
├─────────────────────────────────────────────────────────────┤
│  [Photo Tabs: Bumbu | Karton Depan | Karton Belakang | ... │
│                                                              │
│  [Large Product Photo Area]                                 │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Negara: SOUTH AFRICA    Distributor: ADVANCE WAREHOUSE    │
│  Tanggal: 13 Apr 2026                                       │
│                                                              │
│  Kode Produksi: Tidak ada kode produksi                    │
│                                                              │
│  ✓ Validasi Data                                            │
│  ○ Valid           Data sudah sesuai                        │
│  ○ Invalid         Ada ketidaksesuaian                      │
│                                                              │
│  [Simpan Validasi]                                          │
│                                                              │
│  [X]                                                         │
└─────────────────────────────────────────────────────────────┘
```

#### AFTER v6.1
```
┌─────────────────────────────────────────────────────────────┐
│ Display Records > KAD-SAF 8x5                              │
├─────────────────────────────────────────────────────────────┤
│  [Photo Tabs: Bumbu | Karton Depan | Karton Belakang | ... │
│                                                              │
│  [Large Product Photo Area]                                 │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Negara: SOUTH AFRICA    Distributor: ADVANCE WAREHOUSE    │
│  Tanggal: 13 Apr 2026                                       │
│                                                              │
│  Kode Produksi: Tidak ada kode produksi                    │
│                                                              │
│  ✓ Validasi Data                                            │
│  ○ Valid           Data sudah sesuai                        │
│  ○ Invalid         Ada ketidaksesuaian                      │
│                                                              │
│  [Simpan Validasi]                                          │
│                                                              │
│  ────────────────────────────────────────────────────────   │
│                                                              │
│  📅 Tanggal Update:  20 April 2026, 14:30                   │
│  👤 Diupdate oleh:   user@example.com                       │
│                                                              │
│  ✓ Elemen yang Divalidasi:                                  │
│  ✓ Bumbu                                                     │
│  ✓ Karton Depan                                             │
│  ✓ Karton Belakang                                          │
│  ✓ Etiket                                                    │
│  ○ Etiket Banded                                            │
│                                                              │
│  [X]                                                         │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 Color Scheme

### Metadata Section Background
- Main: `#f5f5f5` (Light Gray)
- Border Left: `var(--primary-color)` which is `#e31e24` (Red)
- Changes Section Background: `#f9f9f9` (Very Light Gray)

### Icons & Checkmarks
- Icon Color (Checked): `#4caf50` (Green) - Green check circle ✓
- Icon Color (Unchecked): `#ccc` (Gray) - Gray circle ○
- Label Icons: `var(--primary-color)` (#e31e24 Red)

### Text Colors
- Labels: `#666` (Dark Gray)
- Values: `#333` (Very Dark Gray / Black)

## 📱 Responsive Behavior

### Desktop (> 768px)
```
┌──────────────────────────────────────┐
│ 📅 Tanggal Update:  20 April 2026    │  ← Labels and values side-by-side
│ 👤 Diupdate oleh:   user@example.com │
└──────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────────────────────────────┐
│ 📅 Tanggal Update:                   │
│ 20 April 2026, 14:30                 │  ← Labels stack vertically
│                                      │
│ 👤 Diupdate oleh:                    │
│ user@example.com                     │
└──────────────────────────────────────┘
```

## 🔄 State Transitions

### State 1: No Validation Yet
```
                           Record Loaded
                                ↓
                    renderValidationInPreview()
                                ↓
                    validationStatus === null?
                                ↓
                          YES (No validation)
                                ↓
                      Metadata Section HIDDEN
                           (display: none)
```

### State 2: Has Validation
```
                           Record Loaded
                                ↓
                    renderValidationInPreview()
                                ↓
                    validationStatus === valid/invalid?
                                ↓
                          YES (Has validation)
                                ↓
                    showValidationMetadata()
                                ↓
                    Format date to id-ID locale
                    Set email and date to DOM
                    renderValidationChanges()
                                ↓
                     Metadata Section VISIBLE
```

### State 3: Submit New Validation
```
                   User Click Submit Button
                                ↓
                  Collect validated elements
                                ↓
                  Create validationData object
                  {validationStatus, validatedBy,
                   validatedAt, validationReason,
                   updatedFields: ["Bumbu", ...]}
                                ↓
                  storage.updateRecord()
                                ↓
              Update currentPreviewRecord
              Update allRecords array
                                ↓
                   Show Success Toast
                   "✅ Record berhasil di-validasi"
                                ↓
                   Close popup (after 1 sec)
                                ↓
              Next time preview opened:
              Metadata section will show
```

## 🔤 Typography

### Date Format
- Format: `"day MMMM yyyy, HH:mm"`
- Locale: `id-ID` (Indonesia)
- Example: `"20 April 2026, 14:30"`
- **NOT** `"4/20/2026 2:30 PM"` or `"20/04/2026 14:30"`

### Font Sizes
- Metadata Labels: `0.9rem` (smaller than body)
- Metadata Values: `0.9rem` (same as labels)
- Change Items: `0.9rem` (small)

### Font Weights
- Labels: `font-weight: 500` (medium)
- Values: `font-weight: 600` (semibold)
- Headers: Normal + Icon

## 🎯 Element Mapping

### Photo Fields → Display Labels
| Photo Key | Display Label | Icon |
|-----------|---------------|------|
| `photo_bumbu` | Bumbu | 📦 |
| `photo_kartonDepan` | Karton Depan | 📦 |
| `photo_kartonBelakang` | Karton Belakang | 📦 |
| `photo_etiket` | Etiket | 🏷️ |
| `photo_etiketbanded` | Etiket Banded | 🏷️ |

## 🔍 Detection Logic

### When photo is considered "present":
```javascript
hasPhoto = (photos[key] && photos[key].trim() !== '')
           ↓
           true if:
           - photos[key] exists
           - AND is not null/undefined
           - AND after trim() is not empty string
```

### When photo is considered "absent":
```javascript
hasPhoto = false if:
           - photos[key] is missing
           - OR is null/undefined
           - OR is empty string after trim()
```

## 💾 Data Flow

### On Save (submitValidationFromPreview):
```
1. Loop through photos
2. For each photo, check if it exists and has content
3. If yes, add label name to validatedElements array
4. Create validation data with:
   {
     id, validationStatus, validatedBy, validatedAt,
     validationReason, updatedFields: validatedElements
   }
5. Call storage.updateRecord() to save to Google Sheets
6. Column X receives: ["Bumbu", "Karton Depan", ...]
```

### On Display (showValidationMetadata):
```
1. Get record from currentPreviewRecord
2. Check if validatedAt and validatedBy exist
3. If missing, hide metadata section
4. If exists:
   - Format validatedAt to Indonesia date
   - Display validatedBy email
   - Call renderValidationChanges()
   - Show metadata section (remove hidden class)
```

### On Render Changes (renderValidationChanges):
```
1. Get photos object from record
2. For each element in validation elements list:
   - Check if photos[key] exists and not empty
   - If yes: create item with checked class + green icon
   - If no: create item with unchecked class + gray icon
3. Append all items to previewValidationChanges div
```

## 📊 Example Data

### Google Sheets Row
```
Column T (19): validationStatus = "valid"
Column U (20): validatedBy = "validator@indofood.co.id"
Column V (21): validatedAt = "2026-04-20T14:30:00Z"
Column W (22): validationReason = ""
Column X (23): updatedFields = '["Bumbu","Karton Depan","Karton Belakang","Etiket"]'
```

### JavaScript Object
```javascript
{
  id: "ABC123",
  validationStatus: "valid",
  validatedBy: "validator@indofood.co.id",
  validatedAt: "2026-04-20T14:30:00Z",
  validationReason: "",
  updatedFields: ["Bumbu", "Karton Depan", "Karton Belakang", "Etiket"]
}
```

### DOM Output
```html
<div id="previewValidationMetadata" class="validation-metadata">
  <div class="metadata-info">
    <div class="metadata-row">
      <span class="metadata-label">
        <i class="fas fa-calendar-alt"></i> Tanggal Update:
      </span>
      <span id="previewValidationDate" class="metadata-value">
        20 April 2026, 14:30
      </span>
    </div>
    <div class="metadata-row">
      <span class="metadata-label">
        <i class="fas fa-user-circle"></i> Diupdate oleh:
      </span>
      <span id="previewValidatedBy" class="metadata-value">
        validator@indofood.co.id
      </span>
    </div>
  </div>
  
  <div class="changes-section">
    <h4><i class="fas fa-list-check"></i> Elemen yang Divalidasi:</h4>
    <div id="previewValidationChanges" class="changes-list">
      <div class="change-item checked">
        <i class="fas fa-check-circle"></i>
        <span class="change-item-text">Bumbu</span>
      </div>
      <div class="change-item checked">
        <i class="fas fa-check-circle"></i>
        <span class="change-item-text">Karton Depan</span>
      </div>
      <div class="change-item checked">
        <i class="fas fa-check-circle"></i>
        <span class="change-item-text">Karton Belakang</span>
      </div>
      <div class="change-item checked">
        <i class="fas fa-check-circle"></i>
        <span class="change-item-text">Etiket</span>
      </div>
      <div class="change-item unchecked">
        <i class="fas fa-circle"></i>
        <span class="change-item-text">Etiket Banded</span>
      </div>
    </div>
  </div>
</div>
```

## 🎪 Animation & Interaction

### Show/Hide Metadata
- Mechanism: CSS class `.hidden` with `display: none`
- No animation/transition (instant)
- Reason: Metadata is already below the fold, user doesn't see instant appear

### Icon Animation
- No hover effects on icons
- No transitions on color changes
- Static display, clean and professional look

### Responsive Transition
- From desktop to mobile at 768px breakpoint
- Smooth CSS media query change
- No JavaScript animation involved

## ✨ Polish Details

- Metadata section has top margin (15px) for spacing
- Border-left on metadata-info (4px red) matches branding
- Icons in labels use primary color for consistency
- Change items have consistent padding (10px)
- Border radius on all containers (4-6px) for modern look
- Proper text alignment (right-aligned values on desktop)
- Good contrast for readability (white bg on gray/light backgrounds)

---

**This guide provides visual reference for the UI implementation and data flow of the Validation Metadata Feature v6.1**
