// =====================================================
// VALID DISPLAY - Google Apps Script untuk Google Sheets Database
// VERSI JSONP - Bypass CORS + User Management
// =====================================================
// 
// SHEETS:
// 1. Records - Data display produk
// 2. Users - Data user (NIK, password, name, role)
// =====================================================

// Spreadsheet ID - otomatis dari spreadsheet yang aktif
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getRecordsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Records');
  
  // Jika sheet "Records" belum ada, buat otomatis
  if (!sheet) {
    sheet = ss.insertSheet('Records');
    // Tambahkan header
    var headers = ['id', 'tanggal', 'flavor', 'negara', 'createdAt', 'updatedAt', 
                   'photo_bumbu', 'photo_mbumbu', 'photo_si', 'photo_karton',
                   'photo_etiket', 'photo_etiketbanded', 'photo_plakban', 'kodeProduksi'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    // Format header
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

// Get or create Users sheet
function getUsersSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Users');
  
  // Jika sheet "Users" belum ada, buat otomatis dengan default users
  if (!sheet) {
    sheet = ss.insertSheet('Users');
    var headers = ['nik', 'password', 'name', 'role', 'createdAt', 'updatedAt'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // Add default users
    var defaultUsers = [
      ['50086913', 'Ind0f00d25', 'Admin User', 'admin', new Date().toISOString(), new Date().toISOString()],
      ['12345678', 'viewer123', 'Viewer User', 'viewer', new Date().toISOString(), new Date().toISOString()],
      ['11111111', 'lihat123', 'Staff View', 'viewer', new Date().toISOString(), new Date().toISOString()]
    ];
    sheet.getRange(2, 1, defaultUsers.length, defaultUsers[0].length).setValues(defaultUsers);
  }
  
  return sheet;
}

// Handle GET requests - dengan JSONP support
function doGet(e) {
  try {
    const action = e.parameter.action || 'getAll';
    const callback = e.parameter.callback; // JSONP callback
    
    var result;
    
    // Records actions
    if (action === 'getAll') {
      result = getAllRecordsData();
    } else if (action === 'get') {
      const id = e.parameter.id;
      result = getRecordByIdData(id);
    } 
    // User actions
    else if (action === 'getUsers') {
      result = getAllUsersData();
    } else if (action === 'login') {
      const nik = e.parameter.nik;
      const password = e.parameter.password;
      result = loginUser(nik, password);
    } else if (action === 'getUser') {
      const nik = e.parameter.nik;
      result = getUserByNik(nik);
    } else {
      result = { success: false, error: 'Invalid action' };
    }
    
    // Return JSONP jika callback ada, otherwise JSON biasa
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(result) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    const errorResult = { success: false, error: error.message };
    const callback = e.parameter.callback;
    
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(errorResult) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify(errorResult))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
}

// Handle POST requests
function doPost(e) {
  try {
    var data;
    
    // Handle form data atau JSON
    if (e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    } else if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      throw new Error('No data received');
    }
    
    const action = data.action;
    var result;
    
    // Records actions
    if (action === 'add') {
      result = addRecordData(data.record);
    } else if (action === 'update') {
      result = updateRecordData(data.recordId, data.record);
    } else if (action === 'delete') {
      result = deleteRecordData(data.recordId);
    } 
    // User actions
    else if (action === 'addUser') {
      result = addUserData(data.user);
    } else if (action === 'updateUser') {
      result = updateUserData(data.nik, data.user);
    } else if (action === 'deleteUser') {
      result = deleteUserData(data.nik);
    } else {
      result = { success: false, error: 'Invalid action' };
    }
    
    // Return HTML dengan postMessage untuk komunikasi ke parent window
    const callback = data.callback;
    if (callback) {
      const html = '<html><body><script>' +
        'var result = ' + JSON.stringify(result) + ';' +
        'result.callbackName = "' + callback + '";' +
        'if (window.parent && window.parent.postMessage) {' +
        '  window.parent.postMessage(JSON.stringify(result), "*");' +
        '}' +
        '</script></body></html>';
      return HtmlService.createHtmlOutput(html);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    const errorResult = { success: false, error: error.message };
    return ContentService
      .createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =====================================================
// USER MANAGEMENT FUNCTIONS
// =====================================================

// Login user - verify credentials
function loginUser(nik, password) {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == nik && data[i][1] == password) {
      return { 
        success: true, 
        user: {
          nik: data[i][0],
          name: data[i][2],
          role: data[i][3]
        }
      };
    }
  }
  return { success: false, error: 'NIK atau password salah' };
}

// Get all users
function getAllUsersData() {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return { success: true, users: [] };
  }
  
  var users = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0]) {
      users.push({
        nik: row[0],
        password: row[1], // Include password for admin view
        name: row[2],
        role: row[3],
        createdAt: row[4],
        updatedAt: row[5]
      });
    }
  }
  
  return { success: true, users: users };
}

// Get user by NIK
function getUserByNik(nik) {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == nik) {
      return { 
        success: true, 
        user: {
          nik: data[i][0],
          name: data[i][2],
          role: data[i][3]
        }
      };
    }
  }
  return { success: false, error: 'User not found' };
}

// Add new user
function addUserData(user) {
  var sheet = getUsersSheet();
  
  // Check if NIK already exists
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == user.nik) {
      return { success: false, error: 'NIK sudah terdaftar' };
    }
  }
  
  var row = [
    user.nik,
    user.password,
    user.name,
    user.role || 'viewer',
    new Date().toISOString(),
    new Date().toISOString()
  ];
  
  sheet.appendRow(row);
  return { success: true, message: 'User berhasil ditambahkan', nik: user.nik };
}

// Update user
function updateUserData(nik, updatedUser) {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == nik) {
      var row = [
        nik, // NIK tidak bisa diubah
        updatedUser.password || data[i][1],
        updatedUser.name || data[i][2],
        updatedUser.role || data[i][3],
        data[i][4], // Keep original createdAt
        new Date().toISOString()
      ];
      
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return { success: true, message: 'User berhasil diupdate' };
    }
  }
  
  return { success: false, error: 'User not found' };
}

// Delete user
function deleteUserData(nik) {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  
  // Prevent deleting last admin
  var adminCount = 0;
  var targetRow = -1;
  var targetIsAdmin = false;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][3] === 'admin') adminCount++;
    if (data[i][0] == nik) {
      targetRow = i + 1;
      targetIsAdmin = data[i][3] === 'admin';
    }
  }
  
  if (targetRow === -1) {
    return { success: false, error: 'User not found' };
  }
  
  if (targetIsAdmin && adminCount <= 1) {
    return { success: false, error: 'Tidak bisa menghapus admin terakhir' };
  }
  
  sheet.deleteRow(targetRow);
  return { success: true, message: 'User berhasil dihapus' };
}

// Add new record - returns data object
function addRecordData(record) {
  const sheet = getRecordsSheet();
  
  const row = [
    record.id,
    record.tanggal,
    record.flavor,
    record.negara,
    record.createdAt || new Date().toISOString(),
    record.updatedAt || new Date().toISOString(),
    record.photos?.bumbu ? JSON.stringify(record.photos.bumbu) : '',
    record.photos?.['m-bumbu'] ? JSON.stringify(record.photos['m-bumbu']) : '',
    record.photos?.si ? JSON.stringify(record.photos.si) : '',
    record.photos?.karton ? JSON.stringify(record.photos.karton) : '',
    record.photos?.etiket ? JSON.stringify(record.photos.etiket) : '',
    record.photos?.['etiket-banded'] ? JSON.stringify(record.photos['etiket-banded']) : '',
    record.photos?.plakban ? JSON.stringify(record.photos.plakban) : '',
    record.kodeProduksi ? JSON.stringify(record.kodeProduksi) : '[]'
  ];
  
  sheet.appendRow(row);
  
  return { success: true, message: 'Record added', id: record.id };
}

// Update record - returns data object
function updateRecordData(recordId, updatedRecord) {
  const sheet = getRecordsSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === recordId) {
      const rowIndex = i + 1; // 1-indexed
      
      const row = [
        recordId,
        updatedRecord.tanggal || data[i][1],
        updatedRecord.flavor || data[i][2],
        updatedRecord.negara || data[i][3],
        data[i][4], // keep original createdAt
        new Date().toISOString(), // update updatedAt
        updatedRecord.photos?.bumbu ? JSON.stringify(updatedRecord.photos.bumbu) : data[i][6],
        updatedRecord.photos?.['m-bumbu'] ? JSON.stringify(updatedRecord.photos['m-bumbu']) : data[i][7],
        updatedRecord.photos?.si ? JSON.stringify(updatedRecord.photos.si) : data[i][8],
        updatedRecord.photos?.karton ? JSON.stringify(updatedRecord.photos.karton) : data[i][9],
        updatedRecord.photos?.etiket ? JSON.stringify(updatedRecord.photos.etiket) : data[i][10],
        updatedRecord.photos?.['etiket-banded'] ? JSON.stringify(updatedRecord.photos['etiket-banded']) : data[i][11],
        updatedRecord.photos?.plakban ? JSON.stringify(updatedRecord.photos.plakban) : data[i][12],
        updatedRecord.kodeProduksi ? JSON.stringify(updatedRecord.kodeProduksi) : data[i][13]
      ];
      
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
      
      return { success: true, message: 'Record updated' };
    }
  }
  
  return { success: false, error: 'Record not found' };
}

// Delete record - returns data object
function deleteRecordData(recordId) {
  const sheet = getRecordsSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === recordId) {
      sheet.deleteRow(i + 1); // 1-indexed
      return { success: true, message: 'Record deleted' };
    }
  }
  
  return { success: false, error: 'Record not found' };
}

// Test function
function testGetAll() {
  const result = getAllRecordsData();
  Logger.log(JSON.stringify(result));
}
