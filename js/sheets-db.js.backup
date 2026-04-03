// =====================================================
// VALID DISPLAY - Google Sheets Database Module
// Menggunakan JSONP untuk GET dan fetch untuk POST
// =====================================================

class GoogleSheetsDB {
    constructor() {
        // Google Sheets API endpoint (via Apps Script Web App)
        this.webAppUrl = CONFIG.GOOGLE_SHEETS_WEBAPP_URL || '';
        this.callbackCounter = 0;
        // Keep track of pending callbacks to avoid deleting them prematurely
        this.pendingCallbacks = new Set();
    }

    // Check if configured
    isConfigured() {
        return this.webAppUrl && this.webAppUrl !== '' && this.webAppUrl !== 'YOUR_WEBAPP_URL';
    }

    // JSONP request untuk GET (bypass CORS)
    // Increased timeout to 90000ms (90 seconds) for very slow connections
    jsonpRequest(url, timeoutMs = 90000) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonpCallback_' + (++this.callbackCounter) + '_' + Date.now();
            let isResolved = false;
            let script = null;
            
            // Register callback in pending set
            this.pendingCallbacks.add(callbackName);
            
            const cleanup = () => {
                this.pendingCallbacks.delete(callbackName);
                // Don't delete callback immediately - give it a grace period
                // in case response arrives just after timeout
                setTimeout(() => {
                    if (window[callbackName]) {
                        delete window[callbackName];
                    }
                }, 5000); // 5 second grace period
                if (script && script.parentNode) {
                    try { script.parentNode.removeChild(script); } catch(e) {}
                }
            };
            
            const timeoutId = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    console.warn(`⏱️ JSONP request timeout (${timeoutMs}ms) for:`, url);
                    cleanup();
                    reject(new Error(`JSONP request timeout after ${timeoutMs}ms`));
                }
            }, timeoutMs);

            window[callbackName] = (data) => {
                if (isResolved) {
                    console.log('⚠️ Late JSONP response received (after timeout):', callbackName);
                    return; // Already timed out, ignore late response
                }
                isResolved = true;
                clearTimeout(timeoutId);
                console.log('✅ JSONP callback received:', callbackName);
                cleanup();
                resolve(data);
            };

            script = document.createElement('script');
            // Add callback parameter to URL
            const separator = url.includes('?') ? '&' : '?';
            script.src = url + separator + 'callback=' + callbackName;
            
            console.log('📡 JSONP Request URL:', script.src);
            
            script.onerror = () => {
                if (!isResolved) {
                    isResolved = true;
                    clearTimeout(timeoutId);
                    cleanup();
                    console.error('❌ JSONP script load error:', script.src);
                    reject(new Error('JSONP script load error'));
                }
            };
            document.head.appendChild(script);
        });
    }

    // Use JSONP (GET) for write operations too - bypasses CORS completely
    // Data is sent as URL parameter, returned via JSONP callback
    async postRequest(data) {
        console.log('📤 Sending request via JSONP (GET)...');
        
        try {
            // Encode data as URL parameter
            const encodedData = encodeURIComponent(JSON.stringify(data));
            const url = `${this.webAppUrl}?action=${data.action}&data=${encodedData}`;
            
            console.log('📤 JSONP URL length:', url.length);
            
            // Use JSONP request (same as getAllRecords)
            const result = await this.jsonpRequest(url);
            console.log('✅ JSONP response:', result);
            return result;
        } catch (error) {
            console.error('❌ JSONP request failed:', error);
            
            // Fallback to form submission
            console.log('📤 Falling back to form submission...');
            return this.formSubmit(data);
        }
    }
    
    // Fallback form submission
    async formSubmit(data) {
        return new Promise((resolve) => {
            setTimeout(() => {
                cleanup();
                resolve({ success: true, message: 'Request sent (form fallback)' });
            }, 2000);

            const cleanup = () => {
                if (iframe && iframe.parentNode) {
                    try { document.body.removeChild(iframe); } catch(e) {}
                }
                if (form && form.parentNode) {
                    try { document.body.removeChild(form); } catch(e) {}
                }
            };

            const iframe = document.createElement('iframe');
            iframe.name = 'postFrame_' + Date.now();
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = this.webAppUrl;
            form.target = iframe.name;
            form.style.display = 'none';

            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'data';
            input.value = JSON.stringify(data);
            form.appendChild(input);

            document.body.appendChild(form);
            
            try {
                form.submit();
            } catch (e) {
                cleanup();
                resolve({ success: true, message: 'Request sent (with error)' });
            }
        });
    }

    // =====================================================
    // FAST ENDPOINT - Get all records WITHOUT photo processing
    // This is 10-50x faster than getAllRecords() because it doesn't access Google Drive
    // =====================================================
    async getRecordsBasic() {
        if (!this.isConfigured()) {
            console.log('Google Sheets not configured, using local storage');
            return null;
        }

        try {
            console.log('🚀 FAST: Fetching records (basic) from Google Sheets...');
            const url = `${this.webAppUrl}?action=getRecordsBasic`;
            console.log('📡 Request URL:', url);
            
            // Fast endpoint - should complete in < 10 seconds (like getMasterData)
            const data = await this.jsonpRequest(url, 15000);
            console.log('✅ Data fetched (basic):', data.records?.length, 'records');
            
            if (data.success === false) {
                console.warn('❌ Server returned error:', data.error);
                return null;
            }
            
            return data.records || [];
        } catch (error) {
            console.error('❌ Error fetching records (basic):', error.message);
            return null;
        }
    }

    // Get all records from Google Sheets (SLOW - includes photo processing)
    // Use getRecordsBasic() for faster loading, use this only when you need full photo data
    async getAllRecords() {
        if (!this.isConfigured()) {
            console.log('Google Sheets not configured, using local storage');
            return null;
        }

        try {
            console.log('📡 Fetching records from Google Sheets...');
            const url = `${this.webAppUrl}?action=getAll`;
            console.log('📡 Request URL:', url);
            
            // Use much longer timeout (90 seconds) for fetching all records
            // Google Sheets can be very slow when dealing with large datasets
            const data = await this.jsonpRequest(url, 90000);
            console.log('✅ Data fetched from Google Sheets:', data);
            
            if (data.success === false) {
                console.warn('❌ Server returned error:', data.error);
                return null;
            }
            
            return data.records || [];
        } catch (error) {
            console.error('❌ Error fetching from Google Sheets:', error.message);
            return null;
        }
    }

    // Add new record to Google Sheets
    async addRecord(record) {
        if (!this.isConfigured()) {
            console.log('Google Sheets not configured');
            return null;
        }

        try {
            // Clean record - handle both string and object photo values
            const cleanRecord = {
                ...record,
                photos: {}
            };
            
            // Process photos - support both string (filename) and object formats
            if (record.photos) {
                for (const key in record.photos) {
                    const photoValue = record.photos[key];
                    if (photoValue) {
                        // If it's already a string (filename), keep it as string
                        if (typeof photoValue === 'string') {
                            cleanRecord.photos[key] = photoValue;
                        } else {
                            // If it's an object, extract only needed fields (no base64)
                            cleanRecord.photos[key] = {
                                id: photoValue.id || null,
                                name: photoValue.name || null,
                                directLink: photoValue.directLink || null
                                // base64 intentionally omitted
                            };
                        }
                    }
                }
            }
            
            console.log('📤 Adding record to Sheets:', cleanRecord);
            
            const result = await this.postRequest({
                action: 'add',
                record: cleanRecord
            });
            console.log('✅ Record added to Google Sheets:', result);
            return result;
        } catch (error) {
            console.error('Error adding to Google Sheets:', error);
            return null;
        }
    }

    // Update record in Google Sheets
    async updateRecord(recordId, updatedRecord) {
        if (!this.isConfigured()) {
            console.log('❌ Google Sheets not configured for update');
            return null;
        }

        try {
            console.log('📤 Updating record:', recordId);
            
            // Clean record - handle both string and object photo values
            const cleanRecord = {
                ...updatedRecord,
                photos: {}
            };
            
            // Process photos - support both string (filename) and object formats
            // IMPORTANT: Include empty strings ('') so deleted photos are cleared in the database
            if (updatedRecord.photos) {
                for (const key in updatedRecord.photos) {
                    const photoValue = updatedRecord.photos[key];
                    // Check if key exists (even if value is empty string)
                    // This ensures deleted photos (value = '') are sent to the server
                    if (photoValue === '' || photoValue === null || photoValue === undefined) {
                        // Explicitly set empty string for deleted photos
                        cleanRecord.photos[key] = '';
                    } else if (typeof photoValue === 'string') {
                        // If it's already a string (filename), keep it as string
                        cleanRecord.photos[key] = photoValue;
                    } else {
                        // If it's an object, extract only needed fields (no base64)
                        cleanRecord.photos[key] = {
                            id: photoValue.id || null,
                            name: photoValue.name || null,
                            directLink: photoValue.directLink || null
                            // base64 intentionally omitted - too large for Sheets
                        };
                    }
                }
            }
            
            console.log('📤 Clean record:', JSON.stringify(cleanRecord, null, 2).substring(0, 500) + '...');
            
            const result = await this.postRequest({
                action: 'update',
                recordId: String(recordId), // Ensure string type
                record: cleanRecord
            });
            
            console.log('✅ Record update result:', result);
            return result;
        } catch (error) {
            console.error('❌ Error updating Google Sheets:', error);
            return null;
        }
    }

    // Delete record from Google Sheets
    async deleteRecord(recordId) {
        if (!this.isConfigured()) {
            return null;
        }

        try {
            const result = await this.postRequest({
                action: 'delete',
                recordId: recordId
            });
            console.log('✅ Record deleted from Google Sheets:', result);
            return result;
        } catch (error) {
            console.error('Error deleting from Google Sheets:', error);
            return null;
        }
    }

    // Get single record by ID
    async getRecordById(recordId) {
        if (!this.isConfigured()) {
            return null;
        }

        try {
            const data = await this.jsonpRequest(`${this.webAppUrl}?action=get&id=${recordId}`);
            return data.record || null;
        } catch (error) {
            console.error('Error getting record:', error);
            return null;
        }
    }

    // =====================================================
    // MASTER DATA FUNCTIONS
    // =====================================================

    // Get all master data
    async getMasterData() {
        if (!this.isConfigured()) {
            console.log('Google Sheets not configured');
            return { success: false, error: 'Not configured', data: [] };
        }

        try {
            console.log('📡 Fetching master data from Google Sheets...');
            const url = `${this.webAppUrl}?action=getMaster`;
            console.log('📡 Request URL:', url);
            
            const data = await this.jsonpRequest(url, 8000);
            console.log('✅ Master data fetched:', data);
            
            if (data.success === false) {
                console.warn('❌ Server returned error:', data.error);
                return { success: false, error: data.error, data: [] };
            }
            
            return { success: true, data: data.data || [] };
        } catch (error) {
            console.error('❌ Error fetching master data:', error.message);
            return { success: false, error: error.message, data: [] };
        }
    }

    // Get master by flavor
    async getMasterByFlavor(flavor) {
        if (!this.isConfigured()) {
            return { success: false, error: 'Not configured' };
        }

        try {
            const url = `${this.webAppUrl}?action=getMasterByFlavor&flavor=${encodeURIComponent(flavor)}`;
            const data = await this.jsonpRequest(url, 5000);
            return data;
        } catch (error) {
            console.error('Error getting master by flavor:', error);
            return { success: false, error: error.message };
        }
    }

    // Add master data
    async addMaster(master) {
        if (!this.isConfigured()) {
            return { success: false, error: 'Not configured' };
        }

        try {
            console.log('📤 Adding master data to Sheets');
            const result = await this.postRequest({
                action: 'addMaster',
                master: master
            });
            console.log('✅ Master added:', result);
            return result;
        } catch (error) {
            console.error('Error adding master:', error);
            return { success: false, error: error.message };
        }
    }

    // Update master data
    async updateMaster(masterId, master) {
        if (!this.isConfigured()) {
            return { success: false, error: 'Not configured' };
        }

        try {
            console.log('📤 Updating master data:', masterId);
            const result = await this.postRequest({
                action: 'updateMaster',
                masterId: String(masterId),
                master: master
            });
            console.log('✅ Master updated:', result);
            return result;
        } catch (error) {
            console.error('Error updating master:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete master data
    async deleteMaster(masterId) {
        if (!this.isConfigured()) {
            return { success: false, error: 'Not configured' };
        }

        try {
            const result = await this.postRequest({
                action: 'deleteMaster',
                masterId: String(masterId)
            });
            console.log('✅ Master deleted:', result);
            return result;
        } catch (error) {
            console.error('Error deleting master:', error);
            return { success: false, error: error.message };
        }
    }

    // =====================================================
    // PHOTO UPLOAD FUNCTIONS (Server-side via Apps Script)
    // User tidak perlu login Google - semua upload via server
    // =====================================================

    /**
     * Upload photo to Google Drive via Apps Script
     * @param {string} base64Data - Base64 encoded image data
     * @param {string} fileName - Desired file name
     * @param {string} folder - Subfolder name (e.g., 'bumbu', 'si', 'karton')
     * @param {string} mimeType - Image mime type (default: image/jpeg)
     * @returns {Promise<{success: boolean, fileId?: string, directUrl?: string, error?: string}>}
     */
    async uploadPhoto(base64Data, fileName, folder = 'photos', mimeType = 'image/jpeg') {
        if (!this.isConfigured()) {
            return { success: false, error: 'Not configured' };
        }

        try {
            console.log('📤 Uploading photo to Google Drive via Apps Script...');
            console.log('📁 Folder:', folder);
            console.log('📄 File:', fileName);

            // Remove data URL prefix if present
            let cleanBase64 = base64Data;
            if (cleanBase64.indexOf('base64,') > -1) {
                cleanBase64 = cleanBase64.split('base64,')[1];
            }

            const result = await this.postRequest({
                action: 'uploadPhoto',
                photo: cleanBase64,
                fileName: fileName,
                folder: folder,
                mimeType: mimeType
            });

            if (result.success) {
                console.log('✅ Photo uploaded:', result.fileId);
                console.log('🔗 Direct URL:', result.directUrl);
            } else {
                console.error('❌ Photo upload failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('Error uploading photo:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete photo from Google Drive via Apps Script
     * @param {string} fileIdOrUrl - Google Drive file ID or URL
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async deletePhoto(fileIdOrUrl) {
        if (!this.isConfigured()) {
            return { success: false, error: 'Not configured' };
        }

        try {
            console.log('🗑️ Deleting photo from Google Drive...');
            
            const result = await this.postRequest({
                action: 'deletePhoto',
                fileId: fileIdOrUrl
            });

            console.log('✅ Photo deleted:', result);
            return result;
        } catch (error) {
            console.error('Error deleting photo:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get photo URL from file ID
     * @param {string} fileId - Google Drive file ID
     * @returns {Promise<{success: boolean, directUrl?: string, thumbnailUrl?: string, error?: string}>}
     */
    async getPhotoUrl(fileId) {
        if (!this.isConfigured()) {
            return { success: false, error: 'Not configured' };
        }

        try {
            const url = `${this.webAppUrl}?action=getPhotoUrl&fileId=${encodeURIComponent(fileId)}`;
            const result = await this.jsonpRequest(url);
            return result;
        } catch (error) {
            console.error('Error getting photo URL:', error);
            return { success: false, error: error.message };
        }
    }
}

// Global instance
const sheetsDB = new GoogleSheetsDB();
