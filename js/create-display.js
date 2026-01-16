// create-display.js - Simplified version with dropdown selection

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

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkExistingConnection();
    loadUserName();
});

async function checkExistingConnection() {
    try {
        const token = await getFromStorage(CONFIG.STORAGE_KEYS.GOOGLE_TOKEN);
        
        if (token && token.access_token) {
            const isValid = await validateToken(token.access_token);
            
            if (isValid) {
                gapi.client.setToken(token);
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

function goBack() {
    window.location.href = 'master.html';
}

async function loadAllDropdowns() {
    showLoading('Memuat data dari Google Drive...');
    
    try {
        await gapi.client.load('drive', 'v3');
        
        for (const [key, folderId] of Object.entries(PHOTO_FOLDER_MAP)) {
            await loadDropdown(key, folderId);
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
            option.dataset.thumbnailLink = file.thumbnailLink;
            option.dataset.webContentLink = file.webContentLink;
            dropdown.appendChild(option);
        });
        
    } catch (error) {
        console.error(`Error loading ${dropdownId}:`, error);
    }
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
        flavor,
        nomorMaterial,
        negara,
        tanggal,
        photos: { ...selectedPhotos }
    };
    
    showToast('Data berhasil disimpan sementara', 'success');
    updateButtonStates();
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
        photoCard.innerHTML = `
            <img src="${photo.thumbnailLink}" alt="${photo.name}" style="width: 100%; height: 150px; object-fit: cover;">
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
    
    showLoading('Menyimpan data ke Google Sheets...');
    
    try {
        const rowData = [
            new Date().toISOString(),
            temporarySave.flavor,
            temporarySave.nomorMaterial,
            temporarySave.negara,
            temporarySave.tanggal,
            temporarySave.photos.bumbu?.webContentLink || '',
            temporarySave.photos.mBumbu?.webContentLink || '',
            temporarySave.photos.si?.webContentLink || '',
            temporarySave.photos.karton?.webContentLink || '',
            temporarySave.photos.etiket?.webContentLink || '',
            temporarySave.photos.etiketBanded?.webContentLink || '',
            temporarySave.photos.plakban?.webContentLink || '',
            localStorage.getItem('userName') || 'Unknown'
        ];
        
        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/Display!A:M:append?valueInputOption=USER_ENTERED`,
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
            throw new Error('Failed to save to Google Sheets');
        }
        
        hideLoading();
        closePreview();
        showToast('Data berhasil disimpan!', 'success');
        
        setTimeout(() => {
            resetForm();
        }, 1500);
        
    } catch (error) {
        console.error('Error saving data:', error);
        hideLoading();
        showToast('Gagal menyimpan data', 'error');
    }
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

async function getFromStorage(key) {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
            resolve(result[key]);
        });
    });
}
