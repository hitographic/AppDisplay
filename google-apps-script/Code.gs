// =====================================================
// VALID DISPLAY - Google Apps Script untuk Google Sheets Database
// VERSI JSONP - Bypass CORS + User Management
// =====================================================
// 
// SHEETS:
// 1. Records - Data display produk (22 kolom)
// 2. Users - Data user (NIK, password, name, role)
//
// STRUKTUR RECORDS (23 kolom):
// A:id, B:tanggal, C:flavor, D:nomorMaterial, E:negara, F:distributor, G:createdAt, H:updatedAt,
// I:createdBy, J:updatedBy,
// K:photo_bumbu, L:photo_mbumbu, M:photo_si, N:photo_kartonDepan, O:photo_kartonBelakang,
// P:photo_etiket, Q:photo_etiketbanded, R:photo_plakban, S:kodeProduksi,
// T:validationStatus, U:validatedBy, V:validatedAt, W:validationReason
// =====================================================

// Header yang benar untuk Records (23 kolom)
var CORRECT_HEADERS = ['id', 'tanggal', 'flavor', 'nomorMaterial', 'negara', 'distributor', 'createdAt', 'updatedAt', 
                       'createdBy', 'updatedBy',
                       'photo_bumbu', 'photo_mbumbu', 'photo_si', 'photo_kartonDepan', 'photo_kartonBelakang',
                       'photo_etiket', 'photo_etiketbanded', 'photo_plakban', 'kodeProduksi',
                       'validationStatus', 'validatedBy', 'validatedAt', 'validationReason'];

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
    var headers = ['nik', 'password', 'name', 'role', 'permissions', 'createdAt', 'updatedAt'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // Add default users
    var defaultUsers = [
      ['50086913', 'Ind0f00d25', 'Admin User', 'admin', 'user_admin|records_viewer|records_editor|records_validator', new Date().toISOString(), new Date().toISOString()],
      ['12345678', 'viewer123', 'Viewer User', 'field', 'records_viewer', new Date().toISOString(), new Date().toISOString()],
      ['11111111', 'lihat123', 'Staff View', 'supervisor', 'records_viewer|records_validator', new Date().toISOString(), new Date().toISOString()]
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
    
    // Parse data parameter if exists (for write operations via JSONP)
    var data = null;
    if (e.parameter.data) {
      try {
        data = JSON.parse(e.parameter.data);
      } catch (parseError) {
        // Ignore parse error, data remains null
      }
    }
    
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
    // Write operations via JSONP (bypass CORS)
    else if (action === 'add' && data && data.record) {
      result = addRecordData(data.record);
    } else if (action === 'update' && data && data.recordId) {
      result = updateRecordData(data.recordId, data.record);
    } else if (action === 'delete' && data && data.recordId) {
      result = deleteRecordData(data.recordId);
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
    }
    // User write operations via JSONP
    else if (action === 'addUser' && data && data.user) {
      result = addUserData(data.user);
    } else if (action === 'updateUser' && data && data.nik) {
      result = updateUserData(data.nik, data.user);
    } else if (action === 'deleteUser' && data && data.nik) {
      result = deleteUserData(data.nik);
    }
    // Master Data actions
    else if (action === 'getMaster') {
      result = getAllMasterData();
    } else if (action === 'getMasterByFlavor') {
      const flavor = e.parameter.flavor;
      result = getMasterByFlavor(flavor);
    }
    // Master write operations via JSONP
    else if (action === 'addMaster' && data && data.master) {
      result = addMasterData(data.master);
    } else if (action === 'updateMaster' && data && data.masterId) {
      result = updateMasterData(data.masterId, data.master);
    } else if (action === 'deleteMaster' && data && data.masterId) {
      result = deleteMasterData(data.masterId);
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
    }
    // Master Data actions
    else if (action === 'addMaster') {
      result = addMasterData(data.master);
    } else if (action === 'updateMaster') {
      result = updateMasterData(data.masterId, data.master);
    } else if (action === 'deleteMaster') {
      result = deleteMasterData(data.masterId);
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
      // Parse permissions
      var permissionsStr = data[i][4] ? String(data[i][4]).trim() : '';
      var permissions = [];
      if (permissionsStr) {
        permissions = permissionsStr.split('|').map(function(p) { return p.trim(); }).filter(function(p) { return p.length > 0; });
      }
      
      return { 
        success: true, 
        user: {
          nik: data[i][0],
          name: data[i][2],
          role: data[i][3],
          permissions: permissions
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
      // Parse permissions from pipe-separated string (e.g., "perm1|perm2|perm3")
      var permissionsStr = row[4] ? String(row[4]).trim() : '';
      var permissions = [];
      if (permissionsStr) {
        permissions = permissionsStr.split('|').map(function(p) { return p.trim(); }).filter(function(p) { return p.length > 0; });
      }
      
      users.push({
        nik: row[0],
        password: row[1], // Include password for admin view
        name: row[2],
        role: row[3],
        permissions: permissions,
        createdAt: row[5],
        updatedAt: row[6]
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
      // Parse permissions
      var permissionsStr = data[i][4] ? String(data[i][4]).trim() : '';
      var permissions = [];
      if (permissionsStr) {
        permissions = permissionsStr.split('|').map(function(p) { return p.trim(); }).filter(function(p) { return p.length > 0; });
      }
      
      return { 
        success: true, 
        user: {
          nik: data[i][0],
          name: data[i][2],
          role: data[i][3],
          permissions: permissions
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
  
  // Convert permissions array to pipe-separated string
  var permissionsStr = '';
  if (user.permissions && Array.isArray(user.permissions)) {
    permissionsStr = user.permissions.join('|');
  }
  
  var row = [
    user.nik,
    user.password,
    user.name,
    user.role || 'field',
    permissionsStr,
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
      // Convert permissions array to pipe-separated string
      var permissionsStr = '';
      if (updatedUser.permissions && Array.isArray(updatedUser.permissions)) {
        permissionsStr = updatedUser.permissions.join('|');
      } else if (data[i][4]) {
        permissionsStr = String(data[i][4]);
      }
      
      var row = [
        nik, // NIK tidak bisa diubah
        updatedUser.password || data[i][1],
        updatedUser.name || data[i][2],
        updatedUser.role || data[i][3],
        permissionsStr,
        data[i][5], // Keep original createdAt
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

// Mapping kolom foto ke folder Google Drive
// PENTING: Ganti FOLDER_ID dengan ID folder sebenarnya di Google Drive Anda
var PHOTO_FOLDER_IDS = {
  photo_bumbu: null,       // Folder "Bumbu" - akan diisi otomatis atau manual
  photo_mbumbu: null,      // Folder "Minyak Bumbu"
  photo_si: null,          // Folder "Kode SI"
  photo_kartonDepan: null, // Folder "Kode Karton/Depan"
  photo_kartonBelakang: null, // Folder "Kode Karton/Belakang"
  photo_etiket: null,      // Folder "Kode Etiket"
  photo_etiketbanded: null,// Folder "Five or Six in One"
  photo_plakban: null      // Folder "Plakban"
};

// Nama folder di Google Drive untuk setiap kolom foto
var PHOTO_FOLDER_NAMES = {
  photo_bumbu: 'Bumbu',
  photo_mbumbu: 'Minyak Bumbu',
  photo_si: 'Kode SI',
  photo_kartonDepan: 'Kode Karton/Depan',
  photo_kartonBelakang: 'Kode Karton/Belakang',
  photo_etiket: 'Kode Etiket',
  photo_etiketbanded: 'Five or Six in One',
  photo_plakban: 'Plakban'
};

// ID folder utama AppDisplay_Data (ambil dari config atau hardcode)
var MAIN_FOLDER_ID = '1oVQJZfkorSrsSd49CPzRsmAybUHX7J23';

// Cache folder IDs untuk performa
var folderIdCache = {};

// Fungsi untuk mendapatkan ID folder berdasarkan nama
// Support subfolder dengan format "ParentFolder/SubFolder"
function getFolderIdByName(folderName) {
  if (folderIdCache[folderName]) {
    return folderIdCache[folderName];
  }
  
  try {
    var mainFolder = DriveApp.getFolderById(MAIN_FOLDER_ID);
    
    // Check if folderName contains subfolder (e.g., "Kode Karton/Depan")
    if (folderName.includes('/')) {
      var parts = folderName.split('/');
      var currentFolder = mainFolder;
      
      for (var i = 0; i < parts.length; i++) {
        var folders = currentFolder.getFoldersByName(parts[i]);
        if (folders.hasNext()) {
          currentFolder = folders.next();
        } else {
          return null;
        }
      }
      
      folderIdCache[folderName] = currentFolder.getId();
      return currentFolder.getId();
    }
    
    // Simple folder name (no subfolder)
    var folders = mainFolder.getFoldersByName(folderName);
    if (folders.hasNext()) {
      var folder = folders.next();
      folderIdCache[folderName] = folder.getId();
      return folder.getId();
    }
  } catch (e) {
    Logger.log('Error getting folder: ' + e.message);
  }
  return null;
}

// Fungsi untuk mencari file di folder berdasarkan nama (dengan atau tanpa ekstensi)
function findFileInFolder(folderName, fileName) {
  if (!fileName || fileName.trim() === '') return null;
  
  var folderId = getFolderIdByName(folderName);
  if (!folderId) return null;
  
  try {
    var folder = DriveApp.getFolderById(folderId);
    var files = folder.getFiles();
    
    // Normalisasi nama file (hapus ekstensi jika ada)
    var searchName = fileName.trim();
    var searchNameNoExt = searchName.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
    
    while (files.hasNext()) {
      var file = files.next();
      var name = file.getName();
      var nameNoExt = name.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
      
      // Cocokkan nama dengan atau tanpa ekstensi (case-insensitive)
      if (name.toLowerCase() === searchName.toLowerCase() || 
          nameNoExt.toLowerCase() === searchNameNoExt.toLowerCase()) {
        return {
          id: file.getId(),
          name: file.getName(),
          directLink: 'https://lh3.googleusercontent.com/d/' + file.getId()
        };
      }
    }
  } catch (e) {
    Logger.log('Error finding file: ' + e.message);
  }
  return null;
}

// Parse photo value - bisa JSON object atau nama file string
function parsePhotoValue(value, photoKey) {
  if (!value || value === '') return null;
  
  var strValue = String(value).trim();
  
  // Coba parse sebagai JSON dulu
  try {
    var parsed = JSON.parse(strValue);
    if (parsed && typeof parsed === 'object' && parsed.id) {
      return parsed;
    }
  } catch (e) {
    // Bukan JSON, lanjut ke nama file
  }
  
  // Jika bukan JSON, anggap sebagai nama file dan cari di folder
  var folderName = PHOTO_FOLDER_NAMES[photoKey];
  if (folderName) {
    var fileData = findFileInFolder(folderName, strValue);
    if (fileData) {
      return fileData;
    }
    // Jika tidak ketemu, return object dengan nama saja
    return { name: strValue, id: null, directLink: null };
  }
  
  return null;
}

// Get all records
// Struktur 23 kolom: id(0), tanggal(1), flavor(2), nomorMaterial(3), negara(4), distributor(5), createdAt(6), updatedAt(7),
//                    createdBy(8), updatedBy(9),
//                    photo_bumbu(10), photo_mbumbu(11), photo_si(12), photo_kartonDepan(13), photo_kartonBelakang(14),
//                    photo_etiket(15), photo_etiketbanded(16), photo_plakban(17), kodeProduksi(18),
//                    validationStatus(19), validatedBy(20), validatedAt(21), validationReason(22)
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
        nomorMaterial: row[3] || '',
        negara: row[4],
        distributor: row[5] || '',
        createdAt: row[6],
        updatedAt: row[7],
        createdBy: row[8] || '',
        updatedBy: row[9] || '',
        photos: {
          bumbu: parsePhotoValue(row[10], 'photo_bumbu'),
          'm-bumbu': parsePhotoValue(row[11], 'photo_mbumbu'),
          si: parsePhotoValue(row[12], 'photo_si'),
          'karton-depan': parsePhotoValue(row[13], 'photo_kartonDepan'),
          'karton-belakang': parsePhotoValue(row[14], 'photo_kartonBelakang'),
          etiket: parsePhotoValue(row[15], 'photo_etiket'),
          'etiket-banded': parsePhotoValue(row[16], 'photo_etiketbanded'),
          plakban: parsePhotoValue(row[17], 'photo_plakban')
        },
        kodeProduksi: row[18] ? safeJsonParse(row[18]) : [],
        validationStatus: row[19] || '',
        validatedBy: row[20] || '',
        validatedAt: row[21] || '',
        validationReason: row[22] || ''
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
          nomorMaterial: row[3] || '',
          negara: row[4],
          distributor: row[5] || '',
          createdAt: row[6],
          updatedAt: row[7],
          createdBy: row[8] || '',
          updatedBy: row[9] || '',
          photos: {
            bumbu: parsePhotoValue(row[10], 'photo_bumbu'),
            'm-bumbu': parsePhotoValue(row[11], 'photo_mbumbu'),
            si: parsePhotoValue(row[12], 'photo_si'),
            'karton-depan': parsePhotoValue(row[13], 'photo_kartonDepan'),
            'karton-belakang': parsePhotoValue(row[14], 'photo_kartonBelakang'),
            etiket: parsePhotoValue(row[15], 'photo_etiket'),
            'etiket-banded': parsePhotoValue(row[16], 'photo_etiketbanded'),
            plakban: parsePhotoValue(row[17], 'photo_plakban')
          },
          kodeProduksi: row[18] ? safeJsonParse(row[18]) : [],
          validationStatus: row[19] || '',
          validatedBy: row[20] || '',
          validatedAt: row[21] || '',
          validationReason: row[22] || ''
        }
      };
    }
  }
  
  return { success: false, error: 'Record not found' };
}

// Add new record - returns data object
// Struktur 23 kolom: id, tanggal, flavor, nomorMaterial, negara, distributor, createdAt, updatedAt, createdBy, updatedBy,
//                    photo_bumbu, photo_mbumbu, photo_si, photo_kartonDepan, photo_kartonBelakang,
//                    photo_etiket, photo_etiketbanded, photo_plakban, kodeProduksi,
//                    validationStatus, validatedBy, validatedAt, validationReason
function addRecordData(record) {
  const sheet = getRecordsSheet();
  
  // Helper to get photo name (string only, no JSON)
  function getPhotoName(photo) {
    if (!photo) return '';
    if (typeof photo === 'string') return photo;
    if (typeof photo === 'object' && photo.name) {
      // Remove extension if present
      return photo.name.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
    }
    return '';
  }
  
  const row = [
    record.id,
    record.tanggal,
    record.flavor,
    record.nomorMaterial || '',
    record.negara,
    record.distributor || '',
    record.createdAt || new Date().toISOString(),
    record.updatedAt || new Date().toISOString(),
    record.createdBy || '',
    record.updatedBy || '',
    getPhotoName(record.photos?.bumbu) || getPhotoName(record.photos?.['bumbu']),
    getPhotoName(record.photos?.mBumbu) || getPhotoName(record.photos?.['m-bumbu']),
    getPhotoName(record.photos?.si),
    getPhotoName(record.photos?.kartonDepan) || getPhotoName(record.photos?.['karton-depan']),
    getPhotoName(record.photos?.kartonBelakang) || getPhotoName(record.photos?.['karton-belakang']),
    getPhotoName(record.photos?.etiket),
    getPhotoName(record.photos?.etiketBanded) || getPhotoName(record.photos?.['etiket-banded']),
    getPhotoName(record.photos?.plakban),
    record.kodeProduksi ? JSON.stringify(record.kodeProduksi) : '[]',
    record.validationStatus || '',
    record.validatedBy || '',
    record.validatedAt || '',
    record.validationReason || ''
  ];
  
  sheet.appendRow(row);
  
  return { success: true, message: 'Record added', id: record.id };
}

// Update record - returns data object
// Struktur 23 kolom: id(0), tanggal(1), flavor(2), nomorMaterial(3), negara(4), distributor(5), createdAt(6), updatedAt(7),
//                    createdBy(8), updatedBy(9),
//                    photo_bumbu(10), photo_mbumbu(11), photo_si(12), photo_kartonDepan(13), photo_kartonBelakang(14),
//                    photo_etiket(15), photo_etiketbanded(16), photo_plakban(17), kodeProduksi(18),
//                    validationStatus(19), validatedBy(20), validatedAt(21), validationReason(22)
function updateRecordData(recordId, updatedRecord) {
  const sheet = getRecordsSheet();
  const data = sheet.getDataRange().getValues();
  
  // Helper to get photo name (string only, no JSON)
  function getPhotoName(photo) {
    if (!photo) return '';
    if (typeof photo === 'string') return photo;
    if (typeof photo === 'object' && photo.name) {
      return photo.name.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
    }
    return '';
  }
  
  // Helper to get photo value - returns new value if key exists (even if empty), otherwise existing value
  function getPhotoValue(photos, key, altKey, existingValue) {
    if (photos && (key in photos)) {
      return getPhotoName(photos[key]);
    }
    if (photos && altKey && (altKey in photos)) {
      return getPhotoName(photos[altKey]);
    }
    return existingValue || '';
  }
  
  Logger.log('=== UPDATE RECORD START ===');
  Logger.log('Looking for recordId: ' + recordId);
  Logger.log('Full updatedRecord: ' + JSON.stringify(updatedRecord));
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(recordId)) {
      const rowIndex = i + 1;
      
      Logger.log('Found record at row: ' + rowIndex);
      
      const photos = updatedRecord.photos || {};
      const photoBumbu = getPhotoValue(photos, 'bumbu', null, data[i][10]);
      const photoMBumbu = getPhotoValue(photos, 'mBumbu', 'm-bumbu', data[i][11]);
      const photoSi = getPhotoValue(photos, 'si', null, data[i][12]);
      const photoKartonDepan = getPhotoValue(photos, 'kartonDepan', 'karton-depan', data[i][13]);
      const photoKartonBelakang = getPhotoValue(photos, 'kartonBelakang', 'karton-belakang', data[i][14]);
      const photoEtiket = getPhotoValue(photos, 'etiket', null, data[i][15]);
      const photoEtiketBanded = getPhotoValue(photos, 'etiketBanded', 'etiket-banded', data[i][16]);
      const photoPlakban = getPhotoValue(photos, 'plakban', null, data[i][17]);
      
      Logger.log('Photo values - bumbu: "' + photoBumbu + '", kartonDepan: "' + photoKartonDepan + '", kartonBelakang: "' + photoKartonBelakang + '"');
      
      const row = [
        recordId,
        updatedRecord.tanggal || data[i][1],
        updatedRecord.flavor || data[i][2],
        updatedRecord.nomorMaterial || data[i][3] || '',
        updatedRecord.negara || data[i][4],
        updatedRecord.distributor || data[i][5] || '',
        data[i][6],
        new Date().toISOString(),
        updatedRecord.createdBy || data[i][8] || '',
        updatedRecord.updatedBy || updatedRecord.createdBy || data[i][9] || '',
        photoBumbu,
        photoMBumbu,
        photoSi,
        photoKartonDepan,
        photoKartonBelakang,
        photoEtiket,
        photoEtiketBanded,
        photoPlakban,
        updatedRecord.kodeProduksi ? JSON.stringify(updatedRecord.kodeProduksi) : (data[i][18] || '[]'),
        updatedRecord.validationStatus !== undefined ? updatedRecord.validationStatus : (data[i][19] || ''),
        updatedRecord.validatedBy !== undefined ? updatedRecord.validatedBy : (data[i][20] || ''),
        updatedRecord.validatedAt !== undefined ? updatedRecord.validatedAt : (data[i][21] || ''),
        updatedRecord.validationReason !== undefined ? updatedRecord.validationReason : (data[i][22] || '')
      ];
      
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
      
      Logger.log('Record updated successfully');
      return { success: true, message: 'Record updated', rowIndex: rowIndex };
    }
  }
  
  Logger.log('Record not found: ' + recordId);
  return { success: false, error: 'Record not found: ' + recordId };
}

// Delete record - returns data object
function deleteRecordData(recordId) {
  const sheet = getRecordsSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(recordId)) {
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

// Test fungsi pencarian file - jalankan ini untuk debug
function testFindFile() {
  Logger.log('=== TEST FIND FILE ===');
  
  // Test folder ID
  Logger.log('MAIN_FOLDER_ID: ' + MAIN_FOLDER_ID);
  
  try {
    var mainFolder = DriveApp.getFolderById(MAIN_FOLDER_ID);
    Logger.log('Main folder name: ' + mainFolder.getName());
    
    // List semua subfolder
    var subfolders = mainFolder.getFolders();
    Logger.log('Subfolders:');
    while (subfolders.hasNext()) {
      var folder = subfolders.next();
      Logger.log('  - ' + folder.getName() + ' (ID: ' + folder.getId() + ')');
    }
    
    // Test cari folder Bumbu
    var bumbuFolderId = getFolderIdByName('Bumbu');
    Logger.log('Bumbu folder ID: ' + bumbuFolderId);
    
    if (bumbuFolderId) {
      var bumbuFolder = DriveApp.getFolderById(bumbuFolderId);
      var files = bumbuFolder.getFiles();
      Logger.log('Files in Bumbu folder:');
      while (files.hasNext()) {
        var file = files.next();
        Logger.log('  - ' + file.getName() + ' (ID: ' + file.getId() + ')');
      }
      
      // Test cari file spesifik
      var testResult = findFileInFolder('Bumbu', 'GSS MG O HS');
      Logger.log('Search result for "GSS MG O HS": ' + JSON.stringify(testResult));
    }
    
  } catch (e) {
    Logger.log('ERROR: ' + e.message);
  }
  
  Logger.log('=== TEST END ===');
}

// =====================================================
// MASTER DATA MANAGEMENT FUNCTIONS
// =====================================================
// STRUKTUR MASTER (11 kolom):
// A:id, B:negara, C:flavor, D:keterangan, E:distributor,
// F:bumbu, G:minyakBumbu, H:kodeSI, I:kodeEtiket, J:kodeKarton, K:fiveOrSixInOne, L:plakban
// M:createdAt, N:updatedAt, O:createdBy, P:updatedBy

// Header untuk Master sheet
var MASTER_HEADERS = ['id', 'negara', 'flavor', 'keterangan', 'distributor',
                      'bumbu', 'minyakBumbu', 'kodeSI', 'kodeEtiket', 'kodeKarton', 
                      'fiveOrSixInOne', 'plakban',
                      'createdAt', 'updatedAt', 'createdBy', 'updatedBy'];

// Get or create Master sheet
function getMasterSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Master');
  
  // Jika sheet "Master" belum ada, buat otomatis
  if (!sheet) {
    sheet = ss.insertSheet('Master');
    sheet.getRange(1, 1, 1, MASTER_HEADERS.length).setValues([MASTER_HEADERS]);
    sheet.getRange(1, 1, 1, MASTER_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

// Fix Master sheet structure
function fixMasterStructure() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Master');
  
  if (!sheet) {
    sheet = ss.insertSheet('Master');
    sheet.getRange(1, 1, 1, MASTER_HEADERS.length).setValues([MASTER_HEADERS]);
    sheet.getRange(1, 1, 1, MASTER_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return { success: true, message: 'Sheet Master dibuat baru dengan struktur yang benar' };
  }
  
  // Perbaiki header
  sheet.getRange(1, 1, 1, MASTER_HEADERS.length).setValues([MASTER_HEADERS]);
  sheet.getRange(1, 1, 1, MASTER_HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  return { success: true, message: 'Header Master diperbaiki' };
}

// Normalize header names (lowercase, remove non-alphanum)
function normalizeMasterHeader(header) {
  return String(header || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Resolve master column indexes by header name with fallbacks
function getMasterColumnIndexes(sheet) {
  var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] || [];
  var headerMap = {};
  for (var i = 0; i < headerRow.length; i++) {
    var key = normalizeMasterHeader(headerRow[i]);
    if (key) headerMap[key] = i;
  }

  // Legacy fallback indexes (without id column)
  var legacy = {
    negara: 0,
    flavor: 1,
    keterangan: 2,
    distributor: 3,
    bumbu: 4,
    minyakbumbu: 5,
    kodesi: 6,
    kodeetiket: 7,
    kodekarton: 8,
    fiveorsixinone: 9,
    plakban: 10,
    createdat: 11,
    updatedat: 12,
    createdby: 13,
    updatedby: 14
  };

  function pickIndex(nameKey) {
    if (headerMap[nameKey] !== undefined) return headerMap[nameKey];
    if (legacy[nameKey] !== undefined) return legacy[nameKey];
    return -1;
  }

  return {
    id: pickIndex('id'),
    negara: pickIndex('negara'),
    flavor: pickIndex('flavor'),
    keterangan: pickIndex('keterangan'),
    distributor: pickIndex('distributor'),
    bumbu: pickIndex('bumbu'),
    minyakBumbu: pickIndex('minyakbumbu'),
    kodeSI: pickIndex('kodesi'),
    kodeEtiket: pickIndex('kodeetiket'),
    kodeKarton: pickIndex('kodekarton'),
    fiveOrSixInOne: pickIndex('fiveorsixinone'),
    plakban: pickIndex('plakban'),
    createdAt: pickIndex('createdat'),
    updatedAt: pickIndex('updatedat'),
    createdBy: pickIndex('createdby'),
    updatedBy: pickIndex('updatedby')
  };
}

// Get all Master Data
// MASTER_HEADERS: id(0), negara(1), flavor(2), keterangan(3), distributor(4),
//                 bumbu(5), minyakBumbu(6), kodeSI(7), kodeEtiket(8), kodeKarton(9),
//                 fiveOrSixInOne(10), plakban(11), createdAt(12), updatedAt(13), createdBy(14), updatedBy(15)
function getAllMasterData() {
  var sheet = getMasterSheet();
  var data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return { success: true, data: [] };
  }

  var idx = getMasterColumnIndexes(sheet);
  var masters = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var negaraValue = idx.negara >= 0 ? row[idx.negara] : '';
    if (negaraValue) {
      var idValue = idx.id >= 0 ? row[idx.id] : (i + '');
      masters.push({
        id: String(idValue || ''),
        negara: row[idx.negara] || '',
        flavor: idx.flavor >= 0 ? (row[idx.flavor] || '') : '',
        keterangan: idx.keterangan >= 0 ? (row[idx.keterangan] || '') : '',
        distributor: idx.distributor >= 0 ? (row[idx.distributor] || '') : '',
        bumbu: idx.bumbu >= 0 ? (row[idx.bumbu] || '') : '',
        minyakBumbu: idx.minyakBumbu >= 0 ? (row[idx.minyakBumbu] || '') : '',
        kodeSI: idx.kodeSI >= 0 ? (row[idx.kodeSI] || '') : '',
        kodeEtiket: idx.kodeEtiket >= 0 ? (row[idx.kodeEtiket] || '') : '',
        kodeKarton: idx.kodeKarton >= 0 ? (row[idx.kodeKarton] || '') : '',
        fiveOrSixInOne: idx.fiveOrSixInOne >= 0 ? (row[idx.fiveOrSixInOne] || '') : '',
        plakban: idx.plakban >= 0 ? (row[idx.plakban] || '') : '',
        createdAt: idx.createdAt >= 0 ? (row[idx.createdAt] || '') : '',
        updatedAt: idx.updatedAt >= 0 ? (row[idx.updatedAt] || '') : '',
        createdBy: idx.createdBy >= 0 ? (row[idx.createdBy] || '') : '',
        updatedBy: idx.updatedBy >= 0 ? (row[idx.updatedBy] || '') : ''
      });
    }
  }
  
  return { success: true, data: masters };
}

// Get Master by Flavor
function getMasterByFlavor(flavor) {
  var sheet = getMasterSheet();
  var data = sheet.getDataRange().getValues();
  var idx = getMasterColumnIndexes(sheet);
  var target = String(flavor || '').toLowerCase();
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowFlavor = idx.flavor >= 0 ? String(row[idx.flavor] || '').toLowerCase() : '';
    if (rowFlavor && rowFlavor === target) {
      var idValue = idx.id >= 0 ? row[idx.id] : (i + '');
      return {
        success: true,
        master: {
          id: String(idValue || ''),
          negara: idx.negara >= 0 ? (row[idx.negara] || '') : '',
          flavor: idx.flavor >= 0 ? (row[idx.flavor] || '') : '',
          keterangan: idx.keterangan >= 0 ? (row[idx.keterangan] || '') : '',
          distributor: idx.distributor >= 0 ? (row[idx.distributor] || '') : '',
          bumbu: idx.bumbu >= 0 ? (row[idx.bumbu] || '') : '',
          minyakBumbu: idx.minyakBumbu >= 0 ? (row[idx.minyakBumbu] || '') : '',
          kodeSI: idx.kodeSI >= 0 ? (row[idx.kodeSI] || '') : '',
          kodeEtiket: idx.kodeEtiket >= 0 ? (row[idx.kodeEtiket] || '') : '',
          kodeKarton: idx.kodeKarton >= 0 ? (row[idx.kodeKarton] || '') : '',
          fiveOrSixInOne: idx.fiveOrSixInOne >= 0 ? (row[idx.fiveOrSixInOne] || '') : '',
          plakban: idx.plakban >= 0 ? (row[idx.plakban] || '') : '',
          createdAt: idx.createdAt >= 0 ? (row[idx.createdAt] || '') : '',
          updatedAt: idx.updatedAt >= 0 ? (row[idx.updatedAt] || '') : '',
          createdBy: idx.createdBy >= 0 ? (row[idx.createdBy] || '') : '',
          updatedBy: idx.updatedBy >= 0 ? (row[idx.updatedBy] || '') : ''
        }
      };
    }
  }
  
  return { success: false, error: 'Master not found' };
}

// Add Master Data
function addMasterData(master) {
  var sheet = getMasterSheet();
  
  // Generate new ID
  var data = sheet.getDataRange().getValues();
  var maxId = 0;
  for (var i = 1; i < data.length; i++) {
    var currentId = parseInt(data[i][0]) || 0;
    if (currentId > maxId) maxId = currentId;
  }
  var newId = maxId + 1;
  
  var now = new Date().toISOString();
  
  var row = [
    newId,
    master.negara || '',
    master.flavor || '',
    master.keterangan || '',
    master.distributor || '',
    master.bumbu || '',
    master.minyakBumbu || '',
    master.kodeSI || '',
    master.kodeEtiket || '',
    master.kodeKarton || '',
    master.fiveOrSixInOne || '',
    master.plakban || '',
    now,                        // createdAt
    now,                        // updatedAt
    master.createdBy || '',
    master.createdBy || ''      // updatedBy = createdBy at creation
  ];
  
  sheet.appendRow(row);
  
  return { 
    success: true, 
    message: 'Master data added', 
    masterId: newId,
    master: {
      id: String(newId),
      negara: master.negara || '',
      flavor: master.flavor || '',
      keterangan: master.keterangan || '',
      distributor: master.distributor || '',
      bumbu: master.bumbu || '',
      minyakBumbu: master.minyakBumbu || '',
      kodeSI: master.kodeSI || '',
      kodeEtiket: master.kodeEtiket || '',
      kodeKarton: master.kodeKarton || '',
      fiveOrSixInOne: master.fiveOrSixInOne || '',
      plakban: master.plakban || '',
      createdAt: now,
      updatedAt: now,
      createdBy: master.createdBy || '',
      updatedBy: master.createdBy || ''
    }
  };
}

// Update Master Data
function updateMasterData(masterId, master) {
  var sheet = getMasterSheet();
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(masterId)) {
      var rowIndex = i + 1;  // 1-indexed
      var now = new Date().toISOString();
      
      var row = [
        masterId,
        master.negara || data[i][1] || '',
        master.flavor || data[i][2] || '',
        master.keterangan || data[i][3] || '',
        master.distributor || data[i][4] || '',
        master.bumbu || data[i][5] || '',
        master.minyakBumbu || data[i][6] || '',
        master.kodeSI || data[i][7] || '',
        master.kodeEtiket || data[i][8] || '',
        master.kodeKarton || data[i][9] || '',
        master.fiveOrSixInOne || data[i][10] || '',
        master.plakban || data[i][11] || '',
        data[i][12] || '',     // Keep original createdAt
        now,                    // updatedAt
        data[i][14] || '',     // Keep original createdBy
        master.updatedBy || '' // updatedBy
      ];
      
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
      
      return { success: true, message: 'Master data updated' };
    }
  }
  
  return { success: false, error: 'Master not found' };
}

// Delete Master Data
function deleteMasterData(masterId) {
  var sheet = getMasterSheet();
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(masterId)) {
      sheet.deleteRow(i + 1);  // 1-indexed
      return { success: true, message: 'Master data deleted' };
    }
  }
  
  return { success: false, error: 'Master not found' };
}

// Get unique values for dropdown (Negara list)
function getNegaraList() {
  var sheet = getMasterSheet();
  var data = sheet.getDataRange().getValues();
  var idx = getMasterColumnIndexes(sheet);
  
  var negaraSet = {};
  for (var i = 1; i < data.length; i++) {
    var value = idx.negara >= 0 ? data[i][idx.negara] : '';
    if (value) {
      negaraSet[value] = true;
    }
  }
  
  return { success: true, data: Object.keys(negaraSet).sort() };
}

// Get unique Flavor list
function getFlavorList() {
  var sheet = getMasterSheet();
  var data = sheet.getDataRange().getValues();
  var idx = getMasterColumnIndexes(sheet);
  
  var flavorSet = {};
  for (var i = 1; i < data.length; i++) {
    var value = idx.flavor >= 0 ? data[i][idx.flavor] : '';
    if (value) {
      flavorSet[value] = true;
    }
  }
  
  return { success: true, data: Object.keys(flavorSet).sort() };
}

// Test Master functions
function testMaster() {
  Logger.log('=== TEST MASTER ===');
  
  // Test get all
  var all = getAllMasterData();
  Logger.log('All Masters: ' + JSON.stringify(all));
  
  // Test add
  var added = addMasterData({
    negara: 'Indonesia',
    flavor: 'GSS Original',
    keterangan: 'Test data',
    distributor: 'PT ABC',
    bumbu: 'Bumbu123',
    minyakBumbu: 'MB456',
    kodeSI: 'SI789',
    kodeEtiket: 'ET012',
    kodeKarton: 'KT345',
    fiveOrSixInOne: 'FOS678',
    plakban: 'PLB901',
    createdBy: 'Admin'
  });
  Logger.log('Added: ' + JSON.stringify(added));
  
  Logger.log('=== TEST END ===');
}