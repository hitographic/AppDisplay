// =====================================================
// VALID DISPLAY - Storage Module (Google Sheets + Google Drive + Local)
// =====================================================

class Storage {
    constructor() {
        this.isOnline = navigator.onLine;
        this.pendingUploads = [];
        this.useGoogleSheets = false;
        
        // Check if Google Sheets is configured
        this.checkGoogleSheets();
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processPendingUploads();
        });
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // Check if Google Sheets is configured
    checkGoogleSheets() {
        if (typeof sheetsDB !== 'undefined' && sheetsDB.isConfigured()) {
            this.useGoogleSheets = true;
            console.log('✅ Google Sheets database connected');
        } else {
            this.useGoogleSheets = false;
            console.log('ℹ️ Using local storage (Google Sheets not configured)');
        }
    }

    // ==================== MAIN DATA OPERATIONS ====================
    
    // Get all records (from Google Sheets or local)
    async getAllRecords() {
        if (this.useGoogleSheets && this.isOnline) {
            try {
                console.log('📡 Storage: Attempting to fetch from Google Sheets...');
                // Use 100 second timeout (slightly more than sheets-db 90s timeout + grace period)
                // This allows sheets-db to handle its own timeout logic
                const records = await Promise.race([
                    sheetsDB.getAllRecords(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Storage fetch timeout after 100 seconds')), 100000)
                    )
                ]);
                
                if (records !== null && records.length >= 0) {
                    console.log(`✅ Storage: Fetched ${records.length} records from Google Sheets`);
                    // Cache to local storage
                    this.saveRecordsLocal(records);
                    return records;
                }
            } catch (error) {
                console.error('❌ Storage: Error fetching from Google Sheets:', error.message);
                console.log('⚠️ Storage: Falling back to local storage');
            }
        }
        
        console.log('📦 Storage: Using local storage');
        return this.getRecordsLocal();
    }

    // Add record (to Google Sheets and local)
    async addRecord(record) {
        // Always save to local first
        this.addRecordLocal(record);
        
        // Sync to Google Sheets if available
        if (this.useGoogleSheets && this.isOnline) {
            try {
                await sheetsDB.addRecord(record);
                console.log('✅ Record synced to Google Sheets');
            } catch (error) {
                console.error('Error syncing to Google Sheets:', error);
            }
        }
        
        return record;
    }

    // Update record (in Google Sheets and local)
    async updateRecord(id, updatedData) {
        console.log('📝 Storage.updateRecord called with id:', id);
        console.log('📝 Storage.updateRecord data:', JSON.stringify(updatedData, null, 2));
        
        // Update local first
        const updated = this.updateRecordLocal(id, updatedData);
        console.log('📝 Local update result:', updated ? 'success' : 'failed');
        
        // Sync to Google Sheets if available
        if (this.useGoogleSheets && this.isOnline) {
            try {
                console.log('📝 Syncing to Google Sheets...');
                const result = await sheetsDB.updateRecord(id, updated || updatedData);
                console.log('✅ Google Sheets sync result:', result);
            } catch (error) {
                console.error('❌ Error updating Google Sheets:', error);
            }
        } else {
            console.log('⚠️ Google Sheets not available or offline');
            console.log('   - useGoogleSheets:', this.useGoogleSheets);
            console.log('   - isOnline:', this.isOnline);
        }
        
        return updated;
    }

    // Delete record (from Google Sheets and local)
    async deleteRecordComplete(id) {
        // Delete from local first
        this.deleteRecordLocal(id);
        
        // Delete from Google Sheets if available
        if (this.useGoogleSheets && this.isOnline) {
            try {
                await sheetsDB.deleteRecord(id);
                console.log('✅ Record deleted from Google Sheets');
            } catch (error) {
                console.error('Error deleting from Google Sheets:', error);
            }
        }
        
        return true;
    }

    // ==================== LOCAL STORAGE ====================
    
    // Save records to local storage
    saveRecordsLocal(records) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.RECORDS, JSON.stringify(records));
    }

    // Get records from local storage
    getRecordsLocal() {
        const records = localStorage.getItem(CONFIG.STORAGE_KEYS.RECORDS);
        return records ? JSON.parse(records) : [];
    }

    // Add single record to local storage
    addRecordLocal(record) {
        const records = this.getRecordsLocal();
        records.unshift(record); // Add to beginning
        this.saveRecordsLocal(records);
        return record;
    }

    // Update record in local storage
    updateRecordLocal(id, updatedData) {
        const records = this.getRecordsLocal();
        const index = records.findIndex(r => r.id === id);
        if (index !== -1) {
            records[index] = { ...records[index], ...updatedData, updatedAt: new Date().toISOString() };
            this.saveRecordsLocal(records);
            return records[index];
        }
        return null;
    }

    // Delete record from local storage
    deleteRecordLocal(id) {
        const records = this.getRecordsLocal();
        const filtered = records.filter(r => r.id !== id);
        this.saveRecordsLocal(filtered);
        return true;
    }

    // Get single record by ID (support string/number)
    getRecordById(id) {
        const records = this.getRecordsLocal();
        // Cari dengan id persis, atau id string/number
        return records.find(r => r.id == id); // pakai == agar '3' dan 3 cocok
    }

    // Save temporary data (for create display process)
    saveTempData(data) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TEMP_DATA, JSON.stringify(data));
    }

    // Get temporary data
    getTempData() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.TEMP_DATA);
        return data ? JSON.parse(data) : null;
    }

    // Clear temporary data
    clearTempData() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TEMP_DATA);
    }

    // ==================== GOOGLE DRIVE ====================
    
    // Check if Google Drive is ready
    async isGoogleDriveReady() {
        const token = auth.getGoogleToken();
        if (!token) {
            return false;
        }
        
        if (!checkConfig()) {
            return false;
        }
        
        return true;
    }

    // Upload file to Google Drive
    async uploadToGoogleDrive(file, fileName, folderId = null) {
        const token = auth.getGoogleToken();
        if (!token) {
            throw new Error('Google Drive tidak terautentikasi. Silakan login Google terlebih dahulu.');
        }

        const targetFolderId = folderId || CONFIG.GOOGLE_FOLDER_ID;
        
        // Create file metadata
        const metadata = {
            name: fileName,
            mimeType: file.type,
            parents: [targetFolderId]
        };

        // Create form data
        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        formData.append('file', file);

        try {
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,thumbnailLink', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Upload gagal');
            }

            const result = await response.json();
            
            // Make file publicly accessible
            await this.makeFilePublic(result.id);
            
            return {
                id: result.id,
                name: result.name,
                webViewLink: result.webViewLink,
                directLink: `https://drive.google.com/uc?export=view&id=${result.id}`,
                thumbnailLink: result.thumbnailLink
            };
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }

    // Make file publicly accessible
    async makeFilePublic(fileId) {
        const token = auth.getGoogleToken();
        if (!token) return;

        try {
            await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    role: 'reader',
                    type: 'anyone'
                })
            });
        } catch (error) {
            console.error('Error making file public:', error);
        }
    }

    // Create folder in Google Drive
    async createFolder(folderName, parentFolderId = null) {
        const token = auth.getGoogleToken();
        if (!token) {
            throw new Error('Google Drive tidak terautentikasi');
        }

        const metadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId || CONFIG.GOOGLE_FOLDER_ID]
        };

        try {
            const response = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(metadata)
            });

            if (!response.ok) {
                throw new Error('Gagal membuat folder');
            }

            const result = await response.json();
            
            // Make folder public
            await this.makeFilePublic(result.id);
            
            return result;
        } catch (error) {
            console.error('Create folder error:', error);
            throw error;
        }
    }

    // Delete file from Google Drive
    async deleteFromGoogleDrive(fileId) {
        const token = auth.getGoogleToken();
        if (!token) {
            throw new Error('Google Drive tidak terautentikasi');
        }

        try {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Delete error:', error);
            throw error;
        }
    }

    // List files in folder
    async listFilesInFolder(folderId = null) {
        const token = auth.getGoogleToken();
        if (!token) {
            return [];
        }

        const targetFolderId = folderId || CONFIG.GOOGLE_FOLDER_ID;

        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q='${targetFolderId}' in parents&fields=files(id,name,mimeType,webViewLink,thumbnailLink,createdTime,modifiedTime)`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Gagal mengambil daftar file');
            }

            const result = await response.json();
            return result.files || [];
        } catch (error) {
            console.error('List files error:', error);
            return [];
        }
    }

    // ==================== SYNC OPERATIONS ====================
    
    // Sync records with Google Drive (save as JSON)
    async syncRecordsToGoogleDrive() {
        if (!await this.isGoogleDriveReady()) {
            console.log('Google Drive not ready, skipping sync');
            return false;
        }

        const records = this.getRecordsLocal();
        const dataBlob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
        const dataFile = new File([dataBlob], 'records.json', { type: 'application/json' });

        try {
            // Check if records.json exists
            const files = await this.listFilesInFolder();
            const existingFile = files.find(f => f.name === 'records.json');

            if (existingFile) {
                // Update existing file
                await this.updateFileInGoogleDrive(existingFile.id, dataFile);
            } else {
                // Create new file
                await this.uploadToGoogleDrive(dataFile, 'records.json');
            }
            
            return true;
        } catch (error) {
            console.error('Sync error:', error);
            return false;
        }
    }

    // Update existing file in Google Drive
    async updateFileInGoogleDrive(fileId, file) {
        const token = auth.getGoogleToken();
        if (!token) {
            throw new Error('Google Drive tidak terautentikasi');
        }

        try {
            const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': file.type
                },
                body: file
            });

            return response.ok;
        } catch (error) {
            console.error('Update file error:', error);
            throw error;
        }
    }

    // Load records from Google Drive
    async loadRecordsFromGoogleDrive() {
        if (!await this.isGoogleDriveReady()) {
            return this.getRecordsLocal();
        }

        try {
            const files = await this.listFilesInFolder();
            const recordsFile = files.find(f => f.name === 'records.json');

            if (recordsFile) {
                const token = auth.getGoogleToken();
                const response = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${recordsFile.id}?alt=media`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );

                if (response.ok) {
                    const records = await response.json();
                    // Merge with local records
                    this.saveRecordsLocal(records);
                    return records;
                }
            }
        } catch (error) {
            console.error('Load from Google Drive error:', error);
        }

        return this.getRecordsLocal();
    }

    // Add to pending uploads (for offline mode)
    addToPendingUploads(upload) {
        this.pendingUploads.push(upload);
        localStorage.setItem('pendingUploads', JSON.stringify(this.pendingUploads));
    }

    // Process pending uploads when online
    async processPendingUploads() {
        if (!this.isOnline || this.pendingUploads.length === 0) return;

        const pending = [...this.pendingUploads];
        this.pendingUploads = [];

        for (const upload of pending) {
            try {
                await this.uploadToGoogleDrive(upload.file, upload.fileName, upload.folderId);
            } catch (error) {
                console.error('Failed to process pending upload:', error);
                this.pendingUploads.push(upload);
            }
        }

        localStorage.setItem('pendingUploads', JSON.stringify(this.pendingUploads));
    }

    // ==================== UTILITY ====================
    
    // Generate unique ID
    generateId() {
        return 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Convert file to base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Compress image before upload
    async compressImage(file, maxWidth = 1200, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    blob => {
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }
}

// Global storage instance
const storage = new Storage();
