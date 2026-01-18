// create-display.js - Simplified version with dropdown selection
// Version 2.3 - Fixed CONFIG.GOOGLE_API_KEY usage

// Mapping dropdown ID ke nama folder di Google Drive
const PHOTO_FOLDER_MAP = {
    bumbu: 'Bumbu',
    mBumbu: 'Minyak Bumbu',
    si: 'Kode SI',
    karton: 'Kode Karton',
    etiket: 'Kode Etiket',
    etiketBanded: 'Five or Six in One',
    plakban: 'Plakban'
};

// Cache folder IDs setelah ditemukan
let folderIdCache = {};

let selectedPhotos = {};
let temporarySave = null;
let folderFiles = {};
let isEditMode = false;
let editRecordId = null;
let tempData = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    loadUserName();
    loadTempData();
    await initGoogleAPI();
});

// Load temp data from records page
function loadTempData() {
    const data = localStorage.getItem(CONFIG.STORAGE_KEYS.TEMP_DATA);
    if (data) {
        tempData = JSON.parse(data);
        console.log('📋 Loaded temp data:', tempData);
        
        // Check if this is edit mode
        if (tempData.isEdit) {
            isEditMode = true;
            editRecordId = tempData.id;
            console.log('📝 Edit mode enabled for record:', editRecordId);
        }
        
        // Prefill form with temp data
        prefillForm();
    }
}

// Prefill form with data from popup or edit record
function prefillForm() {
    if (!tempData) return;
    
    // Set form values
    if (tempData.flavor) document.getElementById('flavor').value = tempData.flavor;
    if (tempData.nomorMaterial) document.getElementById('nomorMaterial').value = tempData.nomorMaterial;
    if (tempData.negara) document.getElementById('negara').value = tempData.negara;
    
    // Handle tanggal - convert from various formats to YYYY-MM-DD for input[type="date"]
    if (tempData.tanggal) {
        let tanggalValue = tempData.tanggal;
        // If it's an ISO string or contains 'T', extract just the date part
        if (typeof tanggalValue === 'string' && tanggalValue.includes('T')) {
            tanggalValue = tanggalValue.split('T')[0];
        }
        // If it's a Date object, convert to YYYY-MM-DD
        if (tanggalValue instanceof Date) {
            tanggalValue = tanggalValue.toISOString().split('T')[0];
        }
        document.getElementById('tanggal').value = tanggalValue;
    }
    
    // If editing, also load existing photos
    if (tempData.photos && Object.keys(tempData.photos).length > 0) {
        selectedPhotos = { ...tempData.photos };
    }
    
    console.log('✅ Form prefilled with temp data');
}

// Initialize Google API
async function initGoogleAPI() {
    return new Promise((resolve) => {
        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    apiKey: CONFIG.GOOGLE_API_KEY,
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
                });
                console.log('✅ Google API initialized');
                await checkExistingConnection();
                resolve(true);
            } catch (error) {
                console.error('Error initializing Google API:', error);
                updateDriveStatus(false);
                resolve(false);
            }
        });
    });
}

// Check existing Google Drive connection from localStorage
async function checkExistingConnection() {
    try {
        // Get token from localStorage - it's stored as plain string (access_token only)
        const accessToken = localStorage.getItem(CONFIG.STORAGE_KEYS.GOOGLE_TOKEN);
        
        if (accessToken) {
            const isValid = await validateToken(accessToken);
            
            if (isValid) {
                // Set token as object for gapi.client
                gapi.client.setToken({ access_token: accessToken });
                updateDriveStatus(true);
                await loadAllDropdowns();
                return true;
            }
        }
        
        updateDriveStatus(false);
        return false;
    } catch (error) {
        console.error('Error checking connection:', error);
        updateDriveStatus(false);
        return false;
    }
}

async function validateToken(accessToken) {
    try {
        const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

function updateDriveStatus(isConnected) {
    const alertDiv = document.getElementById('googleDriveAlert');
    const connectedDiv = document.getElementById('googleDriveConnected');
    
    if (isConnected) {
        alertDiv.style.display = 'none';
        connectedDiv.style.display = 'flex';
    } else {
        alertDiv.style.display = 'flex';
        connectedDiv.style.display = 'none';
    }
}

function loadUserName() {
    // Get user from CONFIG.STORAGE_KEYS.USER (stored as JSON object)
    const userJson = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    let userName = 'User';
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            userName = user.name || 'User';
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
    document.getElementById('userName').textContent = userName;
}

// Helper function to get current user name
function getCurrentUserName() {
    const userJson = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            return user.name || 'Unknown';
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
    return 'Unknown';
}

function connectGoogleDrive() {
    window.location.href = 'records.html';
}

// Fixed: Go back to records.html instead of master.html
function goBack() {
    // Clear temp data when going back
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TEMP_DATA);
    window.location.href = 'records.html';
}

async function loadAllDropdowns() {
    showLoading('Memuat data dari Google Drive...');
    
    try {
        await gapi.client.load('drive', 'v3');
        
        for (const [key, folderName] of Object.entries(PHOTO_FOLDER_MAP)) {
            await loadDropdown(key, folderName);
        }
        
        // After loading dropdowns, select existing photos if editing
        if (isEditMode && tempData && tempData.photos) {
            selectExistingPhotos();
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error loading dropdowns:', error);
        showToast('Gagal memuat data dari Google Drive', 'error');
        hideLoading();
    }
}

// Get folder ID by folder name from main folder
async function getFolderIdByName(folderName) {
    // Check cache first
    if (folderIdCache[folderName]) {
        return folderIdCache[folderName];
    }
    
    try {
        const response = await gapi.client.drive.files.list({
            q: `'${CONFIG.GOOGLE_FOLDER_ID}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            pageSize: 1
        });
        
        if (response.result.files && response.result.files.length > 0) {
            const folderId = response.result.files[0].id;
            folderIdCache[folderName] = folderId;
            console.log(`📁 Found folder "${folderName}" with ID: ${folderId}`);
            return folderId;
        }
    } catch (error) {
        console.error(`Error getting folder ID for ${folderName}:`, error);
    }
    return null;
}

async function loadDropdown(dropdownId, folderName) {
    try {
        // First, get the folder ID by name
        const folderId = await getFolderIdByName(folderName);
        
        if (!folderId) {
            console.error(`Folder "${folderName}" not found`);
            return;
        }
        
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed=false and mimeType contains 'image/'`,
            fields: 'files(id, name, thumbnailLink, webContentLink)',
            orderBy: 'name',
            pageSize: 1000
        });
        
        const files = response.result.files || [];
        folderFiles[dropdownId] = files;
        
        // Setup autocomplete for this input
        setupAutocomplete(dropdownId, files);
        
    } catch (error) {
        console.error(`Error loading ${dropdownId}:`, error);
    }
}

// Setup autocomplete for an input field
function setupAutocomplete(inputId, files) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(inputId + 'Dropdown');
    
    if (!input || !dropdown) return;
    
    // Store files for this input
    input.dataset.files = JSON.stringify(files.map(f => ({
        id: f.id,
        name: f.name,
        thumbnailLink: f.thumbnailLink || '',
        webContentLink: f.webContentLink || ''
    })));
    
    // Input event - filter and show dropdown
    input.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        const filesData = JSON.parse(this.dataset.files || '[]');
        
        // If input is cleared, remove from selectedPhotos
        if (query.length === 0) {
            delete selectedPhotos[inputId];
            // Reset input style
            this.style.borderColor = '#e0e0e0';
            this.style.backgroundColor = 'white';
            // Show all files when empty
            showAutocompleteDropdown(inputId, filesData, dropdown);
        } else {
            // Filter files
            const filtered = filesData.filter(f => 
                f.name.toLowerCase().includes(query)
            );
            showAutocompleteDropdown(inputId, filtered, dropdown);
        }
        
        updateButtonStates();
    });
    
    // Focus event - show dropdown
    input.addEventListener('focus', function() {
        const filesData = JSON.parse(this.dataset.files || '[]');
        const query = this.value.toLowerCase().trim();
        
        if (query.length === 0) {
            showAutocompleteDropdown(inputId, filesData, dropdown);
        } else {
            const filtered = filesData.filter(f => 
                f.name.toLowerCase().includes(query)
            );
            showAutocompleteDropdown(inputId, filtered, dropdown);
        }
    });
    
    // Click outside to close
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

// Helper function to remove file extension
function removeExtension(filename) {
    if (!filename) return '';
    return filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
}

// Show autocomplete dropdown
function showAutocompleteDropdown(inputId, files, dropdown) {
    dropdown.innerHTML = '';
    
    if (files.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-no-results">Tidak ada hasil</div>';
    } else {
        files.forEach(file => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            // Display name without extension
            item.textContent = removeExtension(file.name);
            item.dataset.id = file.id;
            item.dataset.name = file.name;
            item.dataset.thumbnailLink = file.thumbnailLink;
            item.dataset.webContentLink = file.webContentLink;
            
            item.addEventListener('click', function() {
                selectAutocompleteItem(inputId, this);
            });
            
            dropdown.appendChild(item);
        });
    }
    
    dropdown.classList.remove('hidden');
}

// Select item from autocomplete
function selectAutocompleteItem(inputId, item) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(inputId + 'Dropdown');
    
    // Display without extension
    input.value = removeExtension(item.dataset.name);
    dropdown.classList.add('hidden');
    
    // Store selected photo
    selectedPhotos[inputId] = {
        id: item.dataset.id,
        name: item.dataset.name,
        thumbnailLink: item.dataset.thumbnailLink,
        webContentLink: item.dataset.webContentLink
    };
    
    // Highlight input to show selection
    input.style.borderColor = '#27ae60';
    input.style.backgroundColor = '#f0fff4';
    
    updateButtonStates();
}

// Map photo keys from Google Sheets format to input IDs
function mapPhotoKeyToInputId(key) {
    const keyMap = {
        'bumbu': 'bumbu',
        'm-bumbu': 'mBumbu',
        'mBumbu': 'mBumbu',
        'si': 'si',
        'karton': 'karton',
        'etiket': 'etiket',
        'etiket-banded': 'etiketBanded',
        'etiketBanded': 'etiketBanded',
        'plakban': 'plakban'
    };
    return keyMap[key] || key;
}

// Select existing photos when editing
function selectExistingPhotos() {
    if (!tempData || !tempData.photos) return;
    
    console.log('📷 Loading existing photos:', tempData.photos);
    
    for (const [type, photo] of Object.entries(tempData.photos)) {
        if (photo && photo.name) {
            // Map the key to the correct input ID
            const inputId = mapPhotoKeyToInputId(type);
            const input = document.getElementById(inputId);
            
            console.log(`📷 Processing photo: type=${type}, inputId=${inputId}, name=${photo.name}`);
            
            if (input) {
                // Remove extension from display
                const displayName = removeExtension(photo.name);
                input.value = displayName;
                input.style.borderColor = '#27ae60';
                input.style.backgroundColor = '#f0fff4';
                // Store with correct inputId key
                selectedPhotos[inputId] = {
                    ...photo,
                    name: photo.name // Keep original name with extension for lookup
                };
                console.log(`✅ Set ${inputId} = ${displayName}`);
            } else {
                console.warn(`⚠️ Input not found for: ${inputId}`);
            }
        }
    }
    
    updateButtonStates();
}

function getLabelText(dropdownId) {
    const labels = {
        bumbu: 'Bumbu',
        mBumbu: 'M. Bumbu',
        si: 'SI',
        karton: 'Karton',
        etiket: 'Etiket',
        etiketBanded: 'Etiket Banded',
        plakban: 'Plakban'
    };
    return labels[dropdownId] || dropdownId;
}

// handleDropdownChange removed - now using autocomplete

function updateButtonStates() {
    const hasTempSave = temporarySave !== null;
    
    // Show/hide buttons based on temporary save status
    const btnPreview = document.getElementById('btnPreview');
    const btnSaveAll = document.getElementById('btnSaveAll');
    
    if (hasTempSave) {
        btnPreview.style.display = 'inline-flex';
        btnSaveAll.style.display = 'inline-flex';
    } else {
        btnPreview.style.display = 'none';
        btnSaveAll.style.display = 'none';
    }
}

function saveTemporary() {
    const flavor = document.getElementById('flavor').value.trim();
    const nomorMaterial = document.getElementById('nomorMaterial').value.trim();
    const negara = document.getElementById('negara').value.trim();
    const tanggal = document.getElementById('tanggal').value;
    
    if (!flavor || !nomorMaterial || !negara || !tanggal) {
        showToast('Mohon lengkapi semua informasi display', 'error');
        return;
    }
    
    // Removed validation for minimum 1 photo - allow saving with any photos selected
    
    temporarySave = {
        id: isEditMode ? editRecordId : (tempData?.id || generateId()),
        flavor,
        nomorMaterial,
        negara,
        tanggal,
        photos: { ...selectedPhotos },
        isEdit: isEditMode
    };
    
    showToast('Data berhasil disimpan sementara', 'success');
    updateButtonStates();
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function showPreview() {
    if (!temporarySave) {
        showToast('Simpan sementara terlebih dahulu', 'error');
        return;
    }
    
    document.getElementById('previewFlavor').textContent = temporarySave.flavor;
    document.getElementById('previewNomorMaterial').textContent = temporarySave.nomorMaterial;
    document.getElementById('previewNegara').textContent = temporarySave.negara;
    document.getElementById('previewTanggal').textContent = formatDate(temporarySave.tanggal);
    
    const photosContainer = document.getElementById('previewPhotos');
    photosContainer.innerHTML = '';
    
    for (const [type, photo] of Object.entries(temporarySave.photos)) {
        // Skip null, undefined, or empty photo entries
        if (!photo || !photo.name) {
            continue;
        }
        
        const photoCard = document.createElement('div');
        photoCard.style.cssText = 'background: white; border: 2px solid #e0e0e0; border-radius: 8px; overflow: hidden;';
        
        // Use thumbnailLink or directLink, with fallback to a gray placeholder div
        const imgSrc = photo.thumbnailLink || photo.directLink || '';
        const displayName = removeExtension(photo.name || '');
        
        if (imgSrc) {
            photoCard.innerHTML = `
                <img src="${imgSrc}" alt="${displayName}" style="width: 100%; height: 150px; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div style="display: none; width: 100%; height: 150px; background: #f0f0f0; align-items: center; justify-content: center; color: #999;">
                    <i class="fas fa-image" style="font-size: 48px;"></i>
                </div>
                <div style="padding: 10px;">
                    <div style="font-weight: 600; margin-bottom: 5px;">${getLabelText(type)}</div>
                    <div style="font-size: 12px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayName}</div>
                </div>
            `;
        } else {
            // No image URL available - show placeholder with name
            photoCard.innerHTML = `
                <div style="width: 100%; height: 150px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999;">
                    <i class="fas fa-image" style="font-size: 48px;"></i>
                </div>
                <div style="padding: 10px;">
                    <div style="font-weight: 600; margin-bottom: 5px;">${getLabelText(type)}</div>
                    <div style="font-size: 12px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayName}</div>
                </div>
            `;
        }
        photosContainer.appendChild(photoCard);
    }
    
    // Show message if no photos selected
    if (photosContainer.children.length === 0) {
        photosContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Tidak ada foto yang dipilih</div>';
    }
    
    document.getElementById('previewModal').style.display = 'flex';
}

function closePreview() {
    document.getElementById('previewModal').style.display = 'none';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
}

async function saveAll() {
    if (!temporarySave) {
        showToast('Simpan sementara terlebih dahulu', 'error');
        return;
    }
    
    showLoading(isEditMode ? 'Mengupdate data...' : 'Menyimpan data...');
    
    try {
        // Helper to get just the filename without extension
        const getPhotoName = (photo) => {
            if (!photo || !photo.name) return '';
            return removeExtension(photo.name);
        };
        
        // Build record object for SheetsDB - store only filename (no extension, no JSON)
        const record = {
            id: temporarySave.id,
            tanggal: temporarySave.tanggal,
            nomorMaterial: temporarySave.nomorMaterial,
            flavor: temporarySave.flavor,
            negara: temporarySave.negara,
            photos: {
                bumbu: getPhotoName(temporarySave.photos.bumbu),
                mBumbu: getPhotoName(temporarySave.photos.mBumbu),
                si: getPhotoName(temporarySave.photos.si),
                karton: getPhotoName(temporarySave.photos.karton),
                etiket: getPhotoName(temporarySave.photos.etiket),
                etiketBanded: getPhotoName(temporarySave.photos.etiketBanded),
                plakban: getPhotoName(temporarySave.photos.plakban)
            },
            createdBy: getCurrentUserName(),
            createdAt: new Date().toISOString()
        };
        
        // Use GoogleSheetsDB to save (via Google Apps Script)
        const sheetsDB = new GoogleSheetsDB();
        let result;
        
        if (isEditMode) {
            result = await sheetsDB.updateRecord(temporarySave.id, record);
        } else {
            result = await sheetsDB.addRecord(record);
        }
        
        if (!result || result.error) {
            throw new Error(result?.error || 'Failed to save data');
        }
        
        // Clear temp data after successful save
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TEMP_DATA);
        
        hideLoading();
        closePreview();
        showToast(isEditMode ? 'Data berhasil diupdate!' : 'Data berhasil disimpan!', 'success');
        
        setTimeout(() => {
            window.location.href = 'records.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error saving data:', error);
        hideLoading();
        showToast('Gagal menyimpan data: ' + error.message, 'error');
    }
}

// addRecordToSheet and updateRecordInSheet removed - now using SheetsDB via Google Apps Script

function resetForm() {
    document.getElementById('flavor').value = '';
    document.getElementById('nomorMaterial').value = '';
    document.getElementById('negara').value = '';
    document.getElementById('tanggal').valueAsDate = new Date();
    
    ['bumbu', 'mBumbu', 'si', 'karton', 'etiket', 'etiketBanded', 'plakban'].forEach(id => {
        document.getElementById(id).selectedIndex = 0;
    });
    
    selectedPhotos = {};
    temporarySave = null;
    isEditMode = false;
    editRecordId = null;
    updateButtonStates();
}

function showLoading(text = 'Memuat...') {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Toggle edit mode for info fields
function toggleEditInfo() {
    const fields = ['flavor', 'nomorMaterial', 'negara', 'tanggal'];
    fields.forEach(id => {
        const input = document.getElementById(id);
        input.readOnly = !input.readOnly;
        input.style.backgroundColor = input.readOnly ? '#f5f5f5' : 'white';
    });
}
