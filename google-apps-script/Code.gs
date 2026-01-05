// =====================================================
// VALID DISPLAY - Google Apps Script untuk Google Sheets Database
// VERSI JSONP - Bypass CORS + User Management
// =====================================================
// 
// SHEETS:
// 1. Records - Data display produk (16 kolom)
// 2. Users - Data user (NIK, password, name, role)
//
// STRUKTUR RECORDS (16 kolom):
// A:id, B:tanggal, C:flavor, D:negara, E:createdAt, F:updatedAt,
// G:createdBy, H:updatedBy,
// I:photo_bumbu, J:photo_mbumbu, K:photo_si, L:photo_karton,
// M:photo_etiket, N:photo_etiketbanded, O:photo_plakban, P:kodeProduksi
// =====================================================

// Header yang benar untuk Records (16 kolom dengan createdBy/updatedBy)
var CORRECT_HEADERS = ['id', 'tanggal', 'flavor', 'negara', 'createdAt', 'updatedAt', 
                       'createdBy', 'updatedBy',
                       'photo_bumbu', 'photo_mbumbu', 'photo_si', 'photo_karton',
                       'photo_etiket', 'photo_etiketbanded', 'photo_plakban', 'kodeProduksi'];

// Spreadsheet ID - otomatis dari spreadsheet yang aktif
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

// Fungsi untuk memperbaiki struktur sheet Records - JALANKAN INI DULU!
function fixRecordsStructure() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Records');
  
  if (!sheet) {
    // Buat sheet baru dengan struktur yang benar
    sheet = ss.insertSheet('Records');
    sheet.getRange(1, 1, 1, CORRECT_HEADERS.length).setValues([CORRECT_HEADERS]);
    sheet.getRange(1, 1, 1, CORRECT_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return { success: true, message: 'Sheet Records dibuat baru dengan struktur yang benar' };
  }
  
  // Perbaiki header dulu
  sheet.getRange(1, 1, 1, CORRECT_HEADERS.length).setValues([CORRECT_HEADERS]);
  sheet.getRange(1, 1, 1, CORRECT_HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  return { success: true, message: 'Header diperbaiki. Jalankan migrateOldData() untuk migrasi data lama.' };
}

// FUNGSI MIGRASI DATA - Jalankan ini untuk memperbaiki data lama dari 14 kolom ke 16 kolom
function migrateOldData() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Records');
  
  if (!sheet) {
    return { success: false, error: 'Sheet Records tidak ditemukan' };
  }
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: true, message: 'Tidak ada data untuk dimigrasi' };
  }
  
  var migratedCount = 0;
  
  // Loop setiap baris data (mulai dari baris 2)
  for (var i = 2; i <= lastRow; i++) {
    var row = sheet.getRange(i, 1, 1, 16).getValues()[0];
    var cellG = String(row[6]); // Kolom G (index 6)
    
    // Cek apakah kolom G berisi data foto (struktur lama) atau createdBy (struktur baru)
    // Data foto biasanya dimulai dengan '{' atau kosong, createdBy berisi nama atau kosong
    if (cellG.startsWith('{') || cellG.startsWith('[')) {
      // Ini data struktur lama - perlu migrasi
      // Struktur lama: id, tanggal, flavor, negara, createdAt, updatedAt, photo_bumbu, photo_mbumbu, photo_si, photo_karton, photo_etiket, photo_etiketbanded, photo_plakban, kodeProduksi
      // Struktur baru: id, tanggal, flavor, negara, createdAt, updatedAt, createdBy, updatedBy, photo_bumbu, photo_mbumbu, photo_si, photo_karton, photo_etiket, photo_etiketbanded, photo_plakban, kodeProduksi
      
      var oldData = sheet.getRange(i, 1, 1, 14).getValues()[0];
      
      var newRow = [
        oldData[0],  // id
        oldData[1],  // tanggal
        oldData[2],  // flavor
        oldData[3],  // negara
        oldData[4],  // createdAt
        oldData[5],  // updatedAt
        '',          // createdBy (baru - kosong)
        '',          // updatedBy (baru - kosong)
        oldData[6],  // photo_bumbu (dari kolom G lama)
        oldData[7],  // photo_mbumbu (dari kolom H lama)
        oldData[8],  // photo_si (dari kolom I lama)
        oldData[9],  // photo_karton (dari kolom J lama)
        oldData[10], // photo_etiket (dari kolom K lama)
        oldData[11], // photo_etiketbanded (dari kolom L lama)
        oldData[12], // photo_plakban (dari kolom M lama)
        oldData[13]  // kodeProduksi (dari kolom N lama)
      ];
      
      // Update baris dengan data yang sudah dimigrasi
      sheet.getRange(i, 1, 1, 16).setValues([newRow]);
      migratedCount++;
      
      Logger.log('Migrated row ' + i + ': ' + oldData[0]);
    }
  }
  
  return { 
    success: true, 
    message: 'Migrasi selesai. ' + migratedCount + ' baris data berhasil dimigrasi ke struktur baru.' 
  };
}

// Fungsi untuk menghapus semua data dan memulai dari awal (HATI-HATI!)
function resetRecordsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Records');
  
  if (sheet) {
    // Hapus sheet lama
    ss.deleteSheet(sheet);
  }
  
  // Buat sheet baru
  sheet = ss.insertSheet('Records');
  sheet.getRange(1, 1, 1, CORRECT_HEADERS.length).setValues([CORRECT_HEADERS]);
  sheet.getRange(1, 1, 1, CORRECT_HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  return { success: true, message: 'Sheet Records berhasil direset dengan struktur baru' };
}

function getRecordsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Records');
  
  // Jika sheet "Records" belum ada, buat otomatis
  if (!sheet) {
    sheet = ss.insertSheet('Records');
    sheet.getRange(1, 1, 1, CORRECT_HEADERS.length).setValues([CORRECT_HEADERS]);
    sheet.getRange(1, 1, 1, CORRECT_HEADERS.length).setFontWeight('bold');
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
    } else if (action === 'fixStructure') {
      // Action untuk memperbaiki struktur
      result = fixRecordsStructure();
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

// =====================================================
// RECORDS MANAGEMENT FUNCTIONS
// =====================================================

// Get all records
// Struktur 16 kolom: id(0), tanggal(1), flavor(2), negara(3), createdAt(4), updatedAt(5),
//                    createdBy(6), updatedBy(7),
//                    photo_bumbu(8), photo_mbumbu(9), photo_si(10), photo_karton(11),
//                    photo_etiket(12), photo_etiketbanded(13), photo_plakban(14), kodeProduksi(15)
function getAllRecordsData() {
  const sheet = getRecordsSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return { success: true, records: [] };
  }
  
  const records = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // Jika ada ID
      records.push({
        id: row[0],
        tanggal: row[1],
        flavor: row[2],
        negara: row[3],
        createdAt: row[4],
        updatedAt: row[5],
        createdBy: row[6] || '',
        updatedBy: row[7] || '',
        photos: {
          bumbu: row[8] ? safeJsonParse(row[8]) : null,
          'm-bumbu': row[9] ? safeJsonParse(row[9]) : null,
          si: row[10] ? safeJsonParse(row[10]) : null,
          karton: row[11] ? safeJsonParse(row[11]) : null,
          etiket: row[12] ? safeJsonParse(row[12]) : null,
          'etiket-banded': row[13] ? safeJsonParse(row[13]) : null,
          plakban: row[14] ? safeJsonParse(row[14]) : null
        },
        kodeProduksi: row[15] ? safeJsonParse(row[15]) : []
      });
    }
  }
  
  return { success: true, records: records };
}

// Safe JSON parse
function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

// Get record by ID
function getRecordByIdData(id) {
  const sheet = getRecordsSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      const row = data[i];
      return { 
        success: true, 
        record: {
          id: row[0],
          tanggal: row[1],
          flavor: row[2],
          negara: row[3],
          createdAt: row[4],
          updatedAt: row[5],
          createdBy: row[6] || '',
          updatedBy: row[7] || '',
          photos: {
            bumbu: row[8] ? safeJsonParse(row[8]) : null,
            'm-bumbu': row[9] ? safeJsonParse(row[9]) : null,
            si: row[10] ? safeJsonParse(row[10]) : null,
            karton: row[11] ? safeJsonParse(row[11]) : null,
            etiket: row[12] ? safeJsonParse(row[12]) : null,
            'etiket-banded': row[13] ? safeJsonParse(row[13]) : null,
            plakban: row[14] ? safeJsonParse(row[14]) : null
          },
          kodeProduksi: row[15] ? safeJsonParse(row[15]) : []
        }
      };
    }
  }
  
  return { success: false, error: 'Record not found' };
}

// Add new record - returns data object
// Struktur 16 kolom: id, tanggal, flavor, negara, createdAt, updatedAt, createdBy, updatedBy,
//                    photo_bumbu, photo_mbumbu, photo_si, photo_karton,
//                    photo_etiket, photo_etiketbanded, photo_plakban, kodeProduksi
function addRecordData(record) {
  const sheet = getRecordsSheet();
  
  const row = [
    record.id,
    record.tanggal,
    record.flavor,
    record.negara,
    record.createdAt || new Date().toISOString(),
    record.updatedAt || new Date().toISOString(),
    record.createdBy || '',
    record.updatedBy || '',
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
// Struktur 16 kolom: id(0), tanggal(1), flavor(2), negara(3), createdAt(4), updatedAt(5),
//                    createdBy(6), updatedBy(7),
//                    photo_bumbu(8), photo_mbumbu(9), photo_si(10), photo_karton(11),
//                    photo_etiket(12), photo_etiketbanded(13), photo_plakban(14), kodeProduksi(15)
function updateRecordData(recordId, updatedRecord) {
  const sheet = getRecordsSheet();
  const data = sheet.getDataRange().getValues();
  
  Logger.log('=== UPDATE RECORD START ===');
  Logger.log('Looking for recordId: ' + recordId);
  Logger.log('recordId type: ' + typeof recordId);
  Logger.log('Total rows: ' + data.length);
  Logger.log('Full updatedRecord: ' + JSON.stringify(updatedRecord));
  
  for (let i = 1; i < data.length; i++) {
    Logger.log('Checking row ' + i + ', ID: ' + data[i][0] + ' (type: ' + typeof data[i][0] + ')');
    
    // Compare as strings to handle type mismatch
    if (String(data[i][0]) === String(recordId)) {
      const rowIndex = i + 1; // 1-indexed
      
      // Log untuk debugging
      Logger.log('✅ Found record at row: ' + rowIndex);
      Logger.log('Updated photos object: ' + JSON.stringify(updatedRecord.photos));
      
      // Check each photo field
      Logger.log('photos.bumbu: ' + JSON.stringify(updatedRecord.photos?.bumbu));
      Logger.log('photos.m-bumbu: ' + JSON.stringify(updatedRecord.photos?.['m-bumbu']));
      Logger.log('photos.si: ' + JSON.stringify(updatedRecord.photos?.si));
      Logger.log('photos.karton: ' + JSON.stringify(updatedRecord.photos?.karton));
      Logger.log('photos.etiket: ' + JSON.stringify(updatedRecord.photos?.etiket));
      Logger.log('photos.etiket-banded: ' + JSON.stringify(updatedRecord.photos?.['etiket-banded']));
      Logger.log('photos.plakban: ' + JSON.stringify(updatedRecord.photos?.plakban));
      
      const row = [
        recordId,
        updatedRecord.tanggal || data[i][1],
        updatedRecord.flavor || data[i][2],
        updatedRecord.negara || data[i][3],
        data[i][4], // keep original createdAt
        new Date().toISOString(), // update updatedAt
        data[i][6] || '', // keep original createdBy
        updatedRecord.updatedBy || data[i][7] || '', // update updatedBy
        updatedRecord.photos?.bumbu ? JSON.stringify(updatedRecord.photos.bumbu) : (data[i][8] || ''),
        updatedRecord.photos?.['m-bumbu'] ? JSON.stringify(updatedRecord.photos['m-bumbu']) : (data[i][9] || ''),
        updatedRecord.photos?.si ? JSON.stringify(updatedRecord.photos.si) : (data[i][10] || ''),
        updatedRecord.photos?.karton ? JSON.stringify(updatedRecord.photos.karton) : (data[i][11] || ''),
        updatedRecord.photos?.etiket ? JSON.stringify(updatedRecord.photos.etiket) : (data[i][12] || ''),
        updatedRecord.photos?.['etiket-banded'] ? JSON.stringify(updatedRecord.photos['etiket-banded']) : (data[i][13] || ''),
        updatedRecord.photos?.plakban ? JSON.stringify(updatedRecord.photos.plakban) : (data[i][14] || ''),
        updatedRecord.kodeProduksi ? JSON.stringify(updatedRecord.kodeProduksi) : (data[i][15] || '[]')
      ];
      
      Logger.log('Row to save (16 columns): ' + JSON.stringify(row));
      Logger.log('Row length: ' + row.length);
      
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
      
      Logger.log('✅ Record updated successfully at row ' + rowIndex);
      Logger.log('=== UPDATE RECORD END ===');
      return { success: true, message: 'Record updated', rowIndex: rowIndex };
    }
  }
  
  Logger.log('❌ Record not found: ' + recordId);
  Logger.log('=== UPDATE RECORD END (NOT FOUND) ===');
  return { success: false, error: 'Record not found: ' + recordId };
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
