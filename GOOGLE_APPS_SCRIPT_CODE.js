// =====================================================
// VALID DISPLAY - Google Apps Script Backend
// COPY PASTE SEMUA KODE INI KE Google Apps Script
// =====================================================

// Spreadsheet ID - Ganti dengan ID spreadsheet Anda
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';

// Sheet names
const SHEET_USERS = 'Users';
const SHEET_RECORDS = 'Records';

// =====================================================
// MAIN HANDLER - doGet untuk JSONP
// =====================================================
function doGet(e) {
  const action = e.parameter.action || '';
  const callback = e.parameter.callback || 'callback';
  
  let result;
  
  try {
    switch(action) {
      case 'login':
        result = handleLogin(e.parameter.nik, e.parameter.password);
        break;
      case 'getUsers':
        result = getUsers();
        break;
      case 'getRecords':
        result = getRecords(e.parameter);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }
  } catch(error) {
    result = { success: false, error: error.toString() };
  }
  
  // Return JSONP response
  const jsonOutput = JSON.stringify(result);
  return ContentService.createTextOutput(callback + '(' + jsonOutput + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// =====================================================
// MAIN HANDLER - doPost untuk Create/Update/Delete
// =====================================================
function doPost(e) {
  let result;
  
  try {
    const data = JSON.parse(e.postData.contents || e.parameter.data || '{}');
    const action = data.action || '';
    
    switch(action) {
      case 'addUser':
        result = addUser(data.user);
        break;
      case 'updateUser':
        result = updateUser(data.nik, data.user);
        break;
      case 'deleteUser':
        result = deleteUser(data.nik);
        break;
      case 'bulkAddUsers':
        result = bulkAddUsers(data.users);
        break;
      case 'addRecord':
        result = addRecord(data.record);
        break;
      case 'updateRecord':
        result = updateRecord(data.id, data.record);
        break;
      case 'deleteRecord':
        result = deleteRecord(data.id);
        break;
      case 'validateRecord':
        result = validateRecord(data.id, data.validation);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
  } catch(error) {
    result = { success: false, error: error.toString() };
  }
  
  // Send postMessage for iframe communication
  const callback = e.parameter?.callback || '';
  const html = `
    <script>
      window.parent.postMessage(${JSON.stringify({...result, callbackName: callback})}, '*');
    </script>
  `;
  return HtmlService.createHtmlOutput(html);
}

// =====================================================
// USER FUNCTIONS
// =====================================================

// Login user
function handleLogin(nik, password) {
  if (!nik || !password) {
    return { success: false, error: 'NIK dan Password harus diisi' };
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_USERS);
  
  // Create Users sheet if not exists
  if (!sheet) {
    sheet = createUsersSheet(ss);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find column indexes
  const nikCol = headers.indexOf('nik');
  const passwordCol = headers.indexOf('password');
  const nameCol = headers.indexOf('name');
  const roleCol = headers.indexOf('role');
  const permissionsCol = headers.indexOf('permissions');
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[nikCol]) === String(nik) && String(row[passwordCol]) === String(password)) {
      return {
        success: true,
        user: {
          nik: row[nikCol],
          name: row[nameCol] || 'User',
          role: row[roleCol] || 'field',
          permissions: row[permissionsCol] || ''
        }
      };
    }
  }
  
  return { success: false, error: 'NIK atau Password salah!' };
}

// Get all users
function getUsers() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_USERS);
  
  if (!sheet) {
    sheet = createUsersSheet(ss);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const users = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows
    
    const user = {};
    headers.forEach((header, index) => {
      user[header] = row[index] || '';
    });
    users.push(user);
  }
  
  return { success: true, users: users };
}

// Add new user
function addUser(user) {
  if (!user || !user.nik || !user.name || !user.password) {
    return { success: false, error: 'Data user tidak lengkap' };
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_USERS);
  
  if (!sheet) {
    sheet = createUsersSheet(ss);
  }
  
  // Check if NIK already exists
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(user.nik)) {
      return { success: false, error: 'NIK sudah terdaftar' };
    }
  }
  
  // Add new row
  sheet.appendRow([
    user.nik,
    user.password,
    user.name,
    user.role || 'field',
    user.permissions || ''
  ]);
  
  return { success: true, message: 'User berhasil ditambahkan' };
}

// Update user
function updateUser(nik, userData) {
  if (!nik || !userData) {
    return { success: false, error: 'Data tidak lengkap' };
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_USERS);
  
  if (!sheet) {
    return { success: false, error: 'Sheet Users tidak ditemukan' };
  }
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(nik)) {
      // Update row (nik stays same at index 0)
      sheet.getRange(i + 1, 2).setValue(userData.password || data[i][1]); // password
      sheet.getRange(i + 1, 3).setValue(userData.name || data[i][2]); // name
      sheet.getRange(i + 1, 4).setValue(userData.role || data[i][3]); // role
      sheet.getRange(i + 1, 5).setValue(userData.permissions || data[i][4]); // permissions
      
      return { success: true, message: 'User berhasil diupdate' };
    }
  }
  
  return { success: false, error: 'User tidak ditemukan' };
}

// Delete user
function deleteUser(nik) {
  if (!nik) {
    return { success: false, error: 'NIK tidak boleh kosong' };
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_USERS);
  
  if (!sheet) {
    return { success: false, error: 'Sheet Users tidak ditemukan' };
  }
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(nik)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'User berhasil dihapus' };
    }
  }
  
  return { success: false, error: 'User tidak ditemukan' };
}

// Bulk add users
function bulkAddUsers(users) {
  if (!users || !Array.isArray(users) || users.length === 0) {
    return { success: false, error: 'Data users kosong' };
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_USERS);
  
  if (!sheet) {
    sheet = createUsersSheet(ss);
  }
  
  let added = 0;
  let skipped = 0;
  const existingNiks = sheet.getDataRange().getValues().slice(1).map(row => String(row[0]));
  
  users.forEach(user => {
    if (!user.nik || !user.name || !user.password) {
      skipped++;
      return;
    }
    
    if (existingNiks.includes(String(user.nik))) {
      skipped++;
      return;
    }
    
    sheet.appendRow([
      user.nik,
      user.password,
      user.name,
      user.role || 'field',
      user.permissions || ''
    ]);
    added++;
  });
  
  return { 
    success: true, 
    message: `${added} user ditambahkan, ${skipped} dilewati`,
    added: added,
    skipped: skipped
  };
}

// Create Users sheet with default structure
function createUsersSheet(ss) {
  const sheet = ss.insertSheet(SHEET_USERS);
  
  // Set headers
  const headers = ['nik', 'password', 'name', 'role', 'permissions'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4a90d9').setFontColor('white');
  
  // Add default admin user
  sheet.appendRow([
    'admin',
    'admin123',
    'Administrator',
    'admin',
    'user_admin|records_viewer|records_editor|records_validator'
  ]);
  
  // Format
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  
  return sheet;
}

// =====================================================
// RECORD FUNCTIONS
// =====================================================

// Get all records with optional filters
function getRecords(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  
  if (!sheet) {
    return { success: true, records: [] };
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, records: [] };
  }
  
  const headers = data[0];
  const records = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    
    const record = { _rowIndex: i + 1 };
    headers.forEach((header, index) => {
      record[header] = row[index] || '';
    });
    
    // Apply filters if any
    let include = true;
    if (params) {
      if (params.flavor && record.flavor !== params.flavor) include = false;
      if (params.negara && record.negara !== params.negara) include = false;
      if (params.status && record.validation_status !== params.status) include = false;
    }
    
    if (include) {
      records.push(record);
    }
  }
  
  return { success: true, records: records };
}

// Add new record
function addRecord(record) {
  if (!record) {
    return { success: false, error: 'Data record tidak valid' };
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_RECORDS);
  
  if (!sheet) {
    sheet = createRecordsSheet(ss);
  }
  
  // Generate ID
  const id = 'REC' + Date.now();
  record.id = id;
  record.created_at = new Date().toISOString();
  record.validation_status = 'pending';
  record.validated_by = '';
  record.validated_at = '';
  record.validation_reason = '';
  
  // Get headers
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Build row
  const row = headers.map(header => record[header] || '');
  
  sheet.appendRow(row);
  
  return { success: true, message: 'Record berhasil ditambahkan', id: id };
}

// Update record
function updateRecord(id, recordData) {
  if (!id || !recordData) {
    return { success: false, error: 'Data tidak lengkap' };
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  
  if (!sheet) {
    return { success: false, error: 'Sheet Records tidak ditemukan' };
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      // Update each field
      headers.forEach((header, colIndex) => {
        if (header !== 'id' && header !== 'created_at' && recordData.hasOwnProperty(header)) {
          sheet.getRange(i + 1, colIndex + 1).setValue(recordData[header]);
        }
      });
      
      return { success: true, message: 'Record berhasil diupdate' };
    }
  }
  
  return { success: false, error: 'Record tidak ditemukan' };
}

// Delete record
function deleteRecord(id) {
  if (!id) {
    return { success: false, error: 'ID tidak boleh kosong' };
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  
  if (!sheet) {
    return { success: false, error: 'Sheet Records tidak ditemukan' };
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Record berhasil dihapus' };
    }
  }
  
  return { success: false, error: 'Record tidak ditemukan' };
}

// Validate record
function validateRecord(id, validation) {
  if (!id || !validation) {
    return { success: false, error: 'Data validasi tidak lengkap' };
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  
  if (!sheet) {
    return { success: false, error: 'Sheet Records tidak ditemukan' };
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  const statusCol = headers.indexOf('validation_status');
  const validatedByCol = headers.indexOf('validated_by');
  const validatedAtCol = headers.indexOf('validated_at');
  const reasonCol = headers.indexOf('validation_reason');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      if (statusCol >= 0) sheet.getRange(i + 1, statusCol + 1).setValue(validation.status);
      if (validatedByCol >= 0) sheet.getRange(i + 1, validatedByCol + 1).setValue(validation.validatedBy);
      if (validatedAtCol >= 0) sheet.getRange(i + 1, validatedAtCol + 1).setValue(new Date().toISOString());
      if (reasonCol >= 0) sheet.getRange(i + 1, reasonCol + 1).setValue(validation.reason || '');
      
      return { success: true, message: 'Record berhasil divalidasi' };
    }
  }
  
  return { success: false, error: 'Record tidak ditemukan' };
}

// Create Records sheet with default structure
function createRecordsSheet(ss) {
  const sheet = ss.insertSheet(SHEET_RECORDS);
  
  // Set headers - sesuaikan dengan kebutuhan aplikasi
  const headers = [
    'id',
    'flavor',
    'negara',
    'kode_produksi',
    'foto_bumbu',
    'foto_si',
    'foto_etiket',
    'created_by',
    'created_at',
    'validation_status',
    'validated_by',
    'validated_at',
    'validation_reason'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4a90d9').setFontColor('white');
  
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  
  return sheet;
}

// =====================================================
// UTILITY: Test function - Run this first to setup
// =====================================================
function setupDatabase() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Create Users sheet if not exists
  if (!ss.getSheetByName(SHEET_USERS)) {
    createUsersSheet(ss);
    Logger.log('Users sheet created');
  }
  
  // Create Records sheet if not exists
  if (!ss.getSheetByName(SHEET_RECORDS)) {
    createRecordsSheet(ss);
    Logger.log('Records sheet created');
  }
  
  Logger.log('Database setup complete!');
}

// =====================================================
// INSTRUCTIONS - CARA SETUP:
// =====================================================
/*
1. Buka Google Sheets, buat spreadsheet baru
2. Copy ID spreadsheet dari URL (bagian setelah /d/ dan sebelum /edit)
3. Ganti SPREADSHEET_ID di baris 8 dengan ID tersebut
4. Buka Extensions > Apps Script
5. Hapus semua kode default, paste semua kode ini
6. Klik Run > setupDatabase (untuk membuat sheet Users dan Records)
7. Deploy > New Deployment
   - Type: Web app
   - Execute as: Me
   - Who has access: Anyone
8. Copy URL deployment, paste ke js/config.js

STRUKTUR SHEET USERS:
| nik | password | name | role | permissions |

CONTOH DATA:
| admin | admin123 | Administrator | admin | user_admin|records_viewer|records_editor|records_validator |
| 12345 | pass123  | John Doe      | field | records_viewer|records_editor |

ROLE OPTIONS: admin, manager, supervisor, field

PERMISSION OPTIONS:
- user_admin: Dapat mengelola user
- records_viewer: Dapat melihat records
- records_editor: Dapat CRUD records  
- records_validator: Dapat validasi records

Format permissions: dipisahkan dengan | (pipe)
*/
