// =====================================================
// VALID DISPLAY - Google Apps Script untuk Google Sheets Database
// =====================================================
// 
// CARA SETUP:
// 1. Buka Google Sheets baru: https://sheets.google.com
// 2. Buat spreadsheet baru dengan nama: "AppDisplay_Database"
// 3. Rename Sheet1 menjadi "Records"
// 4. Di baris pertama (header), isi kolom A-N:
//    A: id | B: tanggal | C: flavor | D: negara | E: createdAt | F: updatedAt
//    G: photo_bumbu | H: photo_mbumbu | I: photo_si | J: photo_karton
//    K: photo_etiket | L: photo_etiketbanded | M: photo_plakban | N: kodeProduksi
// 
// 5. Klik Extensions > Apps Script
// 6. Hapus semua kode default, paste kode di bawah ini
// 7. Klik Deploy > New deployment
// 8. Pilih type: Web app
// 9. Execute as: Me
// 10. Who has access: Anyone
// 11. Deploy dan copy URL Web App
// 12. Paste URL ke config.js di GOOGLE_SHEETS_WEBAPP_URL
// =====================================================

// Spreadsheet ID - otomatis dari spreadsheet yang aktif
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getRecordsSheet() {
  return getSpreadsheet().getSheetByName('Records');
}

// Handle GET requests
function doGet(e) {
  const action = e.parameter.action || 'getAll';
  
  try {
    if (action === 'getAll') {
      return getAllRecords();
    } else if (action === 'get') {
      const id = e.parameter.id;
      return getRecordById(id);
    }
  } catch (error) {
    return createResponse({ success: false, error: error.message });
  }
  
  return createResponse({ success: false, error: 'Invalid action' });
}

// Handle POST requests
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'add') {
      return addRecord(data.record);
    } else if (action === 'update') {
      return updateRecord(data.recordId, data.record);
    } else if (action === 'delete') {
      return deleteRecord(data.recordId);
    }
  } catch (error) {
    return createResponse({ success: false, error: error.message });
  }
  
  return createResponse({ success: false, error: 'Invalid action' });
}

// Get all records
function getAllRecords() {
  const sheet = getRecordsSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return createResponse({ success: true, records: [] });
  }
  
  const headers = data[0];
  const records = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // if has ID
      const record = {
        id: row[0],
        tanggal: row[1],
        flavor: row[2],
        negara: row[3],
        createdAt: row[4],
        updatedAt: row[5],
        photos: {
          bumbu: row[6] ? JSON.parse(row[6]) : null,
          'm-bumbu': row[7] ? JSON.parse(row[7]) : null,
          si: row[8] ? JSON.parse(row[8]) : null,
          karton: row[9] ? JSON.parse(row[9]) : null,
          etiket: row[10] ? JSON.parse(row[10]) : null,
          'etiket-banded': row[11] ? JSON.parse(row[11]) : null,
          plakban: row[12] ? JSON.parse(row[12]) : null
        },
        kodeProduksi: row[13] ? JSON.parse(row[13]) : []
      };
      records.push(record);
    }
  }
  
  // Sort by createdAt descending (newest first)
  records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  return createResponse({ success: true, records: records });
}

// Get record by ID
function getRecordById(id) {
  const sheet = getRecordsSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      const row = data[i];
      const record = {
        id: row[0],
        tanggal: row[1],
        flavor: row[2],
        negara: row[3],
        createdAt: row[4],
        updatedAt: row[5],
        photos: {
          bumbu: row[6] ? JSON.parse(row[6]) : null,
          'm-bumbu': row[7] ? JSON.parse(row[7]) : null,
          si: row[8] ? JSON.parse(row[8]) : null,
          karton: row[9] ? JSON.parse(row[9]) : null,
          etiket: row[10] ? JSON.parse(row[10]) : null,
          'etiket-banded': row[11] ? JSON.parse(row[11]) : null,
          plakban: row[12] ? JSON.parse(row[12]) : null
        },
        kodeProduksi: row[13] ? JSON.parse(row[13]) : []
      };
      return createResponse({ success: true, record: record });
    }
  }
  
  return createResponse({ success: false, error: 'Record not found' });
}

// Add new record
function addRecord(record) {
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
  
  return createResponse({ success: true, message: 'Record added', id: record.id });
}

// Update record
function updateRecord(recordId, updatedRecord) {
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
      
      return createResponse({ success: true, message: 'Record updated' });
    }
  }
  
  return createResponse({ success: false, error: 'Record not found' });
}

// Delete record
function deleteRecord(recordId) {
  const sheet = getRecordsSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === recordId) {
      sheet.deleteRow(i + 1); // 1-indexed
      return createResponse({ success: true, message: 'Record deleted' });
    }
  }
  
  return createResponse({ success: false, error: 'Record not found' });
}

// Create JSON response
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Test function
function testGetAll() {
  const result = getAllRecords();
  Logger.log(result.getContent());
}
