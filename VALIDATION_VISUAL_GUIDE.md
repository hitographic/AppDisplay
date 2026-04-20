# 📊 Validation Feature - Visual Guide

## Flow Diagram

### User Journey - WITH Permission

```
┌─────────────────────────────────────────────────────────┐
│                     Display Records Page                │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Card List                                      │   │
│  │  ┌─────────────────────┐                       │   │
│  │  │ GSS-VIETNAM 40      │                       │   │
│  │  │ [👁️] [✏️] [🗑️] [ℹ️]│  ← NO MORE 🔄 BUTTON │   │
│  │  └─────────────────────┘                       │   │
│  │                                                 │   │
│  │  ┌─────────────────────┐                       │   │
│  │  │ K-USA 6x5           │                       │   │
│  │  │ [👁️] [✏️] [🗑️] [ℹ️]│                       │   │
│  │  └─────────────────────┘                       │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↓ click [👁️]
┌─────────────────────────────────────────────────────────┐
│              Preview Popup (Modal)                      │
│                                                         │
│  GSS-VIETNAM 40                           [X]           │
│  ┌─────────────────────────────────────────────┐       │
│  │ [Bumbu] [M. Bumbu] [SI] [Karton...] [etc]  │       │
│  │ ┌─────────────────────────────────────────┐ │       │
│  │ │                                           │ │       │
│  │ │  [Preview Image Display Area]            │ │       │
│  │ │                                           │ │       │
│  │ └─────────────────────────────────────────┘ │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  Negara: VIETNAM • Nomor Material: 12345               │
│  Tanggal: 11 Apr 2026                                  │
│  Kode Produksi: ABC123, XYZ789                         │
│                                                         │
│  ════════════════════════════════════════════          │ NEW!
│  ✅ Validasi Data                                      │
│  ════════════════════════════════════════════          │
│                                                         │
│  ┌─ Valid ───────────────────────────────┐            │
│  │ ✅ Valid                              │            │
│  │ Data sudah sesuai                     │            │
│  └───────────────────────────────────────┘            │
│                                                         │
│  ┌─ Invalid ─────────────────────────────┐            │
│  │ ❌ Invalid                            │            │
│  │ Ada ketidaksesuaian                   │            │
│  └───────────────────────────────────────┘            │
│                                                         │
│  (Show textarea only if Invalid selected)              │
│  ┌─────────────────────────────────────┐              │
│  │ Keterangan Invalid:                 │              │
│  │ [Textarea untuk penjelasan]         │              │
│  │                                     │              │
│  └─────────────────────────────────────┘              │
│                                                         │
│  [💾 Simpan Validasi]                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
                      ↓ click Simpan
                   (Data saved)
                   (Toast: ✅ Success)
                (Popup closes auto)
                      ↓
         Card list updates status ✅
```

---

### User Journey - WITHOUT Permission

```
┌─────────────────────────────────────────────────────────┐
│                     Display Records Page                │
│  (User TIDAK punya permission validasi)                 │
└─────────────────────────────────────────────────────────┘
                            ↓ click [👁️]
┌─────────────────────────────────────────────────────────┐
│              Preview Popup (Modal)                      │
│                                                         │
│  GSS-VIETNAM 40                           [X]           │
│  ┌─────────────────────────────────────────────┐       │
│  │ [Bumbu] [M. Bumbu] [SI] [Karton...] [etc]  │       │
│  │ ┌─────────────────────────────────────────┐ │       │
│  │ │                                           │ │       │
│  │ │  [Preview Image Display Area]            │ │       │
│  │ │                                           │ │       │
│  │ └─────────────────────────────────────────┘ │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  Negara: VIETNAM • Nomor Material: 12345               │
│  Tanggal: 11 Apr 2026                                  │
│  Kode Produksi: ABC123, XYZ789                         │
│                                                         │
│  ❌ Validation section HIDDEN                          │
│     (tidak terlihat karena user tidak                  │
│      punya permission)                                 │
│                                                         │
│  [X] Close popup                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### Preview Popup Structure

```
┌────────────────────────────────────────────────────┐
│  previewPopup (popup-overlay)                      │
│  └─ popup-content (popup-preview)                  │
│     ├─ popup-header                               │
│     │  ├─ h2#previewTitle                         │
│     │  └─ .btn-close                              │
│     ├─ .preview-tabs                              │
│     │  ├─ .tab-btn (Bumbu)                        │
│     │  ├─ .tab-btn (M. Bumbu)                     │
│     │  ├─ .tab-btn (SI)                           │
│     │  └─ ... (8 tabs total)                      │
│     ├─ #previewContent                            │
│     │  └─ [Tab content - images]                  │
│     ├─ .preview-info                              │
│     │  ├─ #previewRecordInfo                      │
│     │  └─ #previewKodeProduksi                    │
│     │                                              │
│     └─ #previewValidationSection ⭐ NEW          │
│        ├─ h3 (Validasi Data)                     │
│        ├─ .validation-options                    │
│        │  ├─ .valid-option (Valid)               │
│        │  └─ .invalid-option (Invalid)           │
│        ├─ #previewInvalidReasonContainer         │
│        │  └─ textarea#previewInvalidReason       │
│        └─ button.btn-submit-validation           │
└────────────────────────────────────────────────────┘
```

---

## Card List Button Configuration

### BEFORE (Old)
```
Card Actions:
  [👁️ View] [✏️ Edit] [🗑️ Delete] [ℹ️ Info] [🔄 Validate] ❌ REMOVED
```

### AFTER (New)
```
Card Actions:
  [👁️ View] [✏️ Edit] [🗑️ Delete] [ℹ️ Info]
  
  (If userCanEdit) → show Edit, Delete, Info
  (Always show) → View button
  (🔄 Validate) → COMPLETELY REMOVED
```

---

## Permission Check Logic

```javascript
IF user.canValidate() == true
    SHOW: previewValidationSection
    SHOW: All validation controls
ELSE
    HIDE: previewValidationSection (add 'hidden' class)
    USER: Can still view photos and record info
```

---

## Data Flow - Validation Save

```
User Input
  ↓
selectValidationInPreview(status)
  ├─ Update radio button checked state
  ├─ Update visual selection (add 'selected' class)
  └─ Show/hide textarea based on status
  ↓
User submits form
  ↓
submitValidationFromPreview()
  ├─ Validate required fields
  ├─ Show loading spinner
  ├─ Create validationData object
  │  └─ {
  │      id, 
  │      validationStatus, 
  │      validatedBy, 
  │      validatedAt, 
  │      validationReason (if invalid)
  │    }
  ├─ storage.updateRecord(recordId, validationData)
  │  ├─ Update Local Storage
  │  └─ Sync to Google Sheets (Apps Script)
  ├─ Update currentPreviewRecord
  ├─ Update allRecords array
  ├─ renderAllRecordsAsCardList() - Re-render
  ├─ Show success toast
  └─ Close preview popup (1s delay)
```

---

## CSS Styling Hierarchy

```css
.preview-validation-section
  ├─ h3
  ├─ .validation-options
  │  ├─ .valid-option
  │  │  ├─ .validation-icon
  │  │  └─ .validation-text
  │  └─ .invalid-option
  │     ├─ .validation-icon
  │     └─ .validation-text
  ├─ .invalid-reason-container
  │  ├─ .form-label
  │  └─ .form-textarea
  └─ .btn-submit-validation
```

---

## State Management

### Validation Selection State
```javascript
// Which status is selected?
const checkedRadio = document.querySelector('[name="previewValidationStatus"]:checked');
const selectedStatus = checkedRadio?.value; // 'valid' | 'invalid' | undefined
```

### Visual Selection State
```javascript
// Which option is visually selected?
const selectedOptions = document.querySelectorAll('.preview-validation-section .validation-option.selected');
// Should be 0 or 1 (only one can be selected)
```

### Form Visibility State
```javascript
// Is textarea visible?
const reasonContainer = document.getElementById('previewInvalidReasonContainer');
const isVisible = reasonContainer.style.display !== 'none';
// Should show ONLY when 'invalid' is selected
```

---

## Browser DevTools - Debug Tips

### Check Permission
```javascript
// In console:
canValidate()  // true/false

// Or:
auth.getUser()  // Check role
```

### Check Section Visibility
```javascript
// In console:
document.getElementById('previewValidationSection').classList
// Should NOT have 'hidden' class if canValidate() = true
```

### Check Selected Status
```javascript
// In console:
document.querySelector('[name="previewValidationStatus"]:checked')?.value
// Should be 'valid' or 'invalid' after user selects
```

### Check Data Before Save
```javascript
// In console during submitValidationFromPreview():
const recordId = document.getElementById('previewValidationRecordId').value;
const status = document.querySelector('[name="previewValidationStatus"]:checked')?.value;
const reason = document.getElementById('previewInvalidReason').value.trim();
console.log({recordId, status, reason})
```

---

## Responsive Design Breakpoints

```css
Desktop (> 768px)
  - Full preview width
  - 2-column validation options side-by-side (flex-row)
  - Large icons (28px → 24px)

Tablet (< 768px)
  - Adjusted padding
  - Validation options stack vertically
  - Medium icons (24px → 20px)

Mobile (< 480px)
  - Minimal padding
  - Single column layout
  - Touch-friendly button size (44px min height)
```

---

## Testing Scenarios

### ✅ Scenario 1: Admin validates record
```
1. Admin logs in
2. Open record → click View
3. Validation section appears ✅
4. Select "Valid"
5. Click "Simpan Validasi"
6. Success toast appears
7. Popup closes
8. Card list updated with ✅ status
```

### ✅ Scenario 2: Mark record as invalid with reason
```
1. Admin logs in
2. Open record → click View
3. Validation section appears ✅
4. Select "Invalid"
5. Textarea appears ✅
6. Type reason: "Photo tidak jelas"
7. Click "Simpan Validasi"
8. Success toast appears
9. Popup closes
10. Card list shows ❌ status with badge
11. Open again → textarea still has saved reason
```

### ✅ Scenario 3: Non-admin cannot see validation
```
1. Regular user logs in
2. Open record → click View
3. Validation section is NOT visible ✅
4. Can see photos and info only
5. Close popup
```

### ✅ Scenario 4: Edit & Re-validate
```
1. Record already validated as "valid"
2. Open record → click View
3. "Valid" option is pre-selected ✅
4. Change to "Invalid" + add reason
5. Simpan → Success
6. Open again → now shows "Invalid" with reason
```

---

## Known Limitations & Notes

1. **Validation Section Only Shows After Photos Load**
   - If photo fetch fails, validation section still shows (but photos area shows error)
   - This is intentional - user can still validate even without photos

2. **Textarea Only Shows on "Invalid"**
   - Automatically hidden when switching to "Valid"
   - Reason is cleared if user didn't save before switching

3. **Auto-Close Delay**
   - 1 second delay before closing popup to show success toast
   - If user closes manually, success message still shows

4. **Permission Check**
   - Checked once when popup opens
   - If permission changes mid-session, needs page reload to update

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v6.0 | Apr 20, 2026 | Initial release - Validation in preview |
| v5.9 | Apr 13, 2026 | Fixed validation filter logic |
| v5.8 | Apr 10, 2026 | Separate validation popup |

---

**Created**: April 20, 2026  
**Last Updated**: April 20, 2026  
**Status**: ✅ Production Ready

