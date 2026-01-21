# Master Editor Permission System

## Overview
Sistem permission `master_editor` telah ditambahkan untuk mengontrol akses ke halaman **Edit Master Data** (`edit-master.html`) dan **Master Data** (`master.html`).

## Changes Made

### 1. Backend (Code.gs)
**File:** `google-apps-script/Code.gs`

- **Added permission to default admin user:**
  - Admin user (NIK: 50086913) sekarang memiliki permission `master_editor` ditambahkan ke permissions string
  - Permissions string: `user_admin|records_viewer|records_editor|records_validator|master_editor`

- **Permission Format:**
  - Permissions disimpan sebagai string yang dipisahkan dengan pipe (`|`)
  - Contoh: `perm1|perm2|perm3`
  - Setiap permission disimpan di kolom E (Users sheet)

### 2. Frontend - Permission Checks

#### edit-master.js
**File:** `js/edit-master.js`

- **Added function:** `checkMasterEditorPermission()`
  - Dipanggil di `DOMContentLoaded` setelah `checkAuth()`
  - Memeriksa apakah user memiliki permission `master_editor` atau `user_admin`
  - Jika tidak memiliki permission, redirect ke `records.html`
  - Mencegah akses unauthorized ke halaman Edit Master

- **Implementation:**
  ```javascript
  function checkMasterEditorPermission() {
      const user = JSON.parse(localStorage.getItem(storageKey) || 'null');
      
      if (!user || !user.permissions) {
          window.location.href = 'records.html';
          return;
      }
      
      const permissions = Array.isArray(user.permissions) ? user.permissions : [];
      const hasMasterEditorAccess = permissions.includes('master_editor') || 
                                    permissions.includes('user_admin');
      
      if (!hasMasterEditorAccess) {
          window.location.href = 'records.html';
          return;
      }
  }
  ```

#### master.js
**File:** `js/master.js`

- **Added function:** `protectPage()`
  - Memeriksa autentikasi user
  - Memeriksa apakah user memiliki permission `master_editor` atau `user_admin`
  - Jika tidak memiliki permission, redirect ke `records.html`
  - Dipanggil di `DOMContentLoaded` sebelum inisialisasi halaman

- **Implementation:**
  ```javascript
  function protectPage() {
      const auth = new Auth();
      if (!auth.isLoggedIn()) {
          window.location.href = 'index.html';
          return false;
      }

      const user = auth.getUser();
      const permissions = Array.isArray(user.permissions) ? user.permissions : [];
      const hasMasterEditorAccess = permissions.includes('master_editor') || 
                                    permissions.includes('user_admin');

      if (!hasMasterEditorAccess) {
          window.location.href = 'records.html';
          return false;
      }

      return true;
  }
  ```

#### records.js
**File:** `js/records.js`

- **Updated function:** `setupPermissionBasedUI()`
  - Menambahkan check untuk permission `master_editor`
  - Show/hide link "Edit Master Data" berdasarkan permission
  - Link hanya ditampilkan jika user memiliki `master_editor` permission

- **Implementation:**
  ```javascript
  // Show master data link and edit master button for master_editor permission
  if (hasPermission('master_editor')) {
      if (masterDataLink) {
          masterDataLink.style.display = 'inline-flex';
      }
      if (editMasterBtn) {
          editMasterBtn.style.display = 'inline-flex';
      }
  }
  ```

### 3. Frontend - HTML Files

#### records.html
- **Edit Master Data button:** Disembunyikan pada awalnya (`display: none`)
- Ditampilkan hanya jika user memiliki permission `master_editor`

#### master.html
- **Added link:** "Edit Master" di navbar untuk quick access ke `edit-master.html`
- **Added link:** "Records" di navbar untuk navigasi kembali

#### edit-master.html
- **Updated navbar:** Menambahkan link "Records" dan "Master"
- **Users management link:** Disembunyikan pada awalnya (`display: none`)

## Permission Hierarchy

```
user_admin (Super Admin)
├── Has all permissions including master_editor
├── Can edit master data
├── Can manage users
└── Can edit/validate records

master_editor (Master Data Editor)
├── Can edit master data only
└── Cannot manage users

records_editor (Record Editor)
├── Can create/edit records
└── Cannot access master data or user management

records_validator (Record Validator)
├── Can validate records only
└── Cannot edit or access master data

records_viewer (Viewer)
├── Can view records only
└── No edit access
```

## Usage

### For Administrators
1. Deploy updated `Code.gs` ke Google Apps Script
2. Admin users (NIK: 50086913) sudah memiliki `master_editor` permission
3. Untuk menambah master_editor permission ke user lain:
   - Edit user di halaman Users Management
   - Centang checkbox "Master Editor"
   - Permission akan disimpan di Google Sheet

### For End Users
- **If user has master_editor permission:**
  - Link "Edit Master Data" terlihat di records.html
  - Link "Master" terlihat di navbar
  - Akses ke halaman master.html dan edit-master.html diizinkan

- **If user doesn't have master_editor permission:**
  - Link "Edit Master Data" tersembunyi
  - Jika coba akses langsung: automatic redirect ke records.html
  - Hanya bisa mengakses records yang permitted

## Security Features

1. **Frontend Protection:**
   - Permission check di awal page load
   - Automatic redirect jika tidak punya akses
   - Navigation links disembunyikan dari UI

2. **Backend Protection:**
   - Data validation di Code.gs
   - Only authenticated users dapat akses
   - Permission stored di Google Sheet (persistent)

## Testing Checklist

- [ ] Admin user (50086913) dapat akses master.html
- [ ] Admin user dapat akses edit-master.html
- [ ] Admin user melihat link "Edit Master Data" di records.html
- [ ] Admin user melihat link "Master" di navbar
- [ ] Non-master_editor user tidak melihat link "Edit Master Data"
- [ ] Non-master_editor user redirect ke records.html jika coba akses master.html
- [ ] Non-master_editor user redirect ke records.html jika coba akses edit-master.html
- [ ] Permission bisa ditambah/dihapus dari Users Management
- [ ] Permission persists setelah reload page
- [ ] Permission persists setelah logout dan login kembali

## Files Modified

1. `google-apps-script/Code.gs`
   - Updated default users with master_editor permission

2. `js/edit-master.js`
   - Added checkMasterEditorPermission() function
   - Added call to checkMasterEditorPermission() in DOMContentLoaded

3. `js/master.js`
   - Added protectPage() function with master_editor check
   - Integrated protectPage() in DOMContentLoaded

4. `js/records.js`
   - Updated setupPermissionBasedUI() for master_editor visibility

5. `records.html`
   - Updated "Edit Master Data" link with display: none

6. `master.html`
   - Added "Edit Master" link to navbar
   - Added "Records" link to navbar

7. `edit-master.html`
   - Updated navbar with Records and Master links
   - Updated Users link to display: none

## Next Steps

1. Deploy updated Code.gs to Google Apps Script
2. Test all permission scenarios
3. Create user with master_editor permission to verify
4. Test permission removal and re-addition
5. Verify redirect flows work correctly

## Related Files
- `USER_PERMISSIONS_SUCCESS.md` - User permissions verification
- `USER_PERMISSIONS_DEBUG.md` - User permissions debugging guide
