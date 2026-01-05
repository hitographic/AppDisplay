// =====================================================
// VALID DISPLAY - Configuration
// =====================================================

const CONFIG = {
    // Google Drive API Configuration
    // GANTI NILAI DI BAWAH INI DENGAN MILIK ANDA
    GOOGLE_CLIENT_ID: '748984910734-81e3ft1gd1nvje4td97c49catdtf99sl.apps.googleusercontent.com',
    GOOGLE_API_KEY: 'AIzaSyC9xQbY7HoiY3Z9-D4W3AElIfHqRwkZsmI',
    GOOGLE_FOLDER_ID: '1oVQJZfkorSrsSd49CPzRsmAybUHX7J23',
    
    // Google Drive API Scopes
    SCOPES: 'https://www.googleapis.com/auth/drive.file',
    
    // Discovery Docs
    DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    
    // App Configuration
    APP_NAME: 'Valid Display',
    VERSION: '1.0.0',
    
    // User credentials (untuk demo - dalam produksi gunakan backend)
    USERS: [
        { nik: '50086913', password: 'Ind0f00d25', name: 'Admin User' },
        { nik: '12345678', password: 'password123', name: 'Test User' }
    ],
    
    // Photo Types
    PHOTO_TYPES: [
        { id: 'bumbu', name: 'Bumbu' },
        { id: 'm-bumbu', name: 'M. Bumbu' },
        { id: 'si', name: 'SI' },
        { id: 'karton', name: 'Karton' },
        { id: 'etiket', name: 'Etiket' },
        { id: 'etiket-banded', name: 'Etiket Banded' },
        { id: 'plakban', name: 'Plakban' }
    ],
    
    // Countries list
    COUNTRIES: [
        'Indonesia', 'Malaysia', 'Singapore', 'Thailand', 'Vietnam',
        'Philippines', 'Japan', 'Korea', 'China', 'Middle East',
        'Europe', 'USA', 'Australia', 'Other'
    ],
    
    // Local Storage Keys
    STORAGE_KEYS: {
        USER: 'validDisplay_user',
        TOKEN: 'validDisplay_token',
        RECORDS: 'validDisplay_records',
        TEMP_DATA: 'validDisplay_tempData',
        GOOGLE_TOKEN: 'validDisplay_googleToken'
    }
};

// Fungsi untuk mengecek apakah config sudah diset
function checkConfig() {
    if (CONFIG.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
        console.warn('⚠️ Google Client ID belum dikonfigurasi! Silakan update di js/config.js');
        return false;
    }
    if (CONFIG.GOOGLE_API_KEY === 'YOUR_GOOGLE_API_KEY') {
        console.warn('⚠️ Google API Key belum dikonfigurasi! Silakan update di js/config.js');
        return false;
    }
    if (CONFIG.GOOGLE_FOLDER_ID === 'YOUR_GOOGLE_DRIVE_FOLDER_ID') {
        console.warn('⚠️ Google Drive Folder ID belum dikonfigurasi! Silakan update di js/config.js');
        return false;
    }
    return true;
}

// Export untuk module (jika digunakan)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
