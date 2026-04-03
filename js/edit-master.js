// =====================================================
// Edit Master Data - JavaScript
// Manage photos in Google Drive folders via Apps Script
// Version 4.0 - Using sheetsDB (JSONP) for CRUD (No OAuth required)
// =====================================================

// Folder configuration
var MASTER_FOLDERS = [
    { name: 'Bumbu', icon: 'fa-pepper-hot', color: '#e74c3c' },
    { name: 'Minyak Bumbu', icon: 'fa-oil-can', color: '#f1c40f' },
    { name: 'Five or Six in One', icon: 'fa-cubes', color: '#9b59b6' },
    { name: 'Kode Etiket', icon: 'fa-tag', color: '#3498db' },
    { name: 'Kode Karton/Depan', icon: 'fa-box', color: '#1abc9c', folderName: 'Kode Karton', subfolder: 'Depan' },
    { name: 'Kode Karton/Belakang', icon: 'fa-box-open', color: '#16a085', folderName: 'Kode Karton', subfolder: 'Belakang' },
    { name: 'Kode SI', icon: 'fa-barcode', color: '#34495e' },
    { name: 'Plakban', icon: 'fa-tape', color: '#95a5a6' }
];

// State
var currentFolder = null;
var currentFolderConfig = null;
var currentFiles = [];
var editingFile = null;
var selectedImageData = null;
var folderCache = {};

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    checkAuth();
    checkMasterEditorPermission();
    hideGoogleDriveAlert();
    renderFolderGrid();
    await loadAllFolderCounts();
    console.log('Edit Master module loaded (v4.0 - sheetsDB JSONP CRUD)');
});

// Hide the Google Drive login alert (not needed anymore)
function hideGoogleDriveAlert() {
    var alert = document.getElementById('driveAlert');
    if (alert) alert.style.display = 'none';
    var connected = document.getElementById('driveConnected');
    if (connected) connected.style.display = 'none';
}

// Check authentication
function checkAuth() {
    var storageKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS) 
        ? CONFIG.STORAGE_KEYS.USER 
        : 'validDisplay_user';
    var user = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    document.getElementById('userName').textContent = user.name || 'User';
}

// Check master_editor permission
function checkMasterEditorPermission() {
    var storageKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS) 
        ? CONFIG.STORAGE_KEYS.USER 
        : 'validDisplay_user';
    var user = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!user || !user.permissions) {
        window.location.href = 'records.html';
        return;
    }
    var permissions = Array.isArray(user.permissions) ? user.permissions : [];
    var hasMasterEditorAccess = permissions.includes('master_editor') || permissions.includes('user_admin');
    if (!hasMasterEditorAccess) {
        window.location.href = 'records.html';
        return;
    }
    console.log('User memiliki akses master_editor');
}

// Logout
function logout() {
    var storageKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS) 
        ? CONFIG.STORAGE_KEYS.USER 
        : 'validDisplay_user';
    localStorage.removeItem(storageKey);
    window.location.href = 'index.html';
}

// =====================================================
// API CALLS
// READ: JSONP (GET) via sheetsDB.gGet
// WRITE: sheetsDB.gPost (fetch + JSONP fallback)
// =====================================================

// List files in a master folder (GET via sheetsDB.gGet)
async function listMasterFiles(folderName, subfolder) {
    return await sheetsDB.gGet('listMasterFiles', {
        folderName: folderName,
        subfolder: subfolder || ''
    });
}

// Upload file to master folder via sheetsDB.gPost
async function uploadMasterFileAPI(data) {
    // For photo uploads, base64 data can be very large
    // sheetsDB.gPost handles fallback: fetch → JSONP (if small) → form submit
    var payload = {
        photo: data.photo,
        fileName: data.fileName,
        folderName: data.folderName,
        subfolder: data.subfolder || null,
        mimeType: data.mimeType || 'image/jpeg'
    };
    return await sheetsDB.gPost('uploadMasterFile', payload);
}

// Rename a master file via sheetsDB.gPost
async function renameMasterFileAPI(fileId, newName) {
    return await sheetsDB.gPost('renameMasterFile', {
        fileId: fileId,
        newName: newName
    });
}

// Delete a master file via sheetsDB.gPost
async function deleteMasterFileAPI(fileId) {
    return await sheetsDB.gPost('deleteMasterFile', {
        fileId: fileId
    });
}

// =====================================================
// FOLDER & FILE UI
// =====================================================

// Render folder grid
function renderFolderGrid() {
    var grid = document.getElementById('folderGrid');
    var html = '';
    for (var i = 0; i < MASTER_FOLDERS.length; i++) {
        var folder = MASTER_FOLDERS[i];
        html += '<div class="folder-card" onclick="selectFolder(' + i + ')" id="folder-' + i + '">' +
            '<i class="fas ' + folder.icon + ' folder-icon" style="color: ' + folder.color + '"></i>' +
            '<h3>' + folder.name + '</h3>' +
            '<span class="file-count" id="count-' + i + '">- file</span></div>';
    }
    grid.innerHTML = html;
}

// Load all folder counts
async function loadAllFolderCounts() {
    console.log('Loading folder file counts...');
    for (var i = 0; i < MASTER_FOLDERS.length; i++) {
        var folder = MASTER_FOLDERS[i];
        try {
            var result = await listMasterFiles(
                folder.folderName || folder.name,
                folder.subfolder || null
            );
            if (result && result.success) {
                document.getElementById('count-' + i).textContent = result.count + ' file';
                folderCache[folder.name] = result.files || [];
            } else {
                document.getElementById('count-' + i).textContent = 'Error';
                console.error('Folder ' + folder.name + ' error:', result ? result.error : 'Unknown');
            }
        } catch (error) {
            document.getElementById('count-' + i).textContent = 'Error';
            console.error('Folder ' + folder.name + ' load error:', error.message);
        }
    }
    console.log('Folder counts loaded');
}

// Select folder
async function selectFolder(index) {
    var folder = MASTER_FOLDERS[index];
    showLoading('Memuat file...');
    var cards = document.querySelectorAll('.folder-card');
    for (var c = 0; c < cards.length; c++) cards[c].classList.remove('active');
    document.getElementById('folder-' + index).classList.add('active');
    currentFolder = folder.name;
    currentFolderConfig = folder;
    document.getElementById('currentFolderName').textContent = folder.name;
    try {
        if (folderCache[folder.name] && folderCache[folder.name].length > 0) {
            currentFiles = folderCache[folder.name];
        } else {
            var result = await listMasterFiles(
                folder.folderName || folder.name,
                folder.subfolder || null
            );
            if (result && result.success) {
                currentFiles = result.files || [];
                folderCache[folder.name] = currentFiles;
            } else {
                currentFiles = [];
                showToast('Error: ' + (result ? result.error : 'Unknown'), 'error');
            }
        }
        renderFiles();
        document.getElementById('filesSection').classList.add('active');
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
    hideLoading();
}

// Render files
function renderFiles() {
    var grid = document.getElementById('filesGrid');
    var searchTerm = document.getElementById('searchFiles').value.toLowerCase();
    var filteredFiles = [];
    for (var f = 0; f < currentFiles.length; f++) {
        if (currentFiles[f].name.toLowerCase().indexOf(searchTerm) >= 0) {
            filteredFiles.push(currentFiles[f]);
        }
    }
    if (filteredFiles.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i>' +
            '<h3>' + (searchTerm ? 'Tidak ada file yang cocok' : 'Folder kosong') + '</h3>' +
            '<p>' + (searchTerm ? 'Coba kata kunci lain' : 'Klik Tambah File untuk menambahkan foto') + '</p></div>';
        return;
    }
    var html = '';
    for (var i = 0; i < filteredFiles.length; i++) {
        var file = filteredFiles[i];
        var fileName = file.name.replace(/\.(jpg|jpeg|png|gif|webp|bmp)$/i, '');
        var escapedName = file.name.replace(/'/g, "\\'");
        html += '<div class="file-card"><div class="file-icon"><i class="fas fa-file-image"></i></div>' +
            '<div class="file-info"><div class="file-name" title="' + file.name + '">' + fileName + '</div></div>' +
            '<div class="file-actions">' +
            '<button class="btn-view" onclick="viewFile(\'' + file.id + '\', \'' + escapedName + '\')" title="Lihat"><i class="fas fa-eye"></i></button>' +
            '<button class="btn-edit" onclick="editFile(\'' + file.id + '\', \'' + escapedName + '\')" title="Edit"><i class="fas fa-edit"></i></button>' +
            '<button class="btn-delete" onclick="deleteFile(\'' + file.id + '\', \'' + escapedName + '\')" title="Hapus"><i class="fas fa-trash"></i></button>' +
            '</div></div>';
    }
    grid.innerHTML = html;
}

function filterFiles() { renderFiles(); }

function viewFile(fileId, fileName) {
    var imageUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w800';
    document.getElementById('viewModalTitle').textContent = fileName;
    document.getElementById('viewModalImage').src = imageUrl;
    document.getElementById('viewModal').classList.add('active');
}

function closeViewModal() {
    document.getElementById('viewModal').classList.remove('active');
}

// =====================================================
// ADD / EDIT MODALS
// =====================================================

function openAddModal() {
    editingFile = null;
    selectedImageData = null;
    document.getElementById('modalTitle').textContent = 'Tambah File Baru';
    document.getElementById('fileName').value = '';
    document.getElementById('previewArea').innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>Klik untuk upload atau ambil foto</p>';
    document.getElementById('editModal').classList.add('active');
}

function editFile(fileId, fileName) {
    editingFile = { id: fileId, name: fileName };
    selectedImageData = null;
    var baseName = fileName.replace(/\.(jpg|jpeg|png|gif|webp|bmp)$/i, '');
    var thumbnailUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w400';
    document.getElementById('modalTitle').textContent = 'Edit File';
    document.getElementById('fileName').value = baseName;
    document.getElementById('previewArea').innerHTML = '<img src="' + thumbnailUrl + '" alt="' + fileName + '">';
    document.getElementById('editModal').classList.add('active');
}

function closeModal() {
    document.getElementById('editModal').classList.remove('active');
    editingFile = null;
    selectedImageData = null;
}

function handleFileSelect(event) {
    var file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('Pilih file gambar', 'error');
        return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        selectedImageData = e.target.result;
        document.getElementById('previewArea').innerHTML = '<img src="' + selectedImageData + '" alt="Preview">';
    };
    reader.readAsDataURL(file);
}

// =====================================================
// CAMERA
// =====================================================
var cameraStream = null;
var currentFacingMode = 'environment';

function openCamera() {
    var cameraModal = document.getElementById('cameraModal');
    if (!cameraModal || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        openCameraFallback();
        return;
    }
    cameraModal.classList.add('active');
    startCamera(currentFacingMode);
}

async function startCamera(facingMode) {
    var video = document.getElementById('cameraVideo');
    stopCameraStream();
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        video.srcObject = cameraStream;
        await video.play();
    } catch (error) {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            video.srcObject = cameraStream;
            await video.play();
        } catch (e) {
            showCameraError(e);
        }
    }
}

function showCameraError(error) {
    var video = document.getElementById('cameraVideo');
    var errorMsg = 'Tidak dapat mengakses kamera.';
    if (error.name === 'NotAllowedError') errorMsg = 'Izin kamera ditolak.';
    else if (error.name === 'NotFoundError') errorMsg = 'Kamera tidak ditemukan.';
    var errorDiv = document.createElement('div');
    errorDiv.className = 'camera-error';
    errorDiv.id = 'cameraErrorDiv';
    errorDiv.innerHTML = '<i class="fas fa-video-slash"></i><h4>' + errorMsg + '</h4>' +
        '<button class="btn-fallback" onclick="closeCameraAndUpload()"><i class="fas fa-upload"></i> Upload Foto</button>';
    video.style.display = 'none';
    var existing = document.getElementById('cameraErrorDiv');
    if (existing) existing.remove();
    video.parentElement.insertBefore(errorDiv, video.parentElement.querySelector('.camera-controls'));
}

function switchCamera() {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    startCamera(currentFacingMode);
}

function capturePhoto() {
    var video = document.getElementById('cameraVideo');
    var canvas = document.getElementById('cameraCanvas');
    if (!video.srcObject || video.readyState < 2) {
        showToast('Kamera belum siap', 'error');
        return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    selectedImageData = canvas.toDataURL('image/jpeg', 0.85);
    document.getElementById('previewArea').innerHTML = '<img src="' + selectedImageData + '" alt="Preview">';
    closeCamera();
    showToast('Foto berhasil diambil', 'success');
}

function closeCamera() {
    stopCameraStream();
    var cameraModal = document.getElementById('cameraModal');
    if (cameraModal) cameraModal.classList.remove('active');
    var video = document.getElementById('cameraVideo');
    if (video) video.style.display = 'block';
    var errorDiv = document.getElementById('cameraErrorDiv');
    if (errorDiv) errorDiv.remove();
}

function stopCameraStream() {
    if (cameraStream) {
        var tracks = cameraStream.getTracks();
        for (var t = 0; t < tracks.length; t++) tracks[t].stop();
        cameraStream = null;
    }
}

function closeCameraAndUpload() {
    closeCamera();
    document.getElementById('fileInput').click();
}

function openCameraFallback() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = handleFileSelect;
    input.click();
}

// =====================================================
// CRUD OPERATIONS
// =====================================================

async function saveFile() {
    var fileName = document.getElementById('fileName').value.trim();
    if (!fileName) { showToast('Masukkan nama file', 'error'); return; }
    if (!selectedImageData && !editingFile) { showToast('Pilih gambar terlebih dahulu', 'error'); return; }
    showLoading('Menyimpan...');
    try {
        if (editingFile) {
            if (selectedImageData) {
                // Replace: delete old + upload new
                console.log('Replacing file:', editingFile.id);
                showLoading('Menghapus file lama...');
                await deleteMasterFileAPI(editingFile.id);
                showLoading('Mengupload file baru...');
                await uploadNewFile(fileName);
            } else {
                // Rename only
                console.log('Renaming file:', editingFile.id, 'to', fileName);
                showLoading('Mengubah nama file...');
                var result = await renameMasterFileAPI(editingFile.id, fileName);
                if (!result || !result.success) throw new Error((result && result.error) || 'Rename failed');
            }
            showToast('File berhasil diupdate ✓', 'success');
        } else {
            // New file
            console.log('Uploading new file:', fileName);
            showLoading('Mengupload foto... (mohon tunggu)');
            await uploadNewFile(fileName);
            showToast('File berhasil ditambahkan ✓', 'success');
        }
        closeModal();
        showLoading('Memuat ulang folder...');
        await refreshCurrentFolder();
    } catch (error) {
        console.error('Save error:', error);
        showToast('Error: ' + error.message, 'error');
    }
    hideLoading();
}

async function uploadNewFile(fileName) {
    var mimeType = 'image/jpeg';
    if (selectedImageData.indexOf('image/png') > -1) mimeType = 'image/png';
    else if (selectedImageData.indexOf('image/gif') > -1) mimeType = 'image/gif';
    else if (selectedImageData.indexOf('image/webp') > -1) mimeType = 'image/webp';

    console.log('Uploading:', fileName, 'to folder:', currentFolderConfig.folderName || currentFolder);
    var result = await uploadMasterFileAPI({
        photo: selectedImageData,
        fileName: fileName,
        folderName: currentFolderConfig.folderName || currentFolder,
        subfolder: currentFolderConfig.subfolder || null,
        mimeType: mimeType
    });
    console.log('Upload result:', result);
    if (!result || !result.success) throw new Error((result && result.error) || 'Upload failed');
    return result;
}

function deleteFile(fileId, fileName) {
    editingFile = { id: fileId, name: fileName };
    document.getElementById('deleteFileName').textContent = fileName;
    document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    editingFile = null;
}

async function confirmDelete() {
    if (!editingFile) return;
    var fileToDelete = { id: editingFile.id, name: editingFile.name };
    showLoading('Menghapus...');
    closeDeleteModal();
    try {
        console.log('Deleting file:', fileToDelete.id);
        var result = await deleteMasterFileAPI(fileToDelete.id);
        console.log('Delete result:', result);
        if (result && result.success) {
            showToast('File berhasil dihapus', 'success');
            await refreshCurrentFolder();
        } else {
            throw new Error((result && result.error) || 'Delete failed');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Error: ' + error.message, 'error');
    }
    hideLoading();
}

async function refreshCurrentFolder() {
    if (!currentFolder || !currentFolderConfig) return;
    try {
        var result = await listMasterFiles(
            currentFolderConfig.folderName || currentFolder,
            currentFolderConfig.subfolder || null
        );
        if (result && result.success) {
            currentFiles = result.files || [];
            folderCache[currentFolder] = currentFiles;
            for (var i = 0; i < MASTER_FOLDERS.length; i++) {
                if (MASTER_FOLDERS[i].name === currentFolder) {
                    document.getElementById('count-' + i).textContent = currentFiles.length + ' file';
                    break;
                }
            }
            renderFiles();
        }
    } catch (error) { console.error('Refresh error:', error); }
}

// =====================================================
// UI HELPERS
// =====================================================

function showLoading(text) {
    document.getElementById('loadingText').textContent = text || 'Memuat...';
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    var icon = type === 'success' ? 'check-circle' : (type === 'error' ? 'exclamation-circle' : 'info-circle');
    toast.innerHTML = '<i class="fas fa-' + icon + '"></i> ' + message;
    container.appendChild(toast);
    setTimeout(function() { toast.classList.add('show'); }, 10);
    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
}
