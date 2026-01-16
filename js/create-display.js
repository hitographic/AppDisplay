// VALID DISPLAY - Create Display Page Script v2.1
// VALID DISPLAY - Create Display Page Script
// =====================================================

let currentData = null;
let uploadedPhotos = {};
let currentCameraType = null;
let cameraStream = null;

// Master data for autocomplete
let masterDataList = [];
let currentNewMasterType = null;
let newMasterPhotoData = null;
let newMasterPendingData = []; // Store pending new master data to save on "Simpan Semua"

// Photo type to Master field mapping
const PHOTO_FIELD_MAP = {
    'bumbu': 'bumbu',
    'm-bumbu': 'minyakBumbu',
    'si': 'kodeSI',
    'karton': 'kodeKarton',
    'etiket': 'kodeEtiket',
    'etiket-banded': 'fiveOrSixInOne',
    'plakban': 'plakban'
};

// Photo type to Drive folder mapping
const PHOTO_FOLDER_MAP = {
    'bumbu': 'Bumbu',
    'm-bumbu': 'Minyak Bumbu',
    'si': 'Kode SI',
    'karton': 'Kode Karton',
    'etiket': 'Kode Etiket',
    'etiket-banded': 'Five or Six in One',
    'plakban': 'Plakban'
};

// Helper function to check Google Drive connection
function isGoogleDriveConnected() {
    return window.gapiLoaded && window.gapi && window.gapi.client && window.gapi.client.getToken && window.gapi.client.getToken() !== null;
}

// Make goBack available globally immediately
window.goBack = function() {
    if (confirm('Data yang belum disimpan akan hilang. Lanjutkan?')) {
        storage.clearTempData();
        window.location.href = 'records.html';
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Protect page
    if (!protectPage()) return;

    // Only users with editor permission can access this page
    if (!hasPermission('records_editor')) {
        showToast('Anda tidak memiliki akses ke halaman ini', 'error');
        setTimeout(() => {
            window.location.href = 'records.html';
        }, 1500);
        return;
    }

    // Initialize page
    initCreateDisplayPage();
});

async function initCreateDisplayPage() {
    try {
        // Load temp data
        currentData = storage.getTempData();
        
        if (!currentData) {
            showToast('Data tidak ditemukan. Kembali ke halaman sebelumnya.', 'error');
            setTimeout(() => {
                window.location.href = 'records.html';
            }, 1500);
            return;
        }

        console.log('📋 Current data loaded:', currentData);

        // Display info
        displayInfo();

        // Load existing photos if editing
        if (currentData.photos) {
            uploadedPhotos = { ...currentData.photos };
            loadExistingPhotos();
        }

        // Load existing kode produksi
        if (currentData.kodeProduksi) {
            loadExistingKodeProduksi();
        }

        // Initialize file inputs
        initFileInputs();

        // Initialize Google API for uploads
        await initGoogleAPI();
        
        // Load Master data for autocomplete (filtered by negara)
        await loadMasterDataForAutocomplete();
        
        // Initialize autocomplete for master inputs
        initMasterAutocomplete();
        
        console.log('✅ Create Display page initialized');
    } catch (error) {
        console.error('❌ Error initializing page:', error);
        showToast('Terjadi kesalahan saat memuat halaman', 'error');
    }
}

function displayInfo() {
    document.getElementById('infoFlavor').textContent = currentData.flavor;
    document.getElementById('infoNegara').textContent = currentData.negara;
    document.getElementById('infoTanggal').textContent = formatDate(currentData.tanggal);
    
    // Display nomor material if exists
    const infoNomorMaterial = document.getElementById('infoNomorMaterial');
    if (infoNomorMaterial) {
        infoNomorMaterial.textContent = currentData.nomorMaterial || '-';
    }
    
    // Show edit button if in edit mode
    const btnEditFlavor = document.getElementById('btnEditFlavor');
    if (btnEditFlavor && currentData.isEdit) {
        btnEditFlavor.style.display = 'inline-block';
    }
}

function loadExistingPhotos() {
    CONFIG.PHOTO_TYPES.forEach(type => {
        if (uploadedPhotos[type.id]) {
            updatePhotoPreview(type.id, uploadedPhotos[type.id]);
        }
    });
}

function loadExistingKodeProduksi() {
    if (!currentData.kodeProduksi || currentData.kodeProduksi.length === 0) return;

    currentData.kodeProduksi.forEach((kode, index) => {
        const inputEl = document.getElementById(`kode${index + 1}`);
        if (inputEl) {
            // Support both old format (array) and new format (string)
            if (Array.isArray(kode)) {
                // Old format: combine array into single string
                inputEl.value = kode.filter(k => k).join(' ');
            } else {
                // New format: direct string
                inputEl.value = kode || '';
            }
        }
    });
}

async function initGoogleAPI() {
    try {
        await auth.initGoogleAPI();
        await auth.initGoogleIdentity();

        // Listen for token received event
        window.addEventListener('googleTokenReceived', () => {
            showToast('Google Drive terkoneksi!', 'success');
            updateDriveStatus(true);
            closeDriveConnectPopup();
        });

        // Update initial status
        const isConnected = auth.hasGoogleToken() && checkConfig();
        updateDriveStatus(isConnected);

        // Show popup if not connected (only if config is valid)
        if (!isConnected && checkConfig()) {
            showDriveConnectPopup();
        }
    } catch (error) {
        console.error('Error initializing Google API:', error);
        updateDriveStatus(false);
    }
}

// ==================== GOOGLE DRIVE POPUP ====================

function showDriveConnectPopup() {
    const popup = document.getElementById('driveConnectPopup');
    if (popup) {
        popup.classList.remove('hidden');
    }
}

function closeDriveConnectPopup() {
    const popup = document.getElementById('driveConnectPopup');
    if (popup) {
        popup.classList.add('hidden');
    }
}

async function connectGoogleDriveFromPopup() {
    const statusDiv = document.getElementById('driveConnectStatus');
    const btnConnect = document.getElementById('btnConnectDrivePopup');
    
    btnConnect.disabled = true;
    btnConnect.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghubungkan...';
    
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.style.backgroundColor = '#fff3cd';
        statusDiv.style.color = '#856404';
        statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menunggu koneksi...';
    }
    
    try {
        await auth.requestGoogleToken();
        
        if (auth.hasGoogleToken()) {
            if (statusDiv) {
                statusDiv.style.backgroundColor = '#d4edda';
                statusDiv.style.color = '#155724';
                statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> Berhasil terhubung!';
            }
            updateDriveStatus(true);
            showToast('Google Drive berhasil terkoneksi!', 'success');
            
            // Close popup after 1 second
            setTimeout(() => {
                closeDriveConnectPopup();
            }, 1000);
        } else {
            throw new Error('Token tidak tersedia');
        }
    } catch (error) {
        console.error('Error connecting:', error);
        if (statusDiv) {
            statusDiv.style.backgroundColor = '#f8d7da';
            statusDiv.style.color = '#721c24';
            statusDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Gagal terhubung. Silakan coba lagi.';
        }
        btnConnect.disabled = false;
        btnConnect.innerHTML = '<i class="fas fa-link"></i> Hubungkan Google Drive';
    }
}

function skipGoogleDriveConnection() {
    const confirm = window.confirm(
        '⚠️ Peringatan!\n\n' +
        'Tanpa Google Drive, foto hanya akan disimpan di browser.\n' +
        'Jika Anda menghapus data browser, foto akan hilang.\n\n' +
        'Yakin ingin melanjutkan tanpa Google Drive?'
    );
    
    if (confirm) {
        closeDriveConnectPopup();
        showToast('Foto akan disimpan di local storage', 'warning');
    }
}

// ==================== EDIT FLAVOR & NEGARA WITH MASTER DATA ====================

// selectedMaster for edit popup
let selectedMaster = null;

async function loadMasterDataForDropdown() {
    try {
        console.log('📥 Loading master data for dropdown...');
        const result = await sheetsDB.getMasterData();
        if (result.success) {
            masterDataList = result.data || [];
            console.log('✅ Loaded', masterDataList.length, 'master records');
            return masterDataList;
        }
    } catch (error) {
        console.error('❌ Error loading master data:', error);
    }
    return [];
}

function populateMasterDropdown() {
    const select = document.getElementById('editMasterSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Pilih Master Data --</option>';
    
    masterDataList.forEach(master => {
        const option = document.createElement('option');
        option.value = master.id;
        option.textContent = `${master.flavor} (${master.negara})`;
        option.dataset.negara = master.negara;
        option.dataset.flavor = master.flavor;
        select.appendChild(option);
    });
}

function onMasterSelected() {
    const select = document.getElementById('editMasterSelect');
    const masterId = select.value;
    
    if (masterId) {
        selectedMaster = masterDataList.find(m => String(m.id) === String(masterId));
        if (selectedMaster) {
            document.getElementById('editFlavor').value = selectedMaster.flavor;
            document.getElementById('editNegara').value = selectedMaster.negara;
        }
    } else {
        selectedMaster = null;
    }
}

async function editFlavorNegara() {
    const popup = document.getElementById('editFlavorNegaraPopup');
    if (popup) {
        // Load master data for dropdown
        if (masterDataList.length === 0) {
            await loadMasterDataForDropdown();
        }
        populateMasterDropdown();
        
        // Pre-fill with current values
        document.getElementById('editFlavor').value = currentData.flavor || '';
        document.getElementById('editNegara').value = currentData.negara || '';
        document.getElementById('editMasterSelect').value = '';
        selectedMaster = null;
        
        popup.classList.remove('hidden');
    }
}

function closeEditFlavorNegaraPopup() {
    const popup = document.getElementById('editFlavorNegaraPopup');
    if (popup) {
        popup.classList.add('hidden');
    }
}

async function saveFlavorNegara(event) {
    event.preventDefault();
    
    const newFlavor = document.getElementById('editFlavor').value.trim();
    const newNegara = document.getElementById('editNegara').value;
    
    if (!newFlavor || !newNegara) {
        showToast('Mohon lengkapi Flavor dan Negara', 'error');
        return;
    }
    
    // Check if changed
    if (newFlavor === currentData.flavor && newNegara === currentData.negara) {
        closeEditFlavorNegaraPopup();
        return;
    }
    
    // Check for duplicate (only if changed)
    showLoading('Memeriksa data duplikat...');
    const duplicateCheck = await checkDuplicateFlavorNegara(newFlavor, newNegara, currentData.id);
    hideLoading();
    
    if (duplicateCheck.isDuplicate) {
        alert('⚠️ DATA DUPLIKAT!\n\n' + duplicateCheck.message);
        showToast('Kombinasi Flavor dan Negara sudah ada', 'error');
        return;
    }
    
    // Update current data
    currentData.flavor = newFlavor;
    currentData.negara = newNegara;
    
    // Store master reference if selected
    if (selectedMaster) {
        currentData.masterId = selectedMaster.id;
    }
    
    // Update display
    document.getElementById('infoFlavor').textContent = newFlavor;
    document.getElementById('infoNegara').textContent = newNegara;
    
    // Save to temp data
    storage.saveTempData(currentData);
    
    closeEditFlavorNegaraPopup();
    showToast('Flavor dan Negara berhasil diubah', 'success');
}

// ==================== QUICK MASTER POPUP ====================

function openQuickMasterPopup() {
    const popup = document.getElementById('quickMasterPopup');
    if (popup) {
        document.getElementById('quickMasterForm').reset();
        popup.classList.remove('hidden');
    }
}

function closeQuickMasterPopup() {
    const popup = document.getElementById('quickMasterPopup');
    if (popup) {
        popup.classList.add('hidden');
    }
}

async function saveQuickMaster(event) {
    event.preventDefault();
    
    const user = auth.getUser();
    const masterData = {
        negara: document.getElementById('quickMasterNegara').value.trim(),
        flavor: document.getElementById('quickMasterFlavor').value.trim(),
        keterangan: document.getElementById('quickMasterKeterangan').value.trim(),
        distributor: document.getElementById('quickMasterDistributor').value.trim(),
        bumbu: document.getElementById('quickMasterBumbu').value.trim(),
        minyakBumbu: document.getElementById('quickMasterMinyakBumbu').value.trim(),
        kodeSI: document.getElementById('quickMasterKodeSI').value.trim(),
        kodeEtiket: document.getElementById('quickMasterKodeEtiket').value.trim(),
        createdBy: user?.name || 'Unknown'
    };
    
    if (!masterData.negara || !masterData.flavor) {
        showToast('Negara dan Flavor harus diisi', 'error');
        return;
    }
    
    showLoading('Menyimpan master data...');
    
    try {
        const result = await sheetsDB.addMaster(masterData);
        
        if (result.success) {
            // Add to local list
            masterDataList.push(result.master);
            populateMasterDropdown();
            
            // Select the new master
            document.getElementById('editMasterSelect').value = result.masterId;
            document.getElementById('editFlavor').value = masterData.flavor;
            document.getElementById('editNegara').value = masterData.negara;
            selectedMaster = result.master;
            
            hideLoading();
            closeQuickMasterPopup();
            showToast('Master data berhasil disimpan dan dipilih', 'success');
        } else {
            hideLoading();
            showToast('Gagal menyimpan: ' + result.error, 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error saving quick master:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

// Update Google Drive status display
function updateDriveStatus(connected) {
    const statusDiv = document.getElementById('driveStatus');
    const statusText = document.getElementById('driveStatusText');
    const btnConnect = document.getElementById('btnConnectDrive');
    
    if (!statusDiv || !statusText || !btnConnect) return;
    
    if (connected) {
        statusDiv.classList.remove('disconnected');
        statusDiv.classList.add('connected');
        statusText.textContent = 'Google Drive: Terkoneksi ✓';
        btnConnect.innerHTML = '<i class="fas fa-check"></i> Terhubung';
        btnConnect.classList.add('connected');
        btnConnect.disabled = true;
    } else {
        statusDiv.classList.remove('connected');
        statusDiv.classList.add('disconnected');
        statusText.textContent = 'Google Drive: Tidak Terkoneksi';
        btnConnect.innerHTML = '<i class="fas fa-link"></i> Koneksikan';
        btnConnect.classList.remove('connected');
        btnConnect.disabled = false;
    }
}

// Connect to Google Drive
async function connectGoogleDrive() {
    if (!checkConfig()) {
        showToast('Konfigurasi Google API belum lengkap', 'error');
        return;
    }
    
    showLoading('Menghubungkan ke Google Drive...');
    
    try {
        // Request Google token
        await auth.requestGoogleToken();
        
        // Check if successful
        if (auth.hasGoogleToken()) {
            updateDriveStatus(true);
            showToast('Google Drive berhasil terkoneksi!', 'success');
        } else {
            showToast('Gagal mendapatkan akses Google Drive', 'error');
        }
    } catch (error) {
        console.error('Error connecting Google Drive:', error);
        showToast('Gagal koneksi: ' + error.message, 'error');
    }
    
    hideLoading();
}

function initFileInputs() {
    CONFIG.PHOTO_TYPES.forEach(type => {
        const fileInput = document.getElementById(`file-${type.id}`);
        if (fileInput) {
            fileInput.addEventListener('change', (e) => handleFileSelect(e, type.id));
        }
    });
}

// ==================== PHOTO UPLOAD ====================

function triggerUpload(typeId) {
    const fileInput = document.getElementById(`file-${typeId}`);
    if (fileInput) {
        fileInput.click();
    }
}

async function handleFileSelect(event, typeId) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('File harus berupa gambar', 'error');
        return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showToast('Ukuran file maksimal 10MB', 'error');
        return;
    }

    showLoading('Memproses gambar...');

    try {
        // Compress image
        const compressedFile = await storage.compressImage(file, 1200, 0.8);
        
        // Convert to base64 for preview
        const base64 = await storage.fileToBase64(compressedFile);

        // Store temporarily
        uploadedPhotos[typeId] = {
            file: compressedFile,
            base64: base64,
            name: `${currentData.id}_${typeId}_${Date.now()}.jpg`
        };

        // Update preview
        updatePhotoPreview(typeId, uploadedPhotos[typeId]);

        hideLoading();
        showToast(`Foto ${typeId} berhasil dipilih`, 'success');
    } catch (error) {
        hideLoading();
        console.error('Error processing file:', error);
        showToast('Gagal memproses gambar', 'error');
    }
}

function updatePhotoPreview(typeId, photoData) {
    const previewContainer = document.getElementById(`preview-${typeId}`);
    const statusElement = document.getElementById(`status-${typeId}`);
    const previewButton = document.getElementById(`btn-preview-${typeId}`);

    if (previewContainer && photoData) {
        // Priority: 1. base64 (local), 2. Google Drive ID, 3. directLink
        let imgSrc = '';
        if (photoData.base64) {
            imgSrc = photoData.base64;
        } else if (photoData.id) {
            // Use Google thumbnail URL format
            imgSrc = `https://lh3.googleusercontent.com/d/${photoData.id}`;
        } else if (photoData.directLink) {
            imgSrc = photoData.directLink;
        }
        
        if (imgSrc) {
            previewContainer.innerHTML = `<img src="${imgSrc}" alt="${typeId}" onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📷</text></svg>';">`;
        }
        
        // Enable preview button
        if (previewButton) {
            previewButton.disabled = false;
        }
    }

    if (statusElement) {
        if (photoData.id) {
            // Already uploaded to Google Drive
            statusElement.innerHTML = '<i class="fas fa-cloud"></i> Terupload';
            statusElement.classList.add('uploaded');
        } else {
            // Ready to upload
            statusElement.innerHTML = '<i class="fas fa-check"></i> Siap upload';
            statusElement.classList.add('uploaded');
        }
    }
}

// ==================== CAMERA ====================

function openCamera(typeId) {
    currentCameraType = typeId;
    const modal = document.getElementById('cameraModal');
    const video = document.getElementById('cameraVideo');

    modal.classList.remove('hidden');

    // Request camera access
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
        } 
    })
    .then(stream => {
        cameraStream = stream;
        video.srcObject = stream;
    })
    .catch(error => {
        console.error('Camera error:', error);
        showToast('Tidak dapat mengakses kamera', 'error');
        closeCamera();
    });
}

function closeCamera() {
    const modal = document.getElementById('cameraModal');
    const video = document.getElementById('cameraVideo');

    modal.classList.add('hidden');

    // Stop camera stream
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    video.srcObject = null;
    currentCameraType = null;
}

async function capturePhoto() {
    if (!currentCameraType) return;

    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob(async (blob) => {
        const file = new File([blob], `${currentData.id}_${currentCameraType}_${Date.now()}.jpg`, {
            type: 'image/jpeg'
        });

        // Process the captured photo
        try {
            const base64 = await storage.fileToBase64(file);

            uploadedPhotos[currentCameraType] = {
                file: file,
                base64: base64,
                name: file.name
            };

            updatePhotoPreview(currentCameraType, uploadedPhotos[currentCameraType]);
            
            showToast(`Foto ${currentCameraType} berhasil diambil`, 'success');
        } catch (error) {
            console.error('Error capturing photo:', error);
            showToast('Gagal mengambil foto', 'error');
        }

        closeCamera();
    }, 'image/jpeg', 0.8);
}

// ==================== SAVE OPERATIONS ====================

async function simpanSementara() {
    showLoading('Menyimpan sementara...');

    try {
        // Upload photos to Google Drive if connected
        if (auth.hasGoogleToken() && checkConfig()) {
            await uploadPhotosToGoogleDrive();
        }

        // Collect kode produksi
        const kodeProduksi = collectKodeProduksi();

        // Update current data
        currentData.photos = uploadedPhotos;
        currentData.kodeProduksi = kodeProduksi;
        currentData.updatedAt = new Date().toISOString();

        // Save to temp storage
        storage.saveTempData(currentData);

        hideLoading();
        showToast('Data tersimpan sementara', 'success');
    } catch (error) {
        hideLoading();
        console.error('Error saving temp:', error);
        showToast('Gagal menyimpan sementara', 'error');
    }
}

// Check for duplicate Flavor + Negara combination
async function checkDuplicateFlavorNegara(flavor, negara, excludeId = null) {
    try {
        // Get all existing records
        const existingRecords = await storage.getAllRecords();
        
        if (!existingRecords || existingRecords.length === 0) {
            return { isDuplicate: false };
        }
        
        // Find duplicate (same flavor and negara, but different ID)
        const duplicate = existingRecords.find(record => {
            const sameFlavorNegara = record.flavor && record.negara &&
                record.flavor.toLowerCase().trim() === flavor.toLowerCase().trim() &&
                record.negara.toLowerCase().trim() === negara.toLowerCase().trim();
            
            // If editing, exclude current record from check
            if (excludeId && record.id === excludeId) {
                return false;
            }
            
            return sameFlavorNegara;
        });
        
        if (duplicate) {
            return {
                isDuplicate: true,
                existingRecord: duplicate,
                message: `Kombinasi Flavor "${flavor}" dan Negara "${negara}" sudah ada!\n\nData dibuat oleh: ${duplicate.createdBy || 'Unknown'}\nTanggal: ${duplicate.tanggal || duplicate.createdAt}\n\nSilakan pilih kombinasi Flavor dan Negara yang berbeda.`
            };
        }
        
        return { isDuplicate: false };
    } catch (error) {
        console.error('Error checking duplicate:', error);
        // If error, allow to proceed (don't block user)
        return { isDuplicate: false };
    }
}

async function simpanSemua() {
    // Validate at least one photo
    const hasPhotos = Object.keys(uploadedPhotos).some(key => uploadedPhotos[key]);
    
    if (!hasPhotos) {
        showToast('Mohon upload minimal 1 foto', 'warning');
        return;
    }

    // Check for duplicate Flavor + Negara (only for new records, not edit)
    if (!currentData.isEdit) {
        showLoading('Memeriksa data duplikat...');
        const duplicateCheck = await checkDuplicateFlavorNegara(
            currentData.flavor, 
            currentData.negara
        );
        
        if (duplicateCheck.isDuplicate) {
            hideLoading();
            alert('⚠️ DATA DUPLIKAT!\n\n' + duplicateCheck.message);
            showToast('Kombinasi Flavor dan Negara sudah ada', 'error');
            return;
        }
    }

    // Check if any photo needs upload (has base64 but no id)
    const photosNeedUpload = Object.keys(uploadedPhotos).some(key => {
        const photo = uploadedPhotos[key];
        return photo && !photo.id && (photo.base64 || photo.file);
    });

    // Warn user if Google Drive not connected but photos need upload
    if (photosNeedUpload && (!auth.hasGoogleToken() || !checkConfig())) {
        const proceed = confirm(
            '⚠️ Google Drive belum terkoneksi!\n\n' +
            'Foto akan disimpan di local storage browser saja.\n' +
            'Jika Anda clear browser data, foto akan hilang.\n\n' +
            'Untuk menyimpan foto permanen, hubungkan Google Drive terlebih dahulu.\n\n' +
            'Lanjutkan tanpa Google Drive?'
        );
        if (!proceed) {
            return;
        }
    }

    showLoading('Menyimpan semua data...');

    try {
        // First, save pending master data (new master photos)
        if (newMasterPendingData.length > 0) {
            showLoading('Menyimpan Master Data baru...');
            await savePendingMasterData();
        }
        
        // Upload photos to Google Drive if connected
        if (auth.hasGoogleToken() && checkConfig()) {
            showLoading('Mengupload foto ke Google Drive...');
            await uploadPhotosToGoogleDrive();
        }

        // Collect kode produksi
        const kodeProduksi = collectKodeProduksi();

        // Get current user for tracking
        const currentUser = auth.getUser();
        const userName = currentUser ? currentUser.name : 'Unknown';

        // Prepare final record (17 kolom - dengan nomorMaterial, createdBy/updatedBy)
        const record = {
            id: currentData.id,
            tanggal: currentData.tanggal,
            flavor: currentData.flavor,
            nomorMaterial: currentData.nomorMaterial || '',
            negara: currentData.negara,
            photos: {},
            kodeProduksi: kodeProduksi,
            createdAt: currentData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: currentData.createdBy || userName,
            updatedBy: userName
        };

        // Copy photo data - include base64 for local storage (preview), but sheets-db will strip it
        for (const key in uploadedPhotos) {
            if (uploadedPhotos[key]) {
                record.photos[key] = {
                    id: uploadedPhotos[key].id || null,
                    name: uploadedPhotos[key].name || null,
                    directLink: uploadedPhotos[key].directLink || null,
                    base64: uploadedPhotos[key].id ? null : (uploadedPhotos[key].base64 || null)
                };
            }
        }

        console.log('📦 Saving record');
        console.log('📦 Photos keys:', Object.keys(record.photos));
        console.log('📦 Is edit mode:', currentData.isEdit);

        // Save to storage (Google Sheets + local)
        if (currentData.isEdit) {
            console.log('📝 Calling storage.updateRecord()...');
            await storage.updateRecord(currentData.id, record);
            console.log('✅ Record updated to localStorage');
        } else {
            console.log('✏️ Calling storage.addRecord()...');
            await storage.addRecord(record);
            console.log('✅ Record added to localStorage');
        }

        console.log('⏳ Data saved to localStorage. Google Sheets sync in background...');

        // Clear temp data
        storage.clearTempData();

        hideLoading();
        
        // Show appropriate success message
        const hasUploadedToDrive = Object.values(record.photos).some(p => p && p.id);
        if (hasUploadedToDrive) {
            showToast('Data & foto berhasil disimpan ke Google Drive!', 'success');
        } else if (photosNeedUpload) {
            showToast('Data disimpan. Foto hanya di local storage.', 'warning');
        } else {
            showToast('Data berhasil disimpan!', 'success');
        }

        // Wait a bit longer for Google Sheets to sync (important!)
        // Google Sheets sync takes 10-30 seconds, so we wait 3 seconds before redirect
        // to ensure localStorage is updated
        console.log('⏳ Waiting for sync before redirect...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Navigate back to records
        console.log('↩️ Redirecting to records...');
        window.location.href = '../records/';
    } catch (error) {
        hideLoading();
        console.error('Error saving:', error);
        showToast('Gagal menyimpan data: ' + error.message, 'error');
    }
}

async function uploadPhotosToGoogleDrive() {
    const uploadPromises = [];

    for (const key in uploadedPhotos) {
        const photo = uploadedPhotos[key];
        
        // Skip if already uploaded or no file
        if (!photo || photo.id || !photo.file) continue;

        const promise = storage.uploadToGoogleDrive(photo.file, photo.name)
            .then(result => {
                uploadedPhotos[key] = {
                    ...uploadedPhotos[key],
                    id: result.id,
                    directLink: result.directLink,
                    webViewLink: result.webViewLink
                };
            })
            .catch(error => {
                console.error(`Error uploading ${key}:`, error);
                // Keep base64 as fallback
            });

        uploadPromises.push(promise);
    }

    await Promise.all(uploadPromises);
}

function collectKodeProduksi() {
    const kodeProduksi = [];

    for (let i = 1; i <= 3; i++) {
        const kode = document.getElementById(`kode${i}`)?.value?.trim() || '';

        // Only add if field is filled
        if (kode !== '') {
            kodeProduksi.push(kode);
        }
    }

    return kodeProduksi;
}

// ==================== NAVIGATION ====================
// goBack is defined at the top of the file as window.goBack

// ==================== UTILITIES ====================

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

// Loading messages configuration
const LOADING_MESSAGES = {
    'Memproses...': {
        title: 'Memproses',
        message: 'Mohon tunggu sebentar...',
        hint: 'Jangan tutup halaman ini'
    },
    'Menghubungkan ke Google Drive...': {
        title: 'Menghubungkan',
        message: 'Sedang menghubungkan ke Google Drive...',
        hint: 'Popup Google mungkin muncul untuk login'
    },
    'Memproses gambar...': {
        title: 'Memproses Gambar',
        message: 'Sedang memproses gambar yang diambil...',
        hint: 'Tunggu sebentar'
    },
    'Menyimpan sementara...': {
        title: 'Menyimpan',
        message: 'Menyimpan data sementara...',
        hint: 'Sebentar lagi selesai'
    },
    'Menyimpan semua data...': {
        title: 'Menyimpan Data',
        message: 'Sedang menyimpan semua data ke database...',
        hint: 'Jangan tutup halaman ini'
    },
    'Mengupload foto ke Google Drive...': {
        title: 'Mengupload Foto',
        message: 'Sedang mengupload foto ke Google Drive...',
        hint: 'Proses ini mungkin memakan waktu beberapa detik'
    }
};

function showLoading(message = 'Memproses...') {
    const overlay = document.getElementById('loadingOverlay');
    const titleEl = document.getElementById('loadingTitle');
    const messageEl = document.getElementById('loadingMessage');
    const hintEl = document.getElementById('loadingHint');
    
    // Get custom messages or use defaults
    const config = LOADING_MESSAGES[message] || {
        title: message,
        message: 'Mohon tunggu sebentar...',
        hint: 'Jangan tutup halaman ini'
    };
    
    if (titleEl) titleEl.textContent = config.title;
    if (messageEl) messageEl.textContent = config.message;
    if (hintEl) hintEl.textContent = config.hint;
    
    overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.remove('active');
}

function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Prevent accidental navigation
window.addEventListener('beforeunload', function(e) {
    const hasUnsavedData = Object.keys(uploadedPhotos).some(key => 
        uploadedPhotos[key] && !uploadedPhotos[key].id
    );
    
    if (hasUnsavedData) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Close camera modal on click outside
document.addEventListener('click', function(e) {
    if (e.target.id === 'cameraModal') {
        closeCamera();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeCamera();
        closePhotoPreview();
    }
});

// ==================== PHOTO PREVIEW ====================

let currentPreviewType = null;

function previewPhoto(typeId) {
    const photoData = uploadedPhotos[typeId];
    
    if (!photoData) {
        alert('Belum ada foto yang diupload');
        return;
    }
    
    currentPreviewType = typeId;
    
    // Get photo source
    let imgSrc = '';
    if (photoData.base64) {
        imgSrc = photoData.base64;
    } else if (photoData.id) {
        imgSrc = `https://lh3.googleusercontent.com/d/${photoData.id}`;
    } else if (photoData.directLink) {
        imgSrc = photoData.directLink;
    }
    
    if (!imgSrc) {
        alert('Foto tidak dapat ditampilkan');
        return;
    }
    
    // Update popup content
    const typeNames = {
        'bumbu': 'Bumbu',
        'm-bumbu': 'M. Bumbu',
        'si': 'SI',
        'karton': 'Karton',
        'etiket': 'Etiket',
        'etiket-banded': 'Etiket Banded',
        'plakban': 'Plakban'
    };
    
    document.getElementById('previewPhotoType').textContent = typeNames[typeId] || typeId;
    document.getElementById('photoPreviewImage').src = imgSrc;
    
    // Show popup
    document.getElementById('photoPreviewPopup').classList.remove('hidden');
}

function closePhotoPreview() {
    document.getElementById('photoPreviewPopup').classList.add('hidden');
    currentPreviewType = null;
}

function deletePhotoFromPreview() {
    if (!currentPreviewType) return;
    
    if (confirm(`Apakah Anda yakin ingin menghapus foto ${currentPreviewType}?`)) {
        // Remove photo data
        delete uploadedPhotos[currentPreviewType];
        
        // Reset preview
        const previewContainer = document.getElementById(`preview-${currentPreviewType}`);
        const statusElement = document.getElementById(`status-${currentPreviewType}`);
        const previewButton = document.getElementById(`btn-preview-${currentPreviewType}`);
        
        if (previewContainer) {
            previewContainer.innerHTML = `
                <i class="fas fa-image"></i>
                <p>Belum ada foto</p>
            `;
        }
        
        if (statusElement) {
            statusElement.innerHTML = '<i class="fas fa-clock"></i> Belum upload';
            statusElement.classList.remove('uploaded');
        }
        
        if (previewButton) {
            previewButton.disabled = true;
        }
        
        // Close preview popup
        closePhotoPreview();
        
        showNotification('Foto berhasil dihapus', 'success');
    }
}

// =====================================================
// MASTER DATA AUTOCOMPLETE FUNCTIONS
// =====================================================

async function loadMasterDataForAutocomplete() {
    try {
        console.log('📋 Loading Master data for autocomplete (all countries)...');
        
        const response = await fetch(`${CONFIG.GOOGLE_SHEETS_WEBAPP_URL}?action=getMaster`);
        const result = await response.json();
        
        if (result.success && result.data) {
            // Load ALL master data without filtering by negara
            masterDataList = result.data;
            console.log('✅ Master records loaded:', masterDataList.length);
            
            // Initialize autocomplete after data loaded
            initMasterAutocomplete();
        }
    } catch (error) {
        console.error('❌ Failed to load master data:', error);
    }
}

function initMasterAutocomplete() {
    const masterInputs = document.querySelectorAll('.master-input');
    
    masterInputs.forEach(input => {
        const type = input.dataset.type;
        const field = input.dataset.field;
        const dropdownId = `dropdown-${type}`;
        
        // Input event for autocomplete
        input.addEventListener('input', (e) => {
            handleMasterInputChange(e.target.value, field, dropdownId, type);
        });
        
        // Focus event - show all options
        input.addEventListener('focus', (e) => {
            handleMasterInputChange(e.target.value, field, dropdownId, type);
        });
        
        // Blur event - hide dropdown
        input.addEventListener('blur', () => {
            setTimeout(() => {
                const dd = document.getElementById(dropdownId);
                if (dd) dd.classList.add('hidden');
            }, 200);
        });
        
        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            handleMasterKeydown(e, dropdownId, input.id);
        });
    });
}

function handleMasterInputChange(query, field, dropdownId, type) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    // Get unique values for this field from master data (already filtered by negara)
    let options = [];
    masterDataList.forEach(master => {
        const value = master[field];
        if (value && !options.includes(value)) {
            options.push(value);
        }
    });
    
    console.log(`🔍 Field: ${field}, Options found: ${options.length}`);
    
    // Filter based on query
    const lowerQuery = query.toLowerCase().trim();
    let filtered = options;
    if (lowerQuery.length > 0) {
        filtered = options.filter(opt => opt.toLowerCase().includes(lowerQuery));
    }
    
    // Render dropdown
    if (filtered.length === 0) {
        const msg = options.length === 0 
            ? `Tidak ada data untuk ${currentData?.negara || 'negara ini'} - gunakan "Buat Master Data"`
            : 'Tidak ditemukan - gunakan "Buat Master Data"';
        dropdown.innerHTML = `<div class="master-dropdown-empty">${msg}</div>`;
        dropdown.classList.remove('hidden');
    } else {
        dropdown.innerHTML = filtered.slice(0, 10).map((item, index) => {
            // Highlight matching part
            let displayHtml = escapeHtml(item);
            if (lowerQuery.length > 0) {
                const lowerItem = item.toLowerCase();
                const matchIndex = lowerItem.indexOf(lowerQuery);
                if (matchIndex !== -1) {
                    const before = item.substring(0, matchIndex);
                    const match = item.substring(matchIndex, matchIndex + lowerQuery.length);
                    const after = item.substring(matchIndex + lowerQuery.length);
                    displayHtml = `${escapeHtml(before)}<span class="match">${escapeHtml(match)}</span>${escapeHtml(after)}`;
                }
            }
            return `<div class="master-dropdown-item" data-value="${escapeHtml(item)}" data-index="${index}">${displayHtml}</div>`;
        }).join('');
        dropdown.classList.remove('hidden');
        
        // Add click handlers
        dropdown.querySelectorAll('.master-dropdown-item').forEach(item => {
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const inputEl = document.getElementById(`master-${type}`);
                inputEl.value = item.dataset.value;
                dropdown.classList.add('hidden');
                
                // Auto-load photo if exists from Google Drive
                loadPhotoFromMaster(type, item.dataset.value);
            });
        });
    }
}

function handleMasterKeydown(e, dropdownId, inputId) {
    const dropdown = document.getElementById(dropdownId);
    const items = dropdown.querySelectorAll('.master-dropdown-item');
    
    if (dropdown.classList.contains('hidden') || items.length === 0) return;
    
    let activeIndex = -1;
    items.forEach((item, i) => {
        if (item.classList.contains('active')) activeIndex = i;
    });
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        updateActiveDropdownItem(items, activeIndex);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActiveDropdownItem(items, activeIndex);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && items[activeIndex]) {
            const inputEl = document.getElementById(inputId);
            inputEl.value = items[activeIndex].dataset.value;
            dropdown.classList.add('hidden');
            
            // Extract type from inputId (master-bumbu -> bumbu)
            const type = inputId.replace('master-', '');
            loadPhotoFromMaster(type, items[activeIndex].dataset.value);
        }
    } else if (e.key === 'Escape') {
        dropdown.classList.add('hidden');
    }
}

function updateActiveDropdownItem(items, activeIndex) {
    items.forEach((item, index) => {
        if (index === activeIndex) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
}

async function loadPhotoFromMaster(type, kodeValue) {
    // Find matching master record
    const field = PHOTO_FIELD_MAP[type];
    const matchingMaster = masterDataList.find(m => m[field] === kodeValue);
    
    console.log(`🔍 Looking for photo: type=${type}, kode=${kodeValue}`);
    
    // Try to load existing photo from Google Drive
    const folderName = PHOTO_FOLDER_MAP[type];
    
    try {
        // Search for file in Google Drive folder using direct API
        if (isGoogleDriveConnected()) {
            const matchingFile = await searchPhotoInDriveFolder(folderName, kodeValue);
            
            if (matchingFile) {
                console.log('✅ Found matching photo:', matchingFile.name);
                
                // Get thumbnail URL
                const thumbnailUrl = `https://drive.google.com/thumbnail?id=${matchingFile.id}&sz=w400`;
                
                // Update preview
                const previewContainer = document.getElementById(`preview-${type}`);
                if (previewContainer) {
                    previewContainer.innerHTML = `<img src="${thumbnailUrl}" alt="${kodeValue}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-image\\'></i><p>Gagal memuat foto</p>'">`;
                }
                
                // Update status
                const statusEl = document.getElementById(`status-${type}`);
                if (statusEl) {
                    statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Terupload';
                    statusEl.classList.add('uploaded');
                }
                
                // Enable preview button
                const previewBtn = document.getElementById(`btn-preview-${type}`);
                if (previewBtn) {
                    previewBtn.disabled = false;
                }
                
                // Store photo data for saving
                uploadedPhotos[type] = {
                    id: matchingFile.id,
                    name: matchingFile.name,
                    directLink: `https://lh3.googleusercontent.com/d/${matchingFile.id}`
                };
                
                showToast(`Foto "${kodeValue}" ditemukan`, 'success');
                return;
            }
        }
        
        // If no photo found, just show message
        showToast(`Kode "${kodeValue}" dipilih (belum ada foto)`, 'info');
        
    } catch (error) {
        console.error('Error loading photo from master:', error);
        showToast(`Kode "${kodeValue}" dipilih`, 'success');
    }
}

// Search for photo in Google Drive folder by name
async function searchPhotoInDriveFolder(folderName, searchName) {
    if (!isGoogleDriveConnected() || !searchName) return null;
    
    try {
        // Get folder ID first
        const folderResponse = await gapi.client.drive.files.list({
            q: `'${CONFIG.GOOGLE_FOLDER_ID}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            pageSize: 1
        });
        
        if (!folderResponse.result.files || folderResponse.result.files.length === 0) {
            console.log(`📁 Folder "${folderName}" not found`);
            return null;
        }
        
        const folderId = folderResponse.result.files[0].id;
        console.log(`📁 Found folder "${folderName}" with ID: ${folderId}`);
        
        // Get all image files in folder
        const filesResponse = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed=false and (mimeType contains 'image/')`,
            fields: 'files(id, name, webViewLink, thumbnailLink)',
            pageSize: 500
        });
        
        if (!filesResponse.result.files || filesResponse.result.files.length === 0) {
            console.log(`📁 Folder "${folderName}" is empty`);
            return null;
        }
        
        console.log(`📁 Found ${filesResponse.result.files.length} files in folder "${folderName}"`);
        
        // Normalize search name - remove all spaces, dashes, slashes
        const normalizedSearch = searchName.toLowerCase()
            .replace(/\.(jpg|jpeg|png|gif|webp|bmp)$/i, '')
            .replace(/[\/\\]+/g, '')
            .replace(/[\s\-_]+/g, '')
            .trim();
        
        console.log(`🔍 Searching for: "${searchName}" → normalized: "${normalizedSearch}"`);
        
        // Search for matching file
        for (const file of filesResponse.result.files) {
            const normalizedFileName = file.name.toLowerCase()
                .replace(/\.(jpg|jpeg|png|gif|webp|bmp)$/i, '')
                .replace(/[\/\\]+/g, '')
                .replace(/[\s\-_]+/g, '')
                .trim();
            
            // Log first 5 files for debugging
            if (filesResponse.result.files.indexOf(file) < 5) {
                console.log(`   File: "${file.name}" → normalized: "${normalizedFileName}"`);
            }
            
            // Exact match
            if (normalizedFileName === normalizedSearch) {
                console.log(`✅ Exact match: "${file.name}"`);
                return file;
            }
            
            // Partial match
            if (normalizedFileName.includes(normalizedSearch) || normalizedSearch.includes(normalizedFileName)) {
                console.log(`✅ Partial match: "${file.name}"`);
                return file;
            }
        }
        
        console.log(`❌ No match found. Available files:`);
        filesResponse.result.files.slice(0, 10).forEach(f => console.log(`   - ${f.name}`));
        
    } catch (error) {
        console.error('Error searching photo in Drive:', error);
    }
    
    return null;
}

// =====================================================
// NEW MASTER POPUP FUNCTIONS
// =====================================================

function openNewMasterPopup(type) {
    currentNewMasterType = type;
    newMasterPhotoData = null;
    
    // Set popup title
    const typeNames = {
        'bumbu': 'Bumbu',
        'm-bumbu': 'Minyak Bumbu',
        'si': 'Kode SI',
        'karton': 'Kode Karton',
        'etiket': 'Kode Etiket',
        'etiket-banded': 'Five/Six in One',
        'plakban': 'Plakban'
    };
    document.getElementById('newMasterPhotoType').textContent = typeNames[type] || type;
    
    // Reset form
    document.getElementById('newMasterKode').value = '';
    document.getElementById('newMasterPhotoPreview').innerHTML = `
        <i class="fas fa-image"></i>
        <p>Belum ada foto</p>
    `;
    
    // Setup file input
    const fileInput = document.getElementById('newMasterFileInput');
    fileInput.onchange = (e) => handleNewMasterFileSelect(e);
    
    // Show popup
    document.getElementById('newMasterPhotoPopup').classList.remove('hidden');
}

function closeNewMasterPopup() {
    document.getElementById('newMasterPhotoPopup').classList.add('hidden');
    currentNewMasterType = null;
    newMasterPhotoData = null;
}

function triggerNewMasterUpload() {
    document.getElementById('newMasterFileInput').click();
}

function handleNewMasterFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        newMasterPhotoData = event.target.result;
        
        // Update preview
        document.getElementById('newMasterPhotoPreview').innerHTML = `
            <img src="${newMasterPhotoData}" alt="Preview">
        `;
    };
    reader.readAsDataURL(file);
}

function openNewMasterCamera() {
    // Reuse existing camera functionality
    if (currentNewMasterType) {
        // Temporarily set camera type to capture
        openCameraForNewMaster();
    }
}

async function openCameraForNewMaster() {
    const modal = document.getElementById('cameraModal');
    const video = document.getElementById('cameraVideo');
    
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        video.srcObject = cameraStream;
        modal.classList.remove('hidden');
        
        // Override capture button
        const captureBtn = document.querySelector('#cameraModal .btn-capture');
        if (captureBtn) {
            captureBtn.onclick = () => captureForNewMaster();
        }
    } catch (err) {
        console.error('Camera error:', err);
        showToast('Tidak dapat mengakses kamera', 'error');
    }
}

function captureForNewMaster() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    newMasterPhotoData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Update preview
    document.getElementById('newMasterPhotoPreview').innerHTML = `
        <img src="${newMasterPhotoData}" alt="Preview">
    `;
    
    // Close camera modal
    closeCamera();
}

async function saveNewMasterPhoto() {
    const kode = document.getElementById('newMasterKode').value.trim();
    
    if (!kode) {
        showToast('Masukkan keterangan/kode', 'error');
        return;
    }
    
    if (!newMasterPhotoData) {
        showToast('Upload atau ambil foto terlebih dahulu', 'error');
        return;
    }
    
    const field = PHOTO_FIELD_MAP[currentNewMasterType];
    const folderName = PHOTO_FOLDER_MAP[currentNewMasterType];
    
    // Store pending master data (will be saved on "Simpan Semua")
    newMasterPendingData.push({
        type: currentNewMasterType,
        field: field,
        folderName: folderName,
        kode: kode,
        photoData: newMasterPhotoData,
        negara: currentData.negara || '',
        flavor: currentData.flavor || ''
    });
    
    console.log('📋 Pending master data added:', kode, 'for', currentNewMasterType);
    
    // Set the kode to the input field
    const inputEl = document.getElementById(`master-${currentNewMasterType}`);
    if (inputEl) {
        inputEl.value = kode;
    }
    
    // Update photo preview in the card
    if (newMasterPhotoData) {
        uploadedPhotos[currentNewMasterType] = newMasterPhotoData;
        updatePhotoPreview(currentNewMasterType, newMasterPhotoData);
    }
    
    // Update status to show pending
    const statusEl = document.getElementById(`status-${currentNewMasterType}`);
    if (statusEl) {
        statusEl.innerHTML = '<i class="fas fa-clock"></i> Tersimpan (Pending)';
        statusEl.classList.add('uploaded');
        statusEl.style.color = 'var(--warning-color)';
    }
    
    closeNewMasterPopup();
    showToast(`Master data "${kode}" tersimpan sementara. Klik "Simpan Semua" untuk menyimpan ke server.`, 'success');
}

// Function to save all pending master data (called from simpanSemua)
async function savePendingMasterData() {
    if (newMasterPendingData.length === 0) {
        console.log('📋 No pending master data to save');
        return { success: true };
    }
    
    console.log(`📋 Saving ${newMasterPendingData.length} pending master data...`);
    
    for (const pending of newMasterPendingData) {
        try {
            // Upload photo to Google Drive with proper name
            let photoUrl = null;
            if (isGoogleDriveConnected() && pending.photoData) {
                try {
                    // Use kode as filename (e.g., "GSS MF O TPK.jpg")
                    const fileName = `${pending.kode}.jpg`;
                    photoUrl = await uploadToGoogleDrive(
                        pending.photoData,
                        fileName,
                        pending.folderName
                    );
                    console.log(`✅ Photo uploaded to ${pending.folderName}/${fileName}`);
                } catch (uploadError) {
                    console.error('Drive upload failed:', uploadError);
                }
            }
            
            // Save to Master sheet
            const masterData = {
                negara: pending.negara,
                flavor: pending.flavor,
                keterangan: pending.kode,
                [pending.field]: pending.kode
            };
            
            const response = await fetch(CONFIG.GOOGLE_SHEETS_WEBAPP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addMaster',
                    master: masterData
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ Master data saved: ${pending.kode}`);
                
                // Update uploadedPhotos with the Drive URL
                if (photoUrl) {
                    uploadedPhotos[pending.type] = photoUrl;
                }
            } else {
                console.error(`❌ Failed to save master: ${pending.kode}`, result.message);
            }
        } catch (error) {
            console.error(`❌ Error saving master data ${pending.kode}:`, error);
        }
    }
    
    // Clear pending data
    newMasterPendingData = [];
    return { success: true };
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


