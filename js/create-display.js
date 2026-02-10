// create-display.js - Simplified version with dropdown selection
// Version 2.11 - Updated with hardcoded folder IDs for reliability

// ✅ Mapping dropdown ID ke Folder ID (direct, no name search)
// This eliminates need to search for folders by name
const PHOTO_FOLDER_MAP = {
    bumbu: {
        folderId: '1g1d10dRO-QN68ql040zPkpkjY6hLVg6n',
        displayName: 'Bumbu'
    },
    mBumbu: {
        folderId: '1AT6PNYBzS-liQnkhhnuZ879aJzW-gqJr',
        displayName: 'Minyak Bumbu'
    },
    si: {
        folderId: '1i2MtTqMqAX69xOaeG7OD459bZ8-0Jvoe',
        displayName: 'Kode SI'
    },
    kartonDepan: {
        folderId: '1Ir9xspi65occGhji0PgzCWcPCzght0go',
        displayName: 'Kode Karton - Depan',
        isSubfolder: true,
        subfolder: 'Depan'
    },
    kartonBelakang: {
        folderId: '1Ir9xspi65occGhji0PgzCWcPCzght0go',
        displayName: 'Kode Karton - Belakang',
        isSubfolder: true,
        subfolder: 'Belakang'
    },
    etiket: {
        folderId: '1BFC4dPid2CbSucbKNDiZLF2EjVSJFIWm',
        displayName: 'Kode Etiket'
    },
    etiketBanded: {
        folderId: '1le0FW7i-LnKmK_42jNZqeYXIf3trtoEh',
        displayName: 'Five or Six in One'
    },
    plakban: {
        folderId: '1CJvilkGJc6zGqdzYjeKO4ngZSJx0yfqP',
        displayName: 'Plakban'
    }
};

// Cache untuk subfolder IDs (Depan, Belakang di bawah Kode Karton)
let subfolderIdCache = {};

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
    if (tempData.distributor) document.getElementById('distributor').value = tempData.distributor;
    
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
        // Check if scope version changed (force re-auth when scope upgraded)
        const savedScope = localStorage.getItem('validDisplay_driveScope');
        if (savedScope !== CONFIG.SCOPES) {
            console.warn('⚠️ Drive scope changed! Old:', savedScope, '→ New:', CONFIG.SCOPES);
            console.warn('⚠️ Clearing old token - user needs to re-login');
            localStorage.removeItem(CONFIG.STORAGE_KEYS.GOOGLE_TOKEN);
            localStorage.removeItem('validDisplay_driveScope');
            return false;
        }
        
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
        
        // Load all dropdowns using hardcoded folder IDs (no name search)
        for (const [key, folderConfig] of Object.entries(PHOTO_FOLDER_MAP)) {
            await loadDropdown(key, folderConfig);
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

// ✅ NEW: Get folder ID from config (hardcoded, no name search)
async function getFolderIdFromConfig(dropdownKey) {
    if (!PHOTO_FOLDER_MAP[dropdownKey]) {
        console.error(`❌ Folder config not found for key: ${dropdownKey}`);
        return null;
    }
    
    const folderConfig = PHOTO_FOLDER_MAP[dropdownKey];
    const folderId = folderConfig.folderId;
    
    console.log(`✅ Using folder ID for "${folderConfig.displayName}": ${folderId}`);
    return folderId;
}

// ✅ NEW: Get subfolder ID by searching inside parent folder (for Karton Depan/Belakang)
async function getSubfolderId(parentFolderId, subfolderName) {
    const cacheKey = `${parentFolderId}/${subfolderName}`;
    
    if (subfolderIdCache[cacheKey]) {
        return subfolderIdCache[cacheKey];
    }
    
    try {
        const response = await gapi.client.drive.files.list({
            q: `'${parentFolderId}' in parents and name='${subfolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            pageSize: 1
        });
        
        if (response.result.files && response.result.files.length > 0) {
            const subFolderId = response.result.files[0].id;
            subfolderIdCache[cacheKey] = subFolderId;
            console.log(`✅ Found subfolder "${subfolderName}" with ID: ${subFolderId}`);
            return subFolderId;
        } else {
            console.warn(`⚠️ Subfolder "${subfolderName}" not found in parent folder`);
            return null;
        }
    } catch (err) {
        console.warn(`⚠️ Error searching for subfolder "${subfolderName}":`, err.message);
        return null;
    }
}

async function loadDropdown(dropdownId, folderConfig) {
    try {
        // Get folder ID from config (hardcoded, no search needed)
        let folderId = await getFolderIdFromConfig(dropdownId);
        
        if (!folderId) {
            console.warn(`⚠️ Folder config not found for "${dropdownId}"`);
            document.getElementById(dropdownId).innerHTML = '<option value="">-- Tidak ada data --</option>';
            return;
        }
        
        // If this is a subfolder (e.g., Karton Depan/Belakang), search for it
        if (folderConfig.isSubfolder && folderConfig.subfolder) {
            const subFolderId = await getSubfolderId(folderId, folderConfig.subfolder);
            if (subFolderId) {
                folderId = subFolderId;
                console.log(`✅ Using subfolder "${folderConfig.subfolder}": ${folderId}`);
            } else {
                console.warn(`⚠️ Subfolder "${folderConfig.subfolder}" not found`);
                // Try to use parent folder anyway
            }
        }
        
        // Now get files from the folder
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed=false and mimeType contains 'image/'`,
            fields: 'files(id, name, thumbnailLink, webContentLink)',
            orderBy: 'name',
            pageSize: 1000
        });
        
        const files = response.result.files || [];
        console.log(`✅ Loaded ${files.length} files for "${folderConfig.displayName}"`);
        
        folderFiles[dropdownId] = files;
        
        // Setup autocomplete for this input
        setupAutocomplete(dropdownId, files);
        
    } catch (error) {
        console.error(`❌ Error loading ${dropdownId}:`, error);
        const displayName = folderConfig?.displayName || dropdownId;
        console.warn(`⚠️ Dropdown untuk "${displayName}" akan kosong - user bisa input manual`);
        document.getElementById(dropdownId).innerHTML = '<option value="">-- Tidak ada data --</option>';
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
// Supports backward compatibility for old 'karton' key
function mapPhotoKeyToInputId(key) {
    const keyMap = {
        'bumbu': 'bumbu',
        'm-bumbu': 'mBumbu',
        'mBumbu': 'mBumbu',
        'si': 'si',
        // New split keys
        'karton-depan': 'kartonDepan',
        'kartonDepan': 'kartonDepan',
        'karton-belakang': 'kartonBelakang',
        'kartonBelakang': 'kartonBelakang',
        // Backward compatibility for old single 'karton' key - maps to kartonDepan as default
        'karton': 'kartonDepan',
        'etiket': 'etiket',
        'etiket-banded': 'etiketBanded',
        'etiketBanded': 'etiketBanded',
        'plakban': 'plakban'
    };
    return keyMap[key] || key;
}

// Select existing photos when editing
function selectExistingPhotos() {
    if (!tempData) return;
    
    // Build photos from either tempData.photos OR direct photo_* fields in record
    let photos = {};
    
    if (tempData.photos && typeof tempData.photos === 'object' && Object.keys(tempData.photos).length > 0) {
        // Format 1: photos object { bumbu: { name: 'ABK-MF-TP', id: '...' }, ... }
        photos = tempData.photos;
    } else {
        // Format 2: flat record fields photo_bumbu, photo_mbumbu, etc. (from getRecordsBasic)
        const photoFieldMap = {
            'photo_bumbu': 'bumbu',
            'photo_mbumbu': 'm-bumbu',
            'photo_si': 'si',
            'photo_kartonDepan': 'karton-depan',
            'photo_kartonBelakang': 'karton-belakang',
            'photo_etiket': 'etiket',
            'photo_etiketbanded': 'etiket-banded',
            'photo_plakban': 'plakban'
        };
        
        for (const [field, photoKey] of Object.entries(photoFieldMap)) {
            const value = tempData[field];
            if (value && typeof value === 'string' && value.trim()) {
                photos[photoKey] = { name: value.trim() };
            } else if (value && typeof value === 'object' && value.name) {
                photos[photoKey] = value;
            }
        }
    }
    
    if (Object.keys(photos).length === 0) {
        console.log('📷 No existing photos to load');
        return;
    }
    
    console.log('📷 Loading existing photos:', photos);
    
    for (const [type, photo] of Object.entries(photos)) {
        // Get the photo name - handle both string and object format
        const photoName = (typeof photo === 'string') ? photo : (photo.name || '');
        
        if (!photoName) continue;
        
        // Map the key to the correct input ID
        const inputId = mapPhotoKeyToInputId(type);
        const input = document.getElementById(inputId);
        
        console.log(`📷 Processing photo: type=${type}, inputId=${inputId}, name=${photoName}`);
        
        if (input) {
            // Remove extension from display
            const displayName = removeExtension(photoName);
            input.value = displayName;
            input.style.borderColor = '#27ae60';
            input.style.backgroundColor = '#f0fff4';
            
            // Store selected photo - try to find matching file in loaded folder files
            const photoObj = (typeof photo === 'object') ? photo : { name: photoName };
            
            // Try to match with loaded folder files for ID/thumbnail
            if (folderFiles[inputId] && folderFiles[inputId].length > 0) {
                const matchedFile = folderFiles[inputId].find(f => {
                    const fName = removeExtension(f.name).toLowerCase();
                    return fName === displayName.toLowerCase();
                });
                if (matchedFile) {
                    photoObj.id = matchedFile.id;
                    photoObj.name = matchedFile.name;
                    photoObj.thumbnailLink = matchedFile.thumbnailLink || '';
                    console.log(`✅ Matched with Drive file: ${matchedFile.name}`);
                }
            }
            
            selectedPhotos[inputId] = photoObj;
            console.log(`✅ Set ${inputId} = ${displayName}`);
        } else {
            console.warn(`⚠️ Input not found for: ${inputId}`);
        }
    }
    
    updateButtonStates();
}

function getLabelText(dropdownId) {
    const labels = {
        bumbu: 'Bumbu',
        mBumbu: 'M. Bumbu',
        si: 'SI',
        kartonDepan: 'Karton Depan',
        kartonBelakang: 'Karton Belakang',
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
    const distributor = document.getElementById('distributor').value.trim();
    const tanggal = document.getElementById('tanggal').value;
    
    if (!flavor || !nomorMaterial || !negara || !tanggal) {
        showToast('Mohon lengkapi semua informasi display', 'error');
        return;
    }
    
    // Mapping between input IDs and possible keys in selectedPhotos
    // (from Google Sheets data which uses dash format)
    const photoKeyMapping = {
        'bumbu': ['bumbu'],
        'mBumbu': ['mBumbu', 'm-bumbu'],
        'si': ['si'],
        'kartonDepan': ['kartonDepan', 'karton-depan'],
        'kartonBelakang': ['kartonBelakang', 'karton-belakang'],
        'etiket': ['etiket'],
        'etiketBanded': ['etiketBanded', 'etiket-banded'],
        'plakban': ['plakban']
    };
    
    // Build clean photos object based on current input values
    const cleanPhotos = {};
    
    Object.entries(photoKeyMapping).forEach(([inputId, possibleKeys]) => {
        const input = document.getElementById(inputId);
        if (input) {
            const inputValue = input.value.trim();
            if (inputValue) {
                // Input has value, find the photo data from selectedPhotos
                let photoData = null;
                for (const key of possibleKeys) {
                    if (selectedPhotos[key]) {
                        photoData = selectedPhotos[key];
                        break;
                    }
                }
                if (photoData) {
                    cleanPhotos[inputId] = photoData;
                }
            } else {
                // Input is empty, reset style
                input.style.borderColor = '#e0e0e0';
                input.style.backgroundColor = 'white';
            }
        }
    });
    
    // Replace selectedPhotos with clean version
    selectedPhotos = cleanPhotos;
    
    console.log('📷 Selected photos after sync:', selectedPhotos);
    
    temporarySave = {
        id: isEditMode ? editRecordId : (tempData?.id || generateId()),
        flavor,
        nomorMaterial,
        negara,
        distributor,
        tanggal,
        photos: { ...selectedPhotos },
        isEdit: isEditMode
    };
    
    console.log('💾 Temporary save:', temporarySave);
    
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
    document.getElementById('previewDistributor').textContent = temporarySave.distributor || '-';
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
            distributor: temporarySave.distributor,
            photos: {
                bumbu: getPhotoName(temporarySave.photos.bumbu),
                mBumbu: getPhotoName(temporarySave.photos.mBumbu),
                si: getPhotoName(temporarySave.photos.si),
                kartonDepan: getPhotoName(temporarySave.photos.kartonDepan),
                kartonBelakang: getPhotoName(temporarySave.photos.kartonBelakang),
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
    
    ['bumbu', 'mBumbu', 'si', 'kartonDepan', 'kartonBelakang', 'etiket', 'etiketBanded', 'plakban'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = '';
            el.style.borderColor = '#e0e0e0';
            el.style.backgroundColor = 'white';
        }
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
