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
    jsonpRequest(url) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonpCallback_' + (++this.callbackCounter) + '_' + Date.now();
            const timeoutId = setTimeout(() => {
                delete window[callbackName];
                if (script.parentNode) script.parentNode.removeChild(script);
                reject(new Error('JSONP request timeout'));
            }, 30000);

            window[callbackName] = (data) => {
                clearTimeout(timeoutId);
                delete window[callbackName];
                if (script.parentNode) script.parentNode.removeChild(script);
                resolve(data);
            };

            const script = document.createElement('script');
            script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
            script.onerror = () => {
                clearTimeout(timeoutId);
                delete window[callbackName];
                if (script.parentNode) script.parentNode.removeChild(script);
                reject(new Error('JSONP script load error'));
            };
            document.head.appendChild(script);
        });
    }

    // POST via form submission with better error handling
    async postRequest(data) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonpCallback_' + (++this.callbackCounter) + '_' + Date.now();
            let resolved = false;
            
            const timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    // Assume success since form was submitted
                    console.log('⏱️ POST timeout - assuming success');
                    resolve({ success: true, message: 'Request sent (timeout)' });
                }
            }, 15000); // Increased timeout

            const cleanup = () => {
                delete window[callbackName];
                if (iframe && iframe.parentNode) {
                    try { document.body.removeChild(iframe); } catch(e) {}
                }
                if (form && form.parentNode) {
                    try { document.body.removeChild(form); } catch(e) {}
                }
                window.removeEventListener('message', messageHandler);
            };

            window[callbackName] = (response) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeoutId);
                    cleanup();
                    console.log('✅ POST response received:', response);
                    resolve(response);
                }
            };

            // Create hidden iframe
            const iframe = document.createElement('iframe');
            iframe.name = 'postFrame_' + Date.now();
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            // Create form
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = this.webAppUrl;
            form.target = iframe.name;
            form.style.display = 'none';

            // Add data as hidden field
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'data';
            input.value = JSON.stringify({
                ...data,
                callback: callbackName
            });
            form.appendChild(input);

            document.body.appendChild(form);
            
            console.log('📤 Submitting POST form with data:', data);
            
            // Listen for response via postMessage
            const messageHandler = (event) => {
                try {
                    const response = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                    if (response && response.callbackName === callbackName) {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timeoutId);
                            cleanup();
                            console.log('✅ POST response via postMessage:', response);
                            resolve(response);
                        }
                    }
                } catch (e) {}
            };
            window.addEventListener('message', messageHandler);

            // Submit form
            try {
                form.submit();
                console.log('📤 Form submitted successfully');
            } catch (e) {
                console.error('❌ Form submit error:', e);
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    reject(e);
                }
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
            const data = await this.jsonpRequest(`${this.webAppUrl}?action=getAll`);
            console.log('✅ Data fetched from Google Sheets:', data);
            return data.records || [];
        } catch (error) {
            console.error('Error fetching from Google Sheets:', error);
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
}

// Global instance
const sheetsDB = new GoogleSheetsDB();
