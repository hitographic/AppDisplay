// =====================================================
// VALID DISPLAY - Google Sheets Database Module
// Pattern: INSPECTA-style fetch API (text/plain POST, GET with params)
// Supports: fetch() primary + JSONP fallback for GET
// No user Gmail login needed - Execute as Me + Anyone
// =====================================================

class GoogleSheetsDB {
    constructor() {
        this.webAppUrl = CONFIG.GOOGLE_SHEETS_WEBAPP_URL || '';
        this.callbackCounter = 0;
        this.pendingCallbacks = new Set();
    }

    // Check if configured
    isConfigured() {
        return this.webAppUrl && this.webAppUrl !== '' && this.webAppUrl !== 'YOUR_WEBAPP_URL';
    }

    // ===== CORE API METHODS (INSPECTA Pattern) =====

    /**
     * GET request to Apps Script backend
     * Uses fetch() first, falls back to JSONP if CORS blocks
     */
    async gGet(action, params = {}) {
        const url = new URL(this.webAppUrl);
        url.searchParams.set('action', action);
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                url.searchParams.set(key, String(value));
            }
        }

        console.log(`📡 GET ${action}`, params);

        // Try fetch() first (works when Apps Script handles CORS)
        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                redirect: 'follow'
            });
            if (response.ok) {
                const data = await response.json();
                if (data && data.error && !data.success) {
                    console.warn(`⚠️ Server error for ${action}:`, data.error);
                }
                return data;
            }
        } catch (fetchError) {
            console.warn(`⚠️ fetch() failed for GET ${action}, trying JSONP...`, fetchError.message);
        }

        // Fallback: JSONP (always works, no CORS issues)
        return this.jsonpRequest(url.toString());
    }

    /**
     * POST request to Apps Script backend
     * IMPORTANT: Content-Type must be 'text/plain' for Apps Script doPost
     * (Apps Script doesn't parse application/json correctly via doPost)
     */
    async gPost(action, body = {}) {
        const url = new URL(this.webAppUrl);
        url.searchParams.set('action', action);

        console.log(`📤 POST ${action}`, Object.keys(body));

        // Try fetch() POST with text/plain (INSPECTA pattern)
        try {
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(body),
                redirect: 'follow'
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ POST ${action} success:`, data);
                return data;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (fetchError) {
            console.warn(`⚠️ fetch() POST failed for ${action}, trying JSONP fallback...`, fetchError.message);
        }

        // Fallback: Send data as URL parameter via JSONP GET
        try {
            const encodedData = encodeURIComponent(JSON.stringify(body));
            const fallbackUrl = `${this.webAppUrl}?action=${action}&data=${encodedData}`;
            
            if (fallbackUrl.length > 8000) {
                console.warn('⚠️ URL too long for JSONP fallback, using form submit...');
                return this.formSubmit({ action, ...body });
            }
            
            const result = await this.jsonpRequest(fallbackUrl);
            console.log(`✅ JSONP fallback for ${action} success:`, result);
            return result;
        } catch (jsonpError) {
            console.error(`❌ All methods failed for ${action}:`, jsonpError);
            return { success: false, error: jsonpError.message };
        }
    }

    // ===== JSONP (Legacy fallback for GET) =====
    jsonpRequest(url, timeoutMs = 90000) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonpCallback_' + (++this.callbackCounter) + '_' + Date.now();
            let isResolved = false;
            let script = null;

            this.pendingCallbacks.add(callbackName);

            const cleanup = () => {
                this.pendingCallbacks.delete(callbackName);
                setTimeout(() => {
                    if (window[callbackName]) delete window[callbackName];
                }, 5000);
                if (script && script.parentNode) {
                    try { script.parentNode.removeChild(script); } catch(e) {}
                }
            };

            const timeoutId = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    cleanup();
                    reject(new Error(`JSONP timeout after ${timeoutMs}ms`));
                }
            }, timeoutMs);

            window[callbackName] = (data) => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timeoutId);
                cleanup();
                resolve(data);
            };

            script = document.createElement('script');
            const separator = url.includes('?') ? '&' : '?';
            script.src = url + separator + 'callback=' + callbackName;
            script.onerror = () => {
                if (!isResolved) {
                    isResolved = true;
                    clearTimeout(timeoutId);
                    cleanup();
                    reject(new Error('JSONP script load error'));
                }
            };
            document.head.appendChild(script);
        });
    }

    // Form submit fallback (for very large POST payloads like photo upload)
    async formSubmit(data) {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                cleanup();
                resolve({ success: true, message: 'Request sent (form fallback)' });
            }, 5000);

            const cleanup = () => {
                clearTimeout(timeout);
                if (iframe && iframe.parentNode) try { document.body.removeChild(iframe); } catch(e) {}
                if (form && form.parentNode) try { document.body.removeChild(form); } catch(e) {}
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

            try { form.submit(); } catch (e) {
                cleanup();
                resolve({ success: true, message: 'Request sent (with error)' });
            }
        });
    }

    // =====================================================
    // RECORDS FUNCTIONS
    // =====================================================

    // FAST: Get records WITHOUT photo processing (no Google Drive access)
    async getRecordsBasic() {
        if (!this.isConfigured()) return null;
        try {
            console.log('🚀 FAST: Fetching records (basic)...');
            const data = await this.gGet('getRecordsBasic');
            console.log('✅ Basic records:', data.records?.length);
            if (data.success === false) return null;
            return data.records || [];
        } catch (error) {
            console.error('❌ getRecordsBasic error:', error.message);
            return null;
        }
    }

    // FULL: Get records WITH photo processing (slow, accesses Google Drive)
    async getAllRecords() {
        if (!this.isConfigured()) return null;
        try {
            console.log('📡 Fetching all records (full)...');
            const data = await this.gGet('getAll');
            console.log('✅ All records:', data.records?.length);
            if (data.success === false) return null;
            return data.records || [];
        } catch (error) {
            console.error('❌ getAllRecords error:', error.message);
            return null;
        }
    }

    // Get single record by ID
    async getRecordById(recordId) {
        if (!this.isConfigured()) return null;
        try {
            const data = await this.gGet('get', { id: recordId });
            return data.record || null;
        } catch (error) {
            console.error('❌ getRecordById error:', error);
            return null;
        }
    }

    // Add new record
    async addRecord(record) {
        if (!this.isConfigured()) return null;
        try {
            const cleanRecord = this._cleanRecordForSave(record);
            console.log('📤 Adding record:', cleanRecord.id || 'new');
            const result = await this.gPost('add', { record: cleanRecord });
            console.log('✅ Record added:', result);
            return result;
        } catch (error) {
            console.error('❌ addRecord error:', error);
            return null;
        }
    }

    // Update record
    async updateRecord(recordId, updatedRecord) {
        if (!this.isConfigured()) return null;
        try {
            const cleanRecord = this._cleanRecordForSave(updatedRecord, true);
            console.log('📤 Updating record:', recordId);
            const result = await this.gPost('update', {
                recordId: String(recordId),
                record: cleanRecord
            });
            console.log('✅ Record updated:', result);
            return result;
        } catch (error) {
            console.error('❌ updateRecord error:', error);
            return null;
        }
    }

    // Delete record
    async deleteRecord(recordId) {
        if (!this.isConfigured()) return null;
        try {
            const result = await this.gPost('delete', { recordId: recordId });
            console.log('✅ Record deleted:', result);
            return result;
        } catch (error) {
            console.error('❌ deleteRecord error:', error);
            return null;
        }
    }

    // Clean record data for saving (remove base64, keep only needed fields)
    _cleanRecordForSave(record, isUpdate = false) {
        const cleanRecord = { ...record, photos: {} };

        if (record.photos) {
            for (const key in record.photos) {
                const val = record.photos[key];
                if (val === '' || val === null || val === undefined) {
                    cleanRecord.photos[key] = ''; // Explicitly clear deleted photos
                } else if (typeof val === 'string') {
                    cleanRecord.photos[key] = val;
                } else if (typeof val === 'object') {
                    cleanRecord.photos[key] = {
                        id: val.id || null,
                        name: val.name || null,
                        directLink: val.directLink || null
                        // base64 intentionally omitted
                    };
                }
            }
        }
        return cleanRecord;
    }

    // =====================================================
    // MASTER DATA FUNCTIONS
    // =====================================================

    async getMasterData() {
        if (!this.isConfigured()) return { success: false, error: 'Not configured', data: [] };
        try {
            console.log('📡 Fetching master data...');
            const data = await this.gGet('getMaster');
            if (data.success === false) return { success: false, error: data.error, data: [] };
            return { success: true, data: data.data || [] };
        } catch (error) {
            console.error('❌ getMasterData error:', error.message);
            return { success: false, error: error.message, data: [] };
        }
    }

    async getMasterByFlavor(flavor) {
        if (!this.isConfigured()) return { success: false, error: 'Not configured' };
        try {
            return await this.gGet('getMasterByFlavor', { flavor });
        } catch (error) {
            console.error('❌ getMasterByFlavor error:', error);
            return { success: false, error: error.message };
        }
    }

    async addMaster(master) {
        if (!this.isConfigured()) return { success: false, error: 'Not configured' };
        try {
            const result = await this.gPost('addMaster', { master });
            console.log('✅ Master added:', result);
            return result;
        } catch (error) {
            console.error('❌ addMaster error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateMaster(masterId, master) {
        if (!this.isConfigured()) return { success: false, error: 'Not configured' };
        try {
            const result = await this.gPost('updateMaster', {
                masterId: String(masterId),
                master
            });
            console.log('✅ Master updated:', result);
            return result;
        } catch (error) {
            console.error('❌ updateMaster error:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteMaster(masterId) {
        if (!this.isConfigured()) return { success: false, error: 'Not configured' };
        try {
            const result = await this.gPost('deleteMaster', { masterId: String(masterId) });
            console.log('✅ Master deleted:', result);
            return result;
        } catch (error) {
            console.error('❌ deleteMaster error:', error);
            return { success: false, error: error.message };
        }
    }

    // =====================================================
    // PHOTO UPLOAD FUNCTIONS (Server-side via Apps Script)
    // User tidak perlu login Google - semua upload via server
    // =====================================================

    async uploadPhoto(base64Data, fileName, folder = 'photos', mimeType = 'image/jpeg') {
        if (!this.isConfigured()) return { success: false, error: 'Not configured' };
        try {
            console.log('📤 Uploading photo:', fileName, 'to', folder);

            let cleanBase64 = base64Data;
            if (cleanBase64.indexOf('base64,') > -1) {
                cleanBase64 = cleanBase64.split('base64,')[1];
            }

            const result = await this.gPost('uploadPhoto', {
                photo: cleanBase64,
                fileName,
                folder,
                mimeType
            });

            if (result.success) {
                console.log('✅ Photo uploaded:', result.fileId);
            } else {
                console.error('❌ Photo upload failed:', result.error);
            }
            return result;
        } catch (error) {
            console.error('❌ uploadPhoto error:', error);
            return { success: false, error: error.message };
        }
    }

    async deletePhoto(fileIdOrUrl) {
        if (!this.isConfigured()) return { success: false, error: 'Not configured' };
        try {
            const result = await this.gPost('deletePhoto', { fileId: fileIdOrUrl });
            console.log('✅ Photo deleted:', result);
            return result;
        } catch (error) {
            console.error('❌ deletePhoto error:', error);
            return { success: false, error: error.message };
        }
    }

    async getPhotoUrl(fileId) {
        if (!this.isConfigured()) return { success: false, error: 'Not configured' };
        try {
            return await this.gGet('getPhotoUrl', { fileId });
        } catch (error) {
            console.error('❌ getPhotoUrl error:', error);
            return { success: false, error: error.message };
        }
    }

    // =====================================================
    // MASTER FILE CRUD FUNCTIONS (Edit Master page)
    // =====================================================

    async listMasterFiles(folderName, subfolder) {
        if (!this.isConfigured()) return { success: false, error: 'Not configured' };
        try {
            return await this.gGet('listMasterFiles', { folderName, subfolder });
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async uploadMasterFile(data) {
        if (!this.isConfigured()) return { success: false, error: 'Not configured' };
        try {
            return await this.gPost('uploadMasterFile', data);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async renameMasterFile(data) {
        if (!this.isConfigured()) return { success: false, error: 'Not configured' };
        try {
            return await this.gPost('renameMasterFile', data);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async deleteMasterFile(data) {
        if (!this.isConfigured()) return { success: false, error: 'Not configured' };
        try {
            return await this.gPost('deleteMasterFile', data);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Global instance
const sheetsDB = new GoogleSheetsDB();
