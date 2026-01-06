// =====================================================
// VALID DISPLAY - Google Apps Script Backend
// COPY PASTE SEMUA KODE INI KE Google Apps Script
// =====================================================

// Spreadsheet ID - Ganti dengan ID spreadsheet Anda
const SPREADSHEET_ID = '1cCQY-y__0g956Zy7dNTZhYTz5zDL5FSkUw7V8tObtVg';

// Sheet names
const SHEET_USERS = 'Users';
const SHEET_RECORDS = 'Records';

// =====================================================
// MAIN HANDLER - doGet untuk JSONP
// Supports both read AND write operations via GET (for CORS bypass)
// =====================================================
function doGet(e) {
  const action = e.parameter.action || '';
  const callback = e.parameter.callback || 'callback';
  
  let result;
  
  try {
    // Parse data parameter if exists (for write operations)
    let data = {};
    if (e.parameter.data) {
      try {
        data = JSON.parse(e.parameter.data);
      } catch(err) {
        Logger.log('Failed to parse data parameter: ' + err);
      }
    }
    
    Logger.log('doGet action: ' + action);
    
    switch(action) {
      case 'login':
        result = handleLogin(e.parameter.nik, e.parameter.password);
        break;
      case 'getUsers':
        result = getUsers();
        break;
      case 'getRecords':
      case 'getAll':
        result = getAllRecords();
        break;
      case 'get':
        result = getRecordById(e.parameter.id);
        break;
      // Write operations via GET (for CORS bypass)
      case 'add':
      case 'addRecord':
        Logger.log('Adding record via GET: ' + JSON.stringify(data).substring(0, 300));
        result = addRecord(data.record || data);
        break;
      case 'update':
      case 'updateRecord':
        result = updateRecord(data.id || e.parameter.id, data.record || data);
        break;
      case 'delete':
      case 'deleteRecord':
        result = deleteRecord(data.id || e.parameter.id);
        break;
      case 'validateRecord':
        result = validateRecord(data.id || e.parameter.id, data.validation || data);
        break;
      case 'addUser':
        result = addUser(data.user || data);
        break;
      case 'updateUser':
        result = updateUser(data.nik || e.parameter.nik, data.user || data);
        break;
      case 'deleteUser':
        result = deleteUser(data.nik || e.parameter.nik);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
  } catch(error) {
    Logger.log('doGet error: ' + error.toString());
    result = { success: false, error: error.toString() };
  }
  
  Logger.log('doGet result: ' + JSON.stringify(result).substring(0, 200));
  
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
  let callbackName = '';
  
  try {
    let data;
    
    // Log raw request for debugging
    Logger.log('=== POST Request Debug ===');
    Logger.log('e.parameter: ' + JSON.stringify(e.parameter || {}));
    Logger.log('e.parameters: ' + JSON.stringify(e.parameters || {}));
    Logger.log('e.postData: ' + JSON.stringify(e.postData || {}));
    
    // Parse data from different sources
    if (e.postData && e.postData.contents) {
      Logger.log('Parsing from postData.contents');
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.data) {
      Logger.log('Parsing from e.parameter.data');
      data = JSON.parse(e.parameter.data);
    } else if (e.parameters && e.parameters.data && e.parameters.data[0]) {
      Logger.log('Parsing from e.parameters.data[0]');
      data = JSON.parse(e.parameters.data[0]);
    } else {
      Logger.log('No data found in request');
      data = {};
    }
    
    callbackName = data.callback || '';
    const action = data.action || '';
    
    Logger.log('POST action: ' + action);
    Logger.log('POST data: ' + JSON.stringify(data).substring(0, 500));
    
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
      case 'add':
      case 'addRecord':
        result = addRecord(data.record);
        break;
      case 'update':
      case 'updateRecord':
        result = updateRecord(data.recordId || data.id, data.record);
        break;
      case 'delete':
      case 'deleteRecord':
        result = deleteRecord(data.recordId || data.id);
        break;
      case 'validateRecord':
        result = validateRecord(data.id, data.validation);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
  } catch(error) {
    Logger.log('POST error: ' + error.toString());
    result = { success: false, error: error.toString() };
  }
  
  Logger.log('POST result: ' + JSON.stringify(result));
  
  // Send postMessage for iframe communication
  const html = `
    <script>
      window.parent.postMessage(${JSON.stringify({...result, callbackName: callbackName})}, '*');
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

// Get all records - compatible with existing sheet structure
function getAllRecords() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  
  if (!sheet) {
    Logger.log('Sheet Records not found');
    return { success: true, records: [] };
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    Logger.log('No data in Records sheet');
    return { success: true, records: [] };
  }
  
  const headers = data[0];
  Logger.log('Headers: ' + headers.join(', '));
  
  const records = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows
    
    // Map row data to record object
    const record = {};
    headers.forEach((header, index) => {
      // Convert header to camelCase for frontend compatibility
      const key = header.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      
      let value = row[index];
      
      // Parse JSON strings (for photos object)
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          value = JSON.parse(value);
        } catch(e) {
          // Keep as string if not valid JSON
        }
      }
      
      record[key] = value || '';
    });
    
    // Also keep original header names for compatibility
    headers.forEach((header, index) => {
      record[header] = row[index] || '';
    });
    
    // Parse photos from individual columns into photos object
    record.photos = {};
    const photoTypes = ['bumbu', 'mbumbu', 'si', 'karton', 'etiket', 'etiketbanded', 'plakban'];
    photoTypes.forEach(type => {
      const colName = 'photo_' + type;
      const value = record[colName];
      if (value) {
        // Check if it's a JSON object or a file ID
        if (typeof value === 'object') {
          record.photos[type === 'mbumbu' ? 'm-bumbu' : (type === 'etiketbanded' ? 'etiket-banded' : type)] = value;
        } else if (typeof value === 'string' && value.length > 5) {
          // Assume it's a file ID
          record.photos[type === 'mbumbu' ? 'm-bumbu' : (type === 'etiketbanded' ? 'etiket-banded' : type)] = {
            id: value,
            directLink: 'https://lh3.googleusercontent.com/d/' + value
          };
        }
      }
    });
    
    // Parse kodeProduksi
    if (record.kodeProduksi || record.kode_produksi) {
      const kodeValue = record.kodeProduksi || record.kode_produksi;
      if (typeof kodeValue === 'string') {
        try {
          record.kodeProduksi = JSON.parse(kodeValue);
        } catch(e) {
          record.kodeProduksi = [kodeValue];
        }
      }
    }
    
    records.push(record);
  }
  
  Logger.log('Found ' + records.length + ' records');
  return { success: true, records: records };
}

// Get single record by ID
function getRecordById(id) {
  if (!id) {
    return { success: false, error: 'ID required' };
  }
  
  const result = getAllRecords();
  if (result.success && result.records) {
    const record = result.records.find(r => String(r.id) === String(id));
    if (record) {
      return { success: true, record: record };
    }
  }
  return { success: false, error: 'Record not found' };
}

// Add new record - compatible with existing sheet structure
function addRecord(record) {
  if (!record) {
    return { success: false, error: 'Data record tidak valid' };
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_RECORDS);
  
  if (!sheet) {
    return { success: false, error: 'Sheet Records tidak ditemukan. Mohon buat sheet Records terlebih dahulu.' };
  }
  
  // Get headers
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Logger.log('Headers for add: ' + headers.join(', '));
  
  // Generate ID if not exists
  if (!record.id) {
    record.id = 'REC' + Date.now();
  }
  
  // Set timestamps
  const now = new Date().toISOString();
  record.createdAt = record.createdAt || now;
  record.updatedAt = now;
  
  // Set default validation status
  record.validationStatus = record.validationStatus || 'pending';
  record.validatedBy = record.validatedBy || '';
  record.validatedAt = record.validatedAt || '';
  record.validationReason = record.validationReason || '';
  
  // Build row based on headers
  const row = headers.map(header => {
    // Check various formats of the key
    let value = record[header];
    
    // Try camelCase version
    if (value === undefined) {
      const camelKey = header.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      value = record[camelKey];
    }
    
    // Handle photo columns
    if (header.startsWith('photo_') && record.photos) {
      const photoType = header.replace('photo_', '');
      const mappedType = photoType === 'mbumbu' ? 'm-bumbu' : (photoType === 'etiketbanded' ? 'etiket-banded' : photoType);
      const photoData = record.photos[mappedType];
      if (photoData) {
        // Store just the file ID for simplicity
        value = photoData.id || JSON.stringify(photoData);
      }
    }
    
    // Handle kodeProduksi
    if (header === 'kodeProduksi' || header === 'kode_produksi') {
      if (Array.isArray(record.kodeProduksi)) {
        value = JSON.stringify(record.kodeProduksi);
      } else {
        value = record.kodeProduksi || '';
      }
    }
    
    // Convert objects to JSON string
    if (value && typeof value === 'object') {
      value = JSON.stringify(value);
    }
    
    return value || '';
  });
  
  Logger.log('Adding row: ' + row.join(' | '));
  sheet.appendRow(row);
  
  return { success: true, message: 'Record berhasil ditambahkan', id: record.id };
}

// Update record - compatible with existing sheet structure
function updateRecord(id, recordData) {
  if (!id || !recordData) {
    return { success: false, error: 'Data tidak lengkap' };
  }
  
  Logger.log('Updating record: ' + id);
  Logger.log('Data: ' + JSON.stringify(recordData).substring(0, 500));
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  
  if (!sheet) {
    return { success: false, error: 'Sheet Records tidak ditemukan' };
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  
  if (idCol === -1) {
    return { success: false, error: 'Kolom id tidak ditemukan' };
  }
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      Logger.log('Found record at row ' + (i + 1));
      
      // Update each column
      headers.forEach((header, colIndex) => {
        if (header === 'id' || header === 'createdAt' || header === 'created_at') {
          return; // Don't update these
        }
        
        let value = recordData[header];
        
        // Try camelCase version
        if (value === undefined) {
          const camelKey = header.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          value = recordData[camelKey];
        }
        
        // Handle photo columns
        if (header.startsWith('photo_') && recordData.photos) {
          const photoType = header.replace('photo_', '');
          const mappedType = photoType === 'mbumbu' ? 'm-bumbu' : (photoType === 'etiketbanded' ? 'etiket-banded' : photoType);
          const photoData = recordData.photos[mappedType];
          if (photoData) {
            value = photoData.id || JSON.stringify(photoData);
          }
        }
        
        // Handle kodeProduksi
        if (header === 'kodeProduksi' || header === 'kode_produksi') {
          if (Array.isArray(recordData.kodeProduksi)) {
            value = JSON.stringify(recordData.kodeProduksi);
          }
        }
        
        // Set updatedAt
        if (header === 'updatedAt' || header === 'updated_at') {
          value = new Date().toISOString();
        }
        
        // Convert objects to JSON string
        if (value && typeof value === 'object') {
          value = JSON.stringify(value);
        }
        
        if (value !== undefined) {
          sheet.getRange(i + 1, colIndex + 1).setValue(value);
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
  
  Logger.log('Deleting record: ' + id);
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  
  if (!sheet) {
    return { success: false, error: 'Sheet Records tidak ditemukan' };
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  
  if (idCol === -1) {
    return { success: false, error: 'Kolom id tidak ditemukan' };
  }
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      Logger.log('Deleted row ' + (i + 1));
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
  
  Logger.log('Validating record: ' + id);
  Logger.log('Validation data: ' + JSON.stringify(validation));
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  
  if (!sheet) {
    return { success: false, error: 'Sheet Records tidak ditemukan' };
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  
  // Try both camelCase and snake_case column names
  let statusCol = headers.indexOf('validationStatus');
  if (statusCol === -1) statusCol = headers.indexOf('validation_status');
  
  let validatedByCol = headers.indexOf('validatedBy');
  if (validatedByCol === -1) validatedByCol = headers.indexOf('validated_by');
  
  let validatedAtCol = headers.indexOf('validatedAt');
  if (validatedAtCol === -1) validatedAtCol = headers.indexOf('validated_at');
  
  let reasonCol = headers.indexOf('validationReason');
  if (reasonCol === -1) reasonCol = headers.indexOf('validation_reason');
  
  Logger.log('Column indexes - status:' + statusCol + ', validatedBy:' + validatedByCol + ', validatedAt:' + validatedAtCol + ', reason:' + reasonCol);
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      Logger.log('Found record at row ' + (i + 1));
      
      if (statusCol >= 0) {
        sheet.getRange(i + 1, statusCol + 1).setValue(validation.status || 'valid');
        Logger.log('Set status: ' + (validation.status || 'valid'));
      }
      if (validatedByCol >= 0) {
        sheet.getRange(i + 1, validatedByCol + 1).setValue(validation.validatedBy || '');
        Logger.log('Set validatedBy: ' + (validation.validatedBy || ''));
      }
      if (validatedAtCol >= 0) {
        sheet.getRange(i + 1, validatedAtCol + 1).setValue(new Date().toISOString());
      }
      if (reasonCol >= 0) {
        sheet.getRange(i + 1, reasonCol + 1).setValue(validation.reason || '');
      }
      
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
  } else {
    // Fix existing Users sheet
    fixUsersSheet();
  }
  
  // Create Records sheet if not exists
  if (!ss.getSheetByName(SHEET_RECORDS)) {
    createRecordsSheet(ss);
    Logger.log('Records sheet created');
  }
  
  Logger.log('Database setup complete!');
}

// =====================================================
// FIX EXISTING USERS SHEET - Run this to add permissions column
// =====================================================
function fixUsersSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_USERS);
  
  if (!sheet) {
    Logger.log('Sheet Users tidak ditemukan!');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  Logger.log('Current headers: ' + headers.join(', '));
  
  // Check if permissions column exists
  let permCol = headers.indexOf('permissions');
  
  if (permCol === -1) {
    // Add permissions column
    const lastCol = headers.length + 1;
    sheet.getRange(1, lastCol).setValue('permissions');
    sheet.getRange(1, lastCol).setFontWeight('bold').setBackground('#4a90d9').setFontColor('white');
    permCol = lastCol - 1;
    Logger.log('Kolom permissions ditambahkan di kolom ' + lastCol);
    
    // Set default permissions based on role
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const roleCol = headers.indexOf('role');
      const role = roleCol >= 0 ? row[roleCol] : 'field';
      
      let defaultPerms = 'records_viewer';
      if (role === 'admin') {
        defaultPerms = 'user_admin|records_viewer|records_editor|records_validator';
      } else if (role === 'manager') {
        defaultPerms = 'records_viewer|records_editor|records_validator';
      } else if (role === 'supervisor') {
        defaultPerms = 'records_viewer|records_validator';
      } else if (role === 'field') {
        defaultPerms = 'records_viewer|records_editor';
      } else if (role === 'viewer') {
        defaultPerms = 'records_viewer';
      }
      
      sheet.getRange(i + 1, lastCol).setValue(defaultPerms);
      Logger.log('User ' + row[0] + ' (' + role + '): ' + defaultPerms);
    }
  } else {
    Logger.log('Kolom permissions sudah ada di posisi ' + (permCol + 1));
  }
  
  // Ensure role column exists and has correct values
  let roleCol = headers.indexOf('role');
  if (roleCol === -1) {
    Logger.log('PERINGATAN: Kolom role tidak ditemukan!');
  } else {
    // Check and fix role values
    for (let i = 1; i < data.length; i++) {
      const currentRole = data[i][roleCol];
      // Convert 'viewer' to 'field' or keep valid roles
      const validRoles = ['admin', 'manager', 'supervisor', 'field'];
      if (!validRoles.includes(currentRole)) {
        const newRole = currentRole === 'viewer' ? 'field' : 'field';
        sheet.getRange(i + 1, roleCol + 1).setValue(newRole);
        Logger.log('Role user ' + data[i][0] + ' diubah dari "' + currentRole + '" ke "' + newRole + '"');
      }
    }
  }
  
  sheet.autoResizeColumns(1, sheet.getLastColumn());
  Logger.log('Fix Users sheet selesai!');
}

// =====================================================
// MIGRATE DATA - Convert old structure to new
// =====================================================
function migrateUsersData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_USERS);
  
  if (!sheet) {
    Logger.log('Sheet Users tidak ditemukan!');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  Logger.log('=== MIGRASI DATA USERS ===');
  Logger.log('Headers saat ini: ' + headers.join(' | '));
  
  // Expected headers
  const expectedHeaders = ['nik', 'password', 'name', 'role', 'permissions'];
  
  // Check current structure
  Logger.log('');
  Logger.log('Struktur yang diharapkan: ' + expectedHeaders.join(' | '));
  Logger.log('');
  
  // Map current columns
  const colMap = {};
  headers.forEach((h, i) => {
    colMap[h.toLowerCase()] = i;
  });
  
  Logger.log('Mapping kolom:');
  Logger.log(JSON.stringify(colMap));
  
  // Check for permissions column
  if (!('permissions' in colMap)) {
    Logger.log('');
    Logger.log('>>> JALANKAN fixUsersSheet() untuk menambahkan kolom permissions');
  }
  
  Logger.log('');
  Logger.log('=== DATA USERS ===');
  for (let i = 1; i < data.length; i++) {
    Logger.log('Row ' + i + ': ' + data[i].join(' | '));
  }
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

// =====================================================
// TEST FUNCTIONS - Run these to verify setup
// =====================================================

function testAddRecord() {
  const testRecord = {
    id: 'TEST_' + Date.now(),
    tanggal: new Date().toISOString().split('T')[0],
    flavor: 'Test Flavor',
    negara: 'Indonesia',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'Test User',
    updatedBy: 'Test User',
    photos: {
      'bumbu': { id: 'test123', name: 'test.jpg' }
    },
    kodeProduksi: ['KODE001', 'KODE002']
  };
  
  Logger.log('Testing addRecord...');
  const result = addRecord(testRecord);
  Logger.log('Result: ' + JSON.stringify(result));
  return result;
}

function testGetAllRecords() {
  Logger.log('Testing getAllRecords...');
  const result = getAllRecords();
  Logger.log('Found ' + (result.records ? result.records.length : 0) + ' records');
  Logger.log('Result: ' + JSON.stringify(result).substring(0, 1000));
  return result;
}

// Alias for addRecord (handleAdd)
function handleAdd(record) {
  return addRecord(record);
}

// Test adding record from web
function testAddFromWeb() {
  const result = addRecord({
    tanggal: "2025-01-06",
    flavor: "TEST-WEB-" + Date.now(),
    negara: "Indonesia", 
    kodeProduksi: "TEST123",
    photo_bumbu: "https://example.com/photo.jpg"
  });
  Logger.log('Result: ' + JSON.stringify(result));
  return result;
}

function testCheckHeaders() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  
  if (!sheet) {
    Logger.log('Sheet Records tidak ditemukan!');
    return;
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Logger.log('Current headers in Records sheet:');
  headers.forEach((h, i) => {
    Logger.log((i + 1) + '. ' + h);
  });
  
  return headers;
}

// =====================================================
// FIX RECORDS SHEET - Add validation columns
// =====================================================
function fixRecordsSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  
  if (!sheet) {
    Logger.log('Sheet Records tidak ditemukan!');
    return;
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Logger.log('Current headers: ' + headers.join(', '));
  
  // Validation columns to add
  const validationColumns = [
    'validationStatus',
    'validatedBy', 
    'validatedAt',
    'validationReason'
  ];
  
  let lastCol = headers.length;
  let addedCount = 0;
  
  validationColumns.forEach(colName => {
    if (!headers.includes(colName)) {
      lastCol++;
      sheet.getRange(1, lastCol).setValue(colName);
      sheet.getRange(1, lastCol).setFontWeight('bold').setBackground('#4a90d9').setFontColor('white');
      Logger.log('✅ Kolom "' + colName + '" ditambahkan di kolom ' + lastCol);
      addedCount++;
      
      // Set default value 'pending' for validationStatus
      if (colName === 'validationStatus') {
        const dataRange = sheet.getDataRange();
        const numRows = dataRange.getNumRows();
        if (numRows > 1) {
          for (let i = 2; i <= numRows; i++) {
            sheet.getRange(i, lastCol).setValue('pending');
          }
          Logger.log('   Set default "pending" untuk ' + (numRows - 1) + ' rows');
        }
      }
    } else {
      Logger.log('ℹ️ Kolom "' + colName + '" sudah ada');
    }
  });
  
  if (addedCount > 0) {
    sheet.autoResizeColumns(1, sheet.getLastColumn());
    Logger.log('');
    Logger.log('✅ ' + addedCount + ' kolom validasi berhasil ditambahkan!');
  } else {
    Logger.log('');
    Logger.log('ℹ️ Semua kolom validasi sudah ada');
  }
  
  // Show final headers
  const finalHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Logger.log('');
  Logger.log('Final headers (' + finalHeaders.length + ' kolom):');
  finalHeaders.forEach((h, i) => {
    Logger.log((i + 1) + '. ' + h);
  });
}
