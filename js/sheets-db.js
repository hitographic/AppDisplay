// =====================================================
// VALID DISPLAY - Google Sheets Database Module
// Menggunakan JSONP untuk bypass CORS
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

    // JSONP request untuk bypass CORS
    jsonpRequest(url) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonpCallback_' + (++this.callbackCounter) + '_' + Date.now();
            const timeoutId = setTimeout(() => {
                delete window[callbackName];
                if (script.parentNode) script.parentNode.removeChild(script);
                reject(new Error('JSONP request timeout'));
            }, 30000); // 30 second timeout

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

    // POST via form submission (untuk add/update/delete)
    async postRequest(data) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonpCallback_' + (++this.callbackCounter) + '_' + Date.now();
            
            const timeoutId = setTimeout(() => {
                delete window[callbackName];
                reject(new Error('POST request timeout'));
            }, 30000);

            window[callbackName] = (response) => {
                clearTimeout(timeoutId);
                delete window[callbackName];
                resolve(response);
            };

            // Create hidden iframe for form submission
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
            
            // Listen for response via postMessage
            const messageHandler = (event) => {
                try {
                    const response = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                    if (response.callbackName === callbackName) {
                        clearTimeout(timeoutId);
                        window.removeEventListener('message', messageHandler);
                        delete window[callbackName];
                        document.body.removeChild(iframe);
                        document.body.removeChild(form);
                        resolve(response);
                    }
                } catch (e) {}
            };
            window.addEventListener('message', messageHandler);

            // Submit form
            form.submit();

            // Fallback: check for callback after delay
            setTimeout(() => {
                // Clean up if still pending
                if (window[callbackName]) {
                    delete window[callbackName];
                    window.removeEventListener('message', messageHandler);
                    if (iframe.parentNode) document.body.removeChild(iframe);
                    if (form.parentNode) document.body.removeChild(form);
                    // Assume success if no error
                    resolve({ success: true, message: 'Request sent' });
                }
            }, 5000);
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
            const result = await this.postRequest({
                action: 'add',
                record: record
            });
            console.log('✅ Record added to Google Sheets');
            return result;
        } catch (error) {
            console.error('Error adding to Google Sheets:', error);
            return null;
        }
    }

    // Update record in Google Sheets
    async updateRecord(recordId, updatedRecord) {
        if (!this.isConfigured()) {
            return null;
        }

        try {
            const result = await this.postRequest({
                action: 'update',
                recordId: recordId,
                record: updatedRecord
            });
            console.log('✅ Record updated in Google Sheets');
            return result;
        } catch (error) {
            console.error('Error updating Google Sheets:', error);
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
            console.log('✅ Record deleted from Google Sheets');
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
