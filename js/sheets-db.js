// =====================================================
// VALID DISPLAY - Google Sheets Database Module
// Menggunakan JSONP untuk GET dan fetch untuk POST
// =====================================================

class GoogleSheetsDB {
    constructor() {
        // Google Sheets API endpoint (via Apps Script Web App)
        this.webAppUrl = CONFIG.GOOGLE_SHEETS_WEBAPP_URL || '';
        this.callbackCounter = 0;
    }

    // Check if configured
    isConfigured() {
        return this.webAppUrl && this.webAppUrl !== '' && this.webAppUrl !== 'YOUR_WEBAPP_URL';
    }

    // JSONP request untuk GET (bypass CORS)
    jsonpRequest(url, timeoutMs = 10000) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonpCallback_' + (++this.callbackCounter) + '_' + Date.now();
            const timeoutId = setTimeout(() => {
                delete window[callbackName];
                if (script && script.parentNode) script.parentNode.removeChild(script);
                console.warn(`⏱️ JSONP request timeout (${timeoutMs}ms) for:`, url);
                reject(new Error(`JSONP request timeout after ${timeoutMs}ms`));
            }, timeoutMs);

            window[callbackName] = (data) => {
                clearTimeout(timeoutId);
                console.log('✅ JSONP callback received:', callbackName);
                delete window[callbackName];
                if (script && script.parentNode) script.parentNode.removeChild(script);
                resolve(data);
            };

            const script = document.createElement('script');
            // Add callback parameter to URL
            const separator = url.includes('?') ? '&' : '?';
            script.src = url + separator + 'callback=' + callbackName;
            
            console.log('📡 JSONP Request URL:', script.src);
            
            script.onerror = () => {
                clearTimeout(timeoutId);
                delete window[callbackName];
                if (script && script.parentNode) script.parentNode.removeChild(script);
                console.error('❌ JSONP script load error:', script.src);
                reject(new Error('JSONP script load error'));
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

    // Get all records from Google Sheets
    async getAllRecords() {
        if (!this.isConfigured()) {
            console.log('Google Sheets not configured, using local storage');
            return null;
        }

        try {
            console.log('📡 Fetching records from Google Sheets...');
            const url = `${this.webAppUrl}?action=getAll`;
            console.log('📡 Request URL:', url);
            
            const data = await this.jsonpRequest(url, 8000);
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
            // Clean record - REMOVE base64 data to avoid Google Sheets 50k char limit
            const cleanRecord = {
                ...record,
                photos: {}
            };
            
            // Remove base64 from photos (too large for Sheets - max 50k chars per cell)
            if (record.photos) {
                for (const key in record.photos) {
                    if (record.photos[key]) {
                        cleanRecord.photos[key] = {
                            id: record.photos[key].id || null,
                            name: record.photos[key].name || null,
                            directLink: record.photos[key].directLink || null
                            // base64 intentionally omitted
                        };
                    }
                }
            }
            
            console.log('📤 Adding record to Sheets (no base64)');
            
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
            
            // Clean record - REMOVE base64 data to avoid Google Sheets 50k char limit
            const cleanRecord = {
                ...updatedRecord,
                photos: {}
            };
            
            // Normalize photo keys and REMOVE base64 (too large for Sheets)
            if (updatedRecord.photos) {
                const photoKeyMap = {
                    'bumbu': 'bumbu',
                    'm-bumbu': 'm-bumbu',
                    'si': 'si',
                    'karton': 'karton',
                    'etiket': 'etiket',
                    'etiket-banded': 'etiket-banded',
                    'plakban': 'plakban'
                };
                
                for (const key in updatedRecord.photos) {
                    const normalizedKey = photoKeyMap[key] || key;
                    if (updatedRecord.photos[key]) {
                        // Only save id, name, directLink - NOT base64
                        cleanRecord.photos[normalizedKey] = {
                            id: updatedRecord.photos[key].id || null,
                            name: updatedRecord.photos[key].name || null,
                            directLink: updatedRecord.photos[key].directLink || null
                            // base64 intentionally omitted - too large for Sheets
                        };
                    }
                }
            }
            
            console.log('📤 Clean record (no base64):', JSON.stringify(cleanRecord, null, 2).substring(0, 500) + '...');
            
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
}

// Global instance
const sheetsDB = new GoogleSheetsDB();
