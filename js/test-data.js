// =====================================================
// VALID DISPLAY - Test Data Script
// Jalankan script ini di browser console untuk add test data
// =====================================================

/**
 * Add test records to localStorage
 * Gunakan ini untuk test kalau Google Sheets tidak terhubung
 */
function addTestRecords() {
    console.group('📝 Adding Test Records');
    
    const testRecords = [
        {
            id: 'test-001',
            flavor: 'Bumbu Nasi Goreng',
            negara: 'Indonesia',
            tanggal: new Date().toISOString().split('T')[0],
            createdBy: 'Admin User',
            createdAt: new Date().toISOString(),
            validationStatus: 'valid',
            photos: {}
        },
        {
            id: 'test-002',
            flavor: 'Bumbu Soto Ayam',
            negara: 'Malaysia',
            tanggal: new Date().toISOString().split('T')[0],
            createdBy: 'Admin User',
            createdAt: new Date().toISOString(),
            validationStatus: 'pending',
            photos: {}
        },
        {
            id: 'test-003',
            flavor: 'Mie Instant Premium',
            negara: 'Singapore',
            tanggal: new Date().toISOString().split('T')[0],
            createdBy: 'Admin User',
            createdAt: new Date().toISOString(),
            validationStatus: 'invalid',
            validationReason: 'Foto tidak jelas',
            photos: {}
        }
    ];
    
    localStorage.setItem('validDisplay_records', JSON.stringify(testRecords));
    console.log('✅ Added', testRecords.length, 'test records');
    console.log('Test records:', testRecords);
    console.log('Reloading page...');
    console.groupEnd();
    
    // Reload setelah 2 detik
    setTimeout(() => location.reload(), 2000);
}

/**
 * Clear all data from localStorage
 */
function clearAllData() {
    if (confirm('Apakah Anda yakin ingin menghapus SEMUA data lokal?')) {
        localStorage.clear();
        console.log('✅ All data cleared');
        location.reload();
    }
}

/**
 * Export records to JSON file
 */
function exportRecords() {
    const records = localStorage.getItem('validDisplay_records');
    if (!records) {
        console.warn('⚠️ Tidak ada records untuk di-export');
        return;
    }
    
    const data = JSON.parse(records);
    const json = JSON.stringify(data, null, 2);
    
    // Download file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'valid-display-records-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    console.log('✅ Exported', data.length, 'records');
}

/**
 * Import records dari JSON file
 */
function importRecords(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (!Array.isArray(data)) {
            throw new Error('Data harus array of records');
        }
        
        localStorage.setItem('validDisplay_records', JSON.stringify(data));
        console.log('✅ Imported', data.length, 'records');
        location.reload();
    } catch (error) {
        console.error('❌ Error importing records:', error);
    }
}

// Make functions available globally
window.addTestRecords = addTestRecords;
window.clearAllData = clearAllData;
window.exportRecords = exportRecords;
window.importRecords = importRecords;

console.log('✅ Test data functions loaded. Available commands:');
console.log('  • addTestRecords() - Tambah 3 test records');
console.log('  • clearAllData() - Hapus semua data lokal');
console.log('  • exportRecords() - Export records ke JSON file');
console.log('  • importRecords(jsonString) - Import records dari JSON string');
