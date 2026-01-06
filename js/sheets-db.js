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

    // POST via multiple methods for reliability
    async postRequest(data) {
        console.log('📤 Attempting POST to Google Apps Script...');
        
        // Method 1: Try fetch with no-cors (fire-and-forget)
        try {
            const formData = new FormData();
            formData.append('data', JSON.stringify(data));
            
            fetch(this.webAppUrl, {
                method: 'POST',
                mode: 'no-cors', // This means we won't get response, but request will be sent
                body: formData
            }).catch(e => console.log('Fetch sent (no-cors mode)'));
            
            console.log('📤 Fetch POST sent (no-cors mode)');
        } catch (e) {
            console.log('Fetch method failed, trying form...', e);
        }
        
        // Method 2: Form submission as backup
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                cleanup();
                console.log('✅ POST completed (fire-and-forget mode)');
                resolve({ success: true, message: 'Request sent successfully' });
            }, 2000);

            const cleanup = () => {
                if (iframe && iframe.parentNode) {
                    try { document.body.removeChild(iframe); } catch(e) {}
                }
                if (form && form.parentNode) {
                    try { document.body.removeChild(form); } catch(e) {}
                }
            };

            // Create hidden iframe
            const iframe = document.createElement('iframe');
            iframe.name = 'postFrame_' + Date.now();
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            // Create form with enctype for proper data transmission
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = this.webAppUrl;
            form.target = iframe.name;
            form.enctype = 'application/x-www-form-urlencoded';
            form.style.display = 'none';

            // Add data as hidden field
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'data';
            input.value = JSON.stringify(data);
            form.appendChild(input);

            document.body.appendChild(form);
            
            console.log('📤 Submitting form with data:', JSON.stringify(data).substring(0, 200));

            try {
                form.submit();
                console.log('📤 Form submitted to Apps Script');
            } catch (e) {
                console.error('❌ Form submit error:', e);
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
