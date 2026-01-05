// =====================================================
// VALID DISPLAY - Google Sheets Database Module
// =====================================================

class GoogleSheetsDB {
    constructor() {
        // Google Sheets API endpoint (via Apps Script Web App)
        this.webAppUrl = CONFIG.GOOGLE_SHEETS_WEBAPP_URL || '';
    }

    // Check if configured
    isConfigured() {
        return this.webAppUrl && this.webAppUrl !== '' && this.webAppUrl !== 'YOUR_WEBAPP_URL';
    }

    // Get all records from Google Sheets
    async getAllRecords() {
        if (!this.isConfigured()) {
            console.log('Google Sheets not configured, using local storage');
            return null;
        }

        try {
            const response = await fetch(`${this.webAppUrl}?action=getAll`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch from Google Sheets');
            }

            const data = await response.json();
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
            const response = await fetch(this.webAppUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'add',
                    record: record
                })
            });

            const data = await response.json();
            return data;
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
            const response = await fetch(this.webAppUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'update',
                    recordId: recordId,
                    record: updatedRecord
                })
            });

            const data = await response.json();
            return data;
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
            const response = await fetch(this.webAppUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'delete',
                    recordId: recordId
                })
            });

            const data = await response.json();
            return data;
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
            const response = await fetch(`${this.webAppUrl}?action=get&id=${recordId}`, {
                method: 'GET'
            });

            const data = await response.json();
            return data.record || null;
        } catch (error) {
            console.error('Error getting record:', error);
            return null;
        }
    }
}

// Global instance
const sheetsDB = new GoogleSheetsDB();
