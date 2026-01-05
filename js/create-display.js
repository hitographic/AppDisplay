// =====================================================
// VALID DISPLAY - Create Display Page Script
// =====================================================

let currentData = null;
let uploadedPhotos = {};
let currentCameraType = null;
let cameraStream = null;

document.addEventListener('DOMContentLoaded', function() {
    // Protect page
    if (!protectPage()) return;

    // Only admin can access this page
    if (!isAdmin()) {
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
    // Load temp data
    currentData = storage.getTempData();
    
    if (!currentData) {
        showToast('Data tidak ditemukan. Kembali ke halaman sebelumnya.', 'error');
        setTimeout(() => {
            window.location.href = 'records.html';
        }, 1500);
        return;
    }

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
}

function displayInfo() {
    document.getElementById('infoFlavor').textContent = currentData.flavor;
    document.getElementById('infoNegara').textContent = currentData.negara;
    document.getElementById('infoTanggal').textContent = formatDate(currentData.tanggal);
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
        if (kode && kode.length === 3) {
            document.getElementById(`kode${index + 1}-1`).value = kode[0] || '';
            document.getElementById(`kode${index + 1}-2`).value = kode[1] || '';
            document.getElementById(`kode${index + 1}-3`).value = kode[2] || '';
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
        });

        // Update initial status
        updateDriveStatus(auth.hasGoogleToken() && checkConfig());

        // Request token if not available
        if (!auth.hasGoogleToken() && checkConfig()) {
            console.log('Google token not available - user needs to connect');
        }
    } catch (error) {
        console.error('Error initializing Google API:', error);
        updateDriveStatus(false);
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

    if (previewContainer && photoData) {
        const imgSrc = photoData.directLink || photoData.base64;
        previewContainer.innerHTML = `<img src="${imgSrc}" alt="${typeId}">`;
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

async function simpanSemua() {
    // Validate at least one photo
    const hasPhotos = Object.keys(uploadedPhotos).some(key => uploadedPhotos[key]);
    
    if (!hasPhotos) {
        showToast('Mohon upload minimal 1 foto', 'warning');
        return;
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

        // Prepare final record (16 kolom - dengan createdBy/updatedBy)
        const record = {
            id: currentData.id,
            tanggal: currentData.tanggal,
            flavor: currentData.flavor,
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
            await storage.updateRecord(currentData.id, record);
            console.log('✅ Record updated');
        } else {
            await storage.addRecord(record);
            console.log('✅ Record added');
        }

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

        // Navigate back to records
        setTimeout(() => {
            window.location.href = 'records.html';
        }, 1500);
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
        const kode = [
            document.getElementById(`kode${i}-1`)?.value?.trim() || '',
            document.getElementById(`kode${i}-2`)?.value?.trim() || '',
            document.getElementById(`kode${i}-3`)?.value?.trim() || ''
        ];

        // Only add if at least one field is filled
        if (kode.some(k => k !== '')) {
            kodeProduksi.push(kode);
        }
    }

    return kodeProduksi;
}

// ==================== NAVIGATION ====================

function goBack() {
    if (confirm('Data yang belum disimpan akan hilang. Lanjutkan?')) {
        storage.clearTempData();
        window.location.href = 'records.html';
    }
}

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

function showLoading(message = 'Memproses...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = document.getElementById('loadingText');
    if (text) text.textContent = message;
    overlay.classList.remove('hidden');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.add('hidden');
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
    }
});
