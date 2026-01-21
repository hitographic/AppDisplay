# User Permissions Update - Debugging Guide

## Problem
Saat mengedit user dan mencentang permissions, data permissions tidak terupdate di Google Sheet.

## Debug Steps

### 1. Check Browser Console Logs
Buka **Browser Developer Tools (F12)** → **Console** tab

Saat Anda klik "Edit" pada user dan ubah permissions:

**Expected logs:**
```
🔍 saveUser() - editMode: edit
🔍 saveUser() - permissions array: ['records_viewer', 'records_editor']
🔍 saveUser() - permissions joined: records_viewer|records_editor
📤 Updating user - Request data: {"action":"updateUser","nik":"50086913","user":{"name":"Admin User","password":"Ind0f00d25","role":"admin","permissions":"records_viewer|records_editor"}}
📤 User operation via JSONP: updateUser
📤 Full request data: {"action":"updateUser","nik":"50086913","user":{"name":"Admin User","password":"Ind0f00d25","role":"admin","permissions":"records_viewer|records_editor"}}
📤 JSONP URL length: ...
📤 Encoded data sample: %7B%22action%...
✅ User operation response: {success: true, message: 'User berhasil diupdate'}
```

### 2. Check Google Apps Script Logs
1. Buka **Google Apps Script Editor**
2. Klik **Extensions** → **Apps Script** di menu
3. Atau akses langsung: `script.google.com/home/projects/[PROJECT_ID]/executions`

Cari logs:
```
updateUserData called with nik=50086913, updatedUser={"name":"Admin User",...}
Updating user 50086913 with permissions: records_viewer|records_editor
User updated successfully
```

**Jika ada error:**
```
User not found: 50086913
```

### 3. Verify Google Sheet Structure
1. Buka Google Sheet Users
2. Check header row (row 1): harus ada kolom E dengan nama "permissions"
3. Check struktur data:
   - A: nik
   - B: password
   - C: name
   - D: role
   - E: permissions (pipe-separated: `user_admin|records_viewer|...`)
   - F: createdAt
   - G: updatedAt

### 4. Troubleshooting by Scenario

#### Scenario A: Console shows success, tapi Sheet tidak update
**Possible causes:**
1. ❌ Code.gs belum di-deploy ke Google Apps Script Web App
   - **Solution:** Deploy Code.gs baru → redeploy Web App
   
2. ❌ Google Sheet permissions column berbeda posisi
   - **Solution:** Verify kolom E adalah "permissions"
   
3. ❌ JSONP URL terlalu panjang (URL encoding issue)
   - **Solution:** Jika URL length > 2000, split request

#### Scenario B: Console shows error "User not found"
**Possible causes:**
1. ❌ `originalNik` tidak ter-set dengan benar saat Edit
   - **Solution:** Check `document.getElementById('originalNik').value` di Form

2. ❌ NIK di Form tidak sama dengan yang di Sheet
   - **Solution:** Verify format NIK (harus exact match)

#### Scenario C: Console shows "Script load error"
**Possible causes:**
1. ❌ Google Apps Script Web App URL salah
   - **Solution:** Check CONFIG.GOOGLE_SHEETS_WEBAPP_URL di config.js
   
2. ❌ Web App belum di-deploy
   - **Solution:** Deploy Code.gs as Web App

### 5. Test Flow Manually

**Step 1: Prepare**
```javascript
// Buka Console dan run:
console.log('webAppUrl:', webAppUrl);
console.log('TEST URL:', webAppUrl + '?action=getUsers');
```

**Step 2: Test getUsers**
```javascript
// Run di Console:
jsonpRequest(webAppUrl + '?action=getUsers').then(r => console.log(r));
```

**Step 3: Test Update User**
```javascript
// Prepare data
const testData = {
    action: 'updateUser',
    nik: '50086913',
    user: { 
        name: 'Admin User', 
        password: 'Ind0f00d25', 
        role: 'admin',
        permissions: 'user_admin|records_viewer'
    }
};

// Send via JSONP
postRequest(testData).then(r => console.log(r));
```

## Quick Fix Checklist

- [ ] Check Console logs saat edit user
- [ ] Verify JSON data structure: `{action, nik, user: {...}}`
- [ ] Confirm permissions format: pipe-separated string `perm1|perm2|perm3`
- [ ] Check Google Apps Script logs untuk errors
- [ ] Verify Google Sheet users memiliki kolom E "permissions"
- [ ] Deploy Code.gs ke Google Apps Script Web App
- [ ] Test di incognito/private browser (clear cache)

## Contact Points

**Frontend (users.js):**
- `saveUser()` - Collect form data, validate permissions
- `postRequest()` - Send JSONP request with encoded data
- `getSelectedPermissions()` - Get checked permissions

**Backend (Code.gs):**
- `doGet()` - Parse JSONP parameters (action, data)
- `updateUserData()` - Find user by NIK, update row with permissions

**Data Format:**
- Frontend sends: `permissions.join('|')` → String: `"perm1|perm2|perm3"`
- Backend receives: String via JSONP parameter decoding
- Backend stores: String in Google Sheet column E

---

**Last Updated:** 2026-01-21
**Commit:** 38f29ad - Improve user permissions update
