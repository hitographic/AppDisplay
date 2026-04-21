# ✅ DEPLOYMENT CHECKLIST v6.2.2

## 📋 Pre-Deployment

- [ ] **Code Review**
  - [ ] Review google-apps-script/Code.gs line 1010
  - [ ] Review js/create-display.js line 816
  - [ ] Review js/records.js line 1009-1024
  - [ ] Review records.html line 265

- [ ] **Backup**
  - [ ] Backup Google Apps Script code
  - [ ] Backup all JS files
  - [ ] Backup records.html

---

## 🚀 Deployment Steps

### Step 1: Update Google Apps Script
```
File: google-apps-script/Code.gs
Line: 1010

OLD:
    new Date().toISOString(),

NEW:
    updatedRecord.updatedAt || new Date().toISOString(),
```

**Action:**
- [ ] Open Google Apps Script Editor
- [ ] Find function `updateRecordData()`
- [ ] Replace line 1010
- [ ] Run test: `testUpdateRecord()`
- [ ] Check logs - should see "Record updated successfully"

---

### Step 2: Update create-display.js
```
File: js/create-display.js
Line: 816

OLD:
    updatedAt: new Date().toISOString()
};

NEW:
    updatedAt: new Date().toISOString(),
    updatedBy: getCurrentUserName()
};
```

**Action:**
- [ ] Update file in editor
- [ ] Save
- [ ] Deploy to GitHub

---

### Step 3: Update records.js
```
File: js/records.js
Line: 1009-1024

OLD:
if (record.validatedAt && record.validatedBy) {
    const validatedDate = new Date(record.validatedAt);
    const formattedDate = validatedDate.toLocaleDateString(...);
    document.getElementById('previewValidationDate').textContent = formattedDate;
    document.getElementById('previewValidatedBy').textContent = record.validatedBy;

NEW:
if (record.updatedAt && record.updatedBy) {
    const updatedDate = new Date(record.updatedAt);
    const formattedDate = updatedDate.toLocaleDateString(...);
    document.getElementById('previewValidationDate').textContent = formattedDate;
    document.getElementById('previewValidatedBy').textContent = record.updatedBy;
```

**Action:**
- [ ] Update file in editor
- [ ] Save
- [ ] Deploy to GitHub

---

### Step 4: Update records.html
```
File: records.html
Line: 265

OLD:
<!-- Tanggal Update & Diupdate oleh - hanya tampil saat ada validasi -->

NEW:
<!-- Tanggal Update & Diupdate oleh - menampilkan data saat editor membuat/edit, bukan saat validator validasi -->
```

**Action:**
- [ ] Update file in editor
- [ ] Save
- [ ] Deploy to GitHub

---

## 🧪 Testing (After Deployment)

### Test Suite 1: Create New Record

**Setup:**
- [ ] Login as EDITOR (e.g., "Budi Santoso")
- [ ] Open create-display.html

**Actions:**
- [ ] Fill in: flavor, nomor material, negara, distributor
- [ ] Add photos for at least 2 elements
- [ ] Klik "Simpan"

**Verify:**
- [ ] Toast: "Data berhasil disimpan!" ✅
- [ ] Redirect to records.html
- [ ] New record visible in list
- [ ] Open Google Sheet → Records
  - [ ] Column G (createdAt) = timestamp ✅
  - [ ] Column H (updatedAt) = SAME as Column G ✅
  - [ ] Column I (createdBy) = "Budi Santoso" ✅
  - [ ] Column J (updatedBy) = "Budi Santoso" ✅

**Status:** ✅ / ❌

---

### Test Suite 2: Edit Existing Record

**Setup:**
- [ ] Login as DIFFERENT EDITOR (e.g., "Andi Wijaya")
- [ ] Go to records.html
- [ ] Find record from Test Suite 1

**Actions:**
- [ ] Klik edit icon
- [ ] Change some data (e.g., flavor)
- [ ] Change/add some photos
- [ ] Klik "Simpan"

**Verify:**
- [ ] Toast: "Data berhasil diupdate!" ✅
- [ ] Redirect to records.html
- [ ] Record list updated
- [ ] Open Google Sheet → Records (same row as before)
  - [ ] Column G (createdAt) = OLD TIME (from Test 1) ✅ **DO NOT CHANGE**
  - [ ] Column H (updatedAt) = NEW TIME ✅ **UPDATED**
  - [ ] Column I (createdBy) = "Budi Santoso" ✅ **DO NOT CHANGE**
  - [ ] Column J (updatedBy) = "Andi Wijaya" ✅ **UPDATED TO NEW EDITOR**

**Critical Check:**
- [ ] Verify Column G ≠ Column H (createdAt ≠ updatedAt)
- [ ] Verify Column J = "Andi Wijaya" (new editor name)

**Status:** ✅ / ❌

---

### Test Suite 3: View Record in Popup (Before Validation)

**Setup:**
- [ ] Login as VALIDATOR (e.g., "Ahmad Validator")
- [ ] Go to records.html
- [ ] Find record from Test Suite 2

**Actions:**
- [ ] Klik view icon
- [ ] Popup appears

**Verify Metadata Section:**
- [ ] "Tanggal Update" shows: "21 April 2026, 15:45" (or similar) ✅
- [ ] "Diupdate oleh" shows: "Andi Wijaya" ✅
- [ ] Elemen checklist visible ✅
- [ ] Status shows "Belum Divalidasi" or empty ✅

**Critical Check:**
- [ ] Metadata shows **Andi Wijaya** (editor), NOT Ahmad (validator) ✅
- [ ] Timestamp is from edit time, NOT current time ✅

**Status:** ✅ / ❌

---

### Test Suite 4: Validate Record

**Setup:**
- [ ] Same validator, same record open in popup
- [ ] Metadata visible as in Test Suite 3

**Actions:**
- [ ] Select "Valid" radio button
- [ ] Klik "Simpan Validasi"
- [ ] Wait for toast

**Verify:**
- [ ] Toast: "✅ Record berhasil divalidasi" ✅
- [ ] Popup closes
- [ ] Record card shows validation status (green checkmark) ✅
- [ ] Open Google Sheet → same row
  - [ ] Column H (updatedAt) = SAME as before ✅ **MUST NOT CHANGE**
  - [ ] Column J (updatedBy) = "Andi Wijaya" ✅ **MUST NOT CHANGE**
  - [ ] Column T (validationStatus) = "valid" ✅ **NEW**
  - [ ] Column U (validatedBy) = "Ahmad Validator" ✅ **NEW**
  - [ ] Column V (validatedAt) = current timestamp ✅ **NEW**

**Critical Check:**
- [ ] Verify Column H ≠ NEW TIME (updatedAt must NOT change!) ✅
- [ ] Verify Column U = "Ahmad Validator" (validator name) ✅
- [ ] Verify Column V ≠ Column H (validatedAt ≠ updatedAt) ✅

**Status:** ✅ / ❌

---

### Test Suite 5: Edit After Validation

**Setup:**
- [ ] Login as DIFFERENT EDITOR (e.g., "Rina Editor")
- [ ] Record is currently validated by Ahmad

**Actions:**
- [ ] Klik edit icon
- [ ] Change data again
- [ ] Klik "Simpan"

**Verify:**
- [ ] Toast: "Data berhasil diupdate!" ✅
- [ ] Open Google Sheet
  - [ ] Column H (updatedAt) = NEW NEW TIME ✅
  - [ ] Column J (updatedBy) = "Rina Editor" ✅
  - [ ] Column T (validationStatus) = ???
  - [ ] Column U (validatedBy) = "Ahmad Validator" ✅ **MUST NOT CHANGE**
  - [ ] Column V (validatedAt) = OLD TIME from Test 4 ✅ **MUST NOT CHANGE**

**Critical Check:**
- [ ] Verify validation columns NOT affected ✅
- [ ] Verify updatedAt & updatedBy updated ✅
- [ ] Verify old validatedAt & validatedBy preserved ✅

**Status:** ✅ / ❌

---

### Test Suite 6: Mobile Responsive

**Setup:**
- [ ] Open records.html on mobile device (< 768px)
- [ ] Find and open record in popup

**Actions:**
- [ ] Check metadata section layout
- [ ] Scroll to see all content

**Verify:**
- [ ] "Tanggal Update" visible and readable ✅
- [ ] "Diupdate oleh" visible and readable ✅
- [ ] Elemen checklist visible ✅
- [ ] Validation buttons visible ✅
- [ ] No text overflow ✅
- [ ] Layout responsive ✅

**Status:** ✅ / ❌

---

### Test Suite 7: Data Consistency

**Setup:**
- [ ] Open records.html
- [ ] Select 5 random records with different statuses

**Actions:**
- [ ] For each record, open popup and verify metadata

**Verify Each Record:**
- [ ] "Tanggal Update" = Column H (updatedAt) ✅
- [ ] "Diupdate oleh" = Column J (updatedBy) ✅
- [ ] No empty values if column has data ✅
- [ ] Dates formatted correctly ✅

**Status:** ✅ / ❌

---

## 🐛 Rollback Plan (If Issues)

If any test fails:

1. **Revert Changes:**
   ```bash
   git checkout google-apps-script/Code.gs
   git checkout js/create-display.js
   git checkout js/records.js
   git checkout records.html
   ```

2. **Verify Revert:**
   - [ ] Test old version works again
   - [ ] Notify team

3. **Debug:**
   - [ ] Check console for errors
   - [ ] Review Google Apps Script logs
   - [ ] Check network requests

---

## 📊 Sign-Off

**Tested By:** _________________ **Date:** _________

**Sign-Off By:** _________________ **Date:** _________

**Deployment Status:**
- [ ] ✅ All tests passed → READY TO DEPLOY
- [ ] ❌ Some tests failed → Review Issues

---

## 🎉 Post-Deployment

- [ ] Monitor for user issues (first 24 hours)
- [ ] Check Google Sheet for correct data
- [ ] Verify all records showing correct metadata
- [ ] Document any findings
- [ ] Communicate status to team

---

**Version:** 6.2.2  
**Deployment Date:** _____________  
**Status:** ⏳ Ready for Testing
