// create-display.js - Simplified version with dropdown selection
// Version 2.1 - Fixed auto-connect, back button, edit mode, and form prefill

const PHOTO_FOLDER_MAP = {
    bumbu: '1GlJq4WxEsLpGCLz6W1Xw0KG7qUiNuCGo',
    mBumbu: '1f7d9Xk8lAFN8v0kFdMw_0dP-0c28YLFe',
    si: '1Lr63wNhh-PElCuFG6T3YD63AcdyGQMLX',
    karton: '1q1CqOsD2Z_0K0XvF2Y5T55_K2fUoHYo7',
    etiket: '1xbpxXdBDxhqSNuqwBvOEz1wQ3PYWrHWi',
    etiketBanded: '1BjxZ9YwCl2fTHYQo7OdEAGV0eSqbPZNP',
    plakban: '1UEm4CQ05sZcT_zW2I2XMFX5JGDwMvOoZ'
};

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
    if (tempData.tanggal) document.getElementById('tanggal').value = tempData.tanggal;
    
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
                    apiKey: CONFIG.API_KEY,
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
    const userName = localStorage.getItem('userName') || 'User';
    document.getElementById('userName').textContent = userName;
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
        
        for (const [key, folderId] of Object.entries(PHOTO_FOLDER_MAP)) {
            await loadDropdown(key, folderId);
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

async function loadDropdown(dropdownId, folderId) {
    try {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed=false and mimeType contains 'image/'`,
            fields: 'files(id, name, thumbnailLink, webContentLink)',
            orderBy: 'name',
            pageSize: 1000
        });
        
        const files = response.result.files || [];
        folderFiles[dropdownId] = files;
        
        const dropdown = document.getElementById(dropdownId);
        dropdown.innerHTML = `<option value="">-- Pilih ${getLabelText(dropdownId)} --</option>`;
        
        files.forEach(file => {
            const option = document.createElement('option');
            option.value = file.id;
            option.textContent = file.name;
            option.dataset.thumbnailLink = file.thumbnailLink || '';
            option.dataset.webContentLink = file.webContentLink || '';
            dropdown.appendChild(option);
        });
        
    } catch (error) {
        console.error(`Error loading ${dropdownId}:`, error);
    }
}

// Select existing photos when editing
function selectExistingPhotos() {
    if (!tempData || !tempData.photos) return;
    
    for (const [type, photo] of Object.entries(tempData.photos)) {
        if (photo && photo.id) {
            const dropdown = document.getElementById(type);
            if (dropdown) {
                // Find option with matching ID
                for (let i = 0; i < dropdown.options.length; i++) {
                    if (dropdown.options[i].value === photo.id) {
                        dropdown.selectedIndex = i;
                        selectedPhotos[type] = photo;
                        break;
                    }
                }
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

function handleDropdownChange(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    const selectedOption = dropdown.options[dropdown.selectedIndex];
    
    if (selectedOption.value) {
        selectedPhotos[dropdownId] = {
            id: selectedOption.value,
            name: selectedOption.textContent,
            thumbnailLink: selectedOption.dataset.thumbnailLink,
            webContentLink: selectedOption.dataset.webContentLink
        };
    } else {
        delete selectedPhotos[dropdownId];
    }
    
    updateButtonStates();
}

function updateButtonStates() {
    const hasSelections = Object.keys(selectedPhotos).length > 0;
    const hasTempSave = temporarySave !== null;
    
    document.getElementById('btnPreview').disabled = !hasTempSave;
    document.getElementById('btnSaveAll').disabled = !hasTempSave;
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
    
    if (Object.keys(selectedPhotos).length === 0) {
        showToast('Pilih minimal 1 foto', 'error');
        return;
    }
    
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
        const photoCard = document.createElement('div');
        photoCard.style.cssText = 'background: white; border: 2px solid #e0e0e0; border-radius: 8px; overflow: hidden;';
        
        const imgSrc = photo.thumbnailLink || 'assets/placeholder.png';
        photoCard.innerHTML = `
            <img src="${imgSrc}" alt="${photo.name}" style="width: 100%; height: 150px; object-fit: cover;" onerror="this.src='assets/placeholder.png'">
            <div style="padding: 10px;">
                <div style="font-weight: 600; margin-bottom: 5px;">${getLabelText(type)}</div>
                <div style="font-size: 12px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${photo.name}</div>
            </div>
        `;
        photosContainer.appendChild(photoCard);
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
    
    showLoading(isEditMode ? 'Mengupdate data...' : 'Menyimpan data ke Google Sheets...');
    
    try {
        const rowData = [
            temporarySave.id,
            temporarySave.tanggal,
            temporarySave.nomorMaterial,
            temporarySave.flavor,
            temporarySave.negara,
            temporarySave.photos.bumbu?.webContentLink || '',
            temporarySave.photos.mBumbu?.webContentLink || '',
            temporarySave.photos.si?.webContentLink || '',
            temporarySave.photos.karton?.webContentLink || '',
            temporarySave.photos.etiket?.webContentLink || '',
            temporarySave.photos.etiketBanded?.webContentLink || '',
            temporarySave.photos.plakban?.webContentLink || '',
            localStorage.getItem('userName') || 'Unknown',
            new Date().toISOString()
        ];
        
        const token = gapi.client.getToken();
        if (!token || !token.access_token) {
            throw new Error('Google Drive not connected');
        }
        
        if (isEditMode) {
            // Update existing record
            await updateRecordInSheet(rowData);
        } else {
            // Add new record
            await addRecordToSheet(rowData);
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

async function addRecordToSheet(rowData) {
    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/Display!A:N:append?valueInputOption=USER_ENTERED`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [rowData]
            })
        }
    );
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to save to Google Sheets');
    }
    
    return response.json();
}

async function updateRecordInSheet(rowData) {
    // First find the row number of the record
    const searchResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/Display!A:A`,
        {
            headers: {
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`
            }
        }
    );
    
    if (!searchResponse.ok) {
        throw new Error('Failed to search for record');
    }
    
    const searchResult = await searchResponse.json();
    const values = searchResult.values || [];
    
    let rowIndex = -1;
    for (let i = 0; i < values.length; i++) {
        if (values[i][0] === editRecordId || values[i][0] === String(editRecordId)) {
            rowIndex = i + 1; // Sheets is 1-indexed
            break;
        }
    }
    
    if (rowIndex === -1) {
        throw new Error('Record not found in sheet');
    }
    
    // Update the row
    const updateResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/Display!A${rowIndex}:N${rowIndex}?valueInputOption=USER_ENTERED`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [rowData]
            })
        }
    );
    
    if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.error?.message || 'Failed to update record');
    }
    
    return updateResponse.json();
}

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
