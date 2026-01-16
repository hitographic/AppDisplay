// =====================================================
// Edit Master Data - JavaScript
// Manage photos in Google Drive folders
// Version 1.0
// =====================================================

// Folder configuration
const MASTER_FOLDERS = [
    { name: 'Bumbu', icon: 'fa-pepper-hot', color: '#e74c3c' },
    { name: 'Bumbu Kuah', icon: 'fa-bowl-food', color: '#e67e22' },
    { name: 'Five or Six in One', icon: 'fa-cubes', color: '#9b59b6' },
    { name: 'Kode Etiket', icon: 'fa-tag', color: '#3498db' },
    { name: 'Kode Karton', icon: 'fa-box', color: '#1abc9c' },
    { name: 'Kode SI', icon: 'fa-barcode', color: '#34495e' },
    { name: 'Minyak Bumbu', icon: 'fa-oil-can', color: '#f1c40f' },
    { name: 'Plakban', icon: 'fa-tape', color: '#95a5a6' }
];

// State
let currentFolder = null;
let currentFolderId = null;
let currentFiles = [];
let editingFile = null;
let selectedImageData = null;
let folderCache = {};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    renderFolderGrid();
    initGoogleAPI();
});

// Check authentication
function checkAuth() {
    // Use CONFIG storage key if available, otherwise try common keys
    const storageKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS) 
        ? CONFIG.STORAGE_KEYS.USER 
        : 'validDisplay_user';
    
    const user = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    document.getElementById('userName').textContent = user.name || 'User';
}

// Logout
function logout() {
    const storageKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS) 
        ? CONFIG.STORAGE_KEYS.USER 
        : 'validDisplay_user';
    localStorage.removeItem(storageKey);
    window.location.href = 'index.html';
}

// Initialize Google API
function initGoogleAPI() {
    if (typeof gapi !== 'undefined') {
        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    apiKey: CONFIG.GOOGLE_API_KEY,
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
                });
                console.log('Google API initialized');
                
                // Check for existing token and auto-connect
                autoConnectGoogleDrive();
            } catch (error) {
                console.error('Error initializing Google API:', error);
                updateDriveStatus(false);
            }
        });
    } else {
        console.error('Google API not loaded');
        updateDriveStatus(false);
    }
}

// Auto-connect to Google Drive if token exists
async function autoConnectGoogleDrive() {
    const token = localStorage.getItem('google_access_token');
    
    if (token) {
        console.log('Found existing token, auto-connecting...');
        gapi.client.setToken({ access_token: token });
        
        // Verify token is still valid by making a simple API call
        try {
            await gapi.client.drive.about.get({ fields: 'user' });
            console.log('Token is valid, connected to Google Drive');
            updateDriveStatus(true);
            loadFolderCounts();
        } catch (error) {
            console.log('Token expired or invalid, need to re-authenticate');
            localStorage.removeItem('google_access_token');
            updateDriveStatus(false);
        }
    } else {
        console.log('No token found');
        updateDriveStatus(false);
    }
}

// Check Google Drive connection
function checkDriveConnection() {
    const token = localStorage.getItem('google_access_token');
    if (token) {
        gapi.client.setToken({ access_token: token });
        updateDriveStatus(true);
        loadFolderCounts();
    } else {
        updateDriveStatus(false);
    }
}

// Connect to Google Drive
async function connectGoogleDrive() {
    showLoading('Menghubungkan ke Google Drive...');
    
    try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive',
            callback: async (response) => {
                if (response.access_token) {
                    localStorage.setItem('google_access_token', response.access_token);
                    gapi.client.setToken({ access_token: response.access_token });
                    updateDriveStatus(true);
                    await loadFolderCounts();
                    hideLoading();
                    showToast('Berhasil terhubung ke Google Drive', 'success');
                }
            },
            error_callback: (error) => {
                hideLoading();
                showToast('Gagal menghubungkan: ' + error.message, 'error');
            }
        });
        tokenClient.requestAccessToken();
    } catch (error) {
        hideLoading();
        showToast('Error: ' + error.message, 'error');
    }
}

// Update drive status UI
function updateDriveStatus(connected) {
    const statusDiv = document.getElementById('driveStatus');
    const statusText = document.getElementById('driveStatusText');
    const statusDesc = document.getElementById('driveStatusDesc');
    const connectBtn = document.getElementById('connectDriveBtn');
    
    if (connected) {
        statusDiv.className = 'drive-status connected';
        statusText.textContent = 'Terhubung ✓';
        statusDesc.textContent = 'Siap mengelola foto';
        connectBtn.innerHTML = '<i class="fas fa-check"></i> Terhubung';
        connectBtn.disabled = true;
    } else {
        statusDiv.className = 'drive-status disconnected';
        statusText.textContent = 'Belum Terhubung';
        statusDesc.textContent = 'Hubungkan untuk mengelola foto';
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> Hubungkan';
        connectBtn.disabled = false;
    }
}

// Render folder grid
function renderFolderGrid() {
    const grid = document.getElementById('folderGrid');
    grid.innerHTML = MASTER_FOLDERS.map((folder, index) => `
        <div class="folder-card" onclick="selectFolder('${folder.name}')" id="folder-${index}">
            <i class="fas ${folder.icon}" style="color: ${folder.color}"></i>
            <h3>${folder.name}</h3>
            <div class="file-count" id="count-${index}">- file</div>
        </div>
    `).join('');
}

// Load folder file counts
async function loadFolderCounts() {
    if (!isConnected()) return;
    
    for (let i = 0; i < MASTER_FOLDERS.length; i++) {
        const folder = MASTER_FOLDERS[i];
        try {
            const folderId = await getFolderId(folder.name);
            if (folderId) {
                const files = await getFilesInFolder(folderId);
                document.getElementById(`count-${i}`).textContent = `${files.length} file`;
                folderCache[folder.name] = { id: folderId, files: files };
            } else {
                document.getElementById(`count-${i}`).textContent = 'Folder tidak ditemukan';
            }
        } catch (error) {
            console.error(`Error loading ${folder.name}:`, error);
            document.getElementById(`count-${i}`).textContent = 'Error';
        }
    }
}

// Check if connected
function isConnected() {
    return gapi.client && gapi.client.getToken && gapi.client.getToken() !== null;
}

// Get folder ID by name
async function getFolderId(folderName) {
    try {
        const response = await gapi.client.drive.files.list({
            q: `'${CONFIG.GOOGLE_FOLDER_ID}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            pageSize: 1
        });
        
        if (response.result.files && response.result.files.length > 0) {
            return response.result.files[0].id;
        }
    } catch (error) {
        console.error('Error getting folder ID:', error);
    }
    return null;
}

// Get files in folder
async function getFilesInFolder(folderId) {
    try {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed=false and (mimeType contains 'image/')`,
            fields: 'files(id, name, thumbnailLink, webViewLink, createdTime, modifiedTime)',
            pageSize: 500,
            orderBy: 'name'
        });
        
        return response.result.files || [];
    } catch (error) {
        console.error('Error getting files:', error);
        return [];
    }
}

// Select folder
async function selectFolder(folderName) {
    if (!isConnected()) {
        showToast('Hubungkan ke Google Drive terlebih dahulu', 'warning');
        return;
    }
    
    showLoading('Memuat file...');
    
    // Update UI
    document.querySelectorAll('.folder-card').forEach(card => card.classList.remove('active'));
    const folderIndex = MASTER_FOLDERS.findIndex(f => f.name === folderName);
    if (folderIndex >= 0) {
        document.getElementById(`folder-${folderIndex}`).classList.add('active');
    }
    
    currentFolder = folderName;
    document.getElementById('currentFolderName').textContent = folderName;
    
    try {
        // Use cache if available
        if (folderCache[folderName]) {
            currentFolderId = folderCache[folderName].id;
            currentFiles = folderCache[folderName].files;
        } else {
            currentFolderId = await getFolderId(folderName);
            if (currentFolderId) {
                currentFiles = await getFilesInFolder(currentFolderId);
                folderCache[folderName] = { id: currentFolderId, files: currentFiles };
            } else {
                currentFiles = [];
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
    const grid = document.getElementById('filesGrid');
    const searchTerm = document.getElementById('searchFiles').value.toLowerCase();
    
    const filteredFiles = currentFiles.filter(file => 
        file.name.toLowerCase().includes(searchTerm)
    );
    
    if (filteredFiles.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-folder-open"></i>
                <p>${searchTerm ? 'Tidak ada file yang cocok' : 'Folder kosong'}</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredFiles.map(file => {
        const thumbnailUrl = `https://drive.google.com/thumbnail?id=${file.id}&sz=w300`;
        const fileName = file.name.replace(/\.(jpg|jpeg|png|gif|webp|bmp)$/i, '');
        
        return `
            <div class="file-card">
                <div class="thumbnail">
                    <img src="${thumbnailUrl}" alt="${file.name}" 
                         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f5f5f5%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2214%22>No Image</text></svg>'">
                </div>
                <div class="file-info">
                    <div class="file-name" title="${file.name}">${fileName}</div>
                    <div class="file-actions">
                        <button class="btn-view" onclick="viewFile('${file.id}', '${file.name}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-edit" onclick="editFile('${file.id}', '${file.name}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="deleteFile('${file.id}', '${file.name}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Filter files
function filterFiles() {
    renderFiles();
}

// View file
function viewFile(fileId, fileName) {
    const imageUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    document.getElementById('viewModalTitle').textContent = fileName;
    document.getElementById('viewModalImage').src = imageUrl;
    document.getElementById('viewModal').classList.add('active');
}

// Close view modal
function closeViewModal() {
    document.getElementById('viewModal').classList.remove('active');
}

// Open add modal
function openAddModal() {
    editingFile = null;
    selectedImageData = null;
    document.getElementById('modalTitle').textContent = 'Tambah File Baru';
    document.getElementById('fileName').value = '';
    document.getElementById('previewArea').innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <p>Klik untuk upload atau ambil foto</p>
    `;
    document.getElementById('editModal').classList.add('active');
}

// Edit file
function editFile(fileId, fileName) {
    editingFile = { id: fileId, name: fileName };
    selectedImageData = null;
    
    const baseName = fileName.replace(/\.(jpg|jpeg|png|gif|webp|bmp)$/i, '');
    const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
    
    document.getElementById('modalTitle').textContent = 'Edit File';
    document.getElementById('fileName').value = baseName;
    document.getElementById('previewArea').innerHTML = `<img src="${thumbnailUrl}" alt="${fileName}">`;
    document.getElementById('editModal').classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('editModal').classList.remove('active');
    editingFile = null;
    selectedImageData = null;
}

// Handle file select
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('Pilih file gambar', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        selectedImageData = e.target.result;
        document.getElementById('previewArea').innerHTML = `<img src="${selectedImageData}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
}

// Open camera
function openCamera() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = handleFileSelect;
    input.click();
}

// Save file
async function saveFile() {
    const fileName = document.getElementById('fileName').value.trim();
    
    if (!fileName) {
        showToast('Masukkan nama file', 'error');
        return;
    }
    
    if (!selectedImageData && !editingFile) {
        showToast('Pilih gambar terlebih dahulu', 'error');
        return;
    }
    
    showLoading('Menyimpan...');
    
    try {
        if (editingFile) {
            // Update existing file
            if (selectedImageData) {
                // Delete old file and upload new one
                await deleteFileFromDrive(editingFile.id);
                await uploadFileToDrive(fileName, selectedImageData);
            } else {
                // Just rename
                await renameFile(editingFile.id, fileName);
            }
            showToast('File berhasil diupdate', 'success');
        } else {
            // Upload new file
            await uploadFileToDrive(fileName, selectedImageData);
            showToast('File berhasil ditambahkan', 'success');
        }
        
        // Refresh folder
        closeModal();
        await refreshCurrentFolder();
        
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
    
    hideLoading();
}

// Upload file to Drive
async function uploadFileToDrive(fileName, imageData) {
    // Convert base64 to blob
    const base64Data = imageData.split(',')[1];
    const mimeType = imageData.split(';')[0].split(':')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    
    // Determine extension
    const ext = mimeType === 'image/png' ? '.png' : '.jpg';
    const fullFileName = fileName + ext;
    
    // Create form data
    const metadata = {
        name: fullFileName,
        parents: [currentFolderId]
    };
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);
    
    // Upload
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + gapi.client.getToken().access_token
        },
        body: form
    });
    
    if (!response.ok) {
        throw new Error('Upload failed');
    }
    
    return await response.json();
}

// Rename file
async function renameFile(fileId, newName) {
    // Get current file to preserve extension
    const currentFile = currentFiles.find(f => f.id === fileId);
    const ext = currentFile ? currentFile.name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)?.[0] || '.jpg' : '.jpg';
    const fullName = newName + ext;
    
    await gapi.client.drive.files.update({
        fileId: fileId,
        resource: { name: fullName }
    });
}

// Delete file
function deleteFile(fileId, fileName) {
    editingFile = { id: fileId, name: fileName };
    document.getElementById('deleteFileName').textContent = fileName;
    document.getElementById('deleteModal').classList.add('active');
}

// Close delete modal
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    editingFile = null;
}

// Confirm delete
async function confirmDelete() {
    if (!editingFile) return;
    
    showLoading('Menghapus...');
    closeDeleteModal();
    
    try {
        await deleteFileFromDrive(editingFile.id);
        showToast('File berhasil dihapus', 'success');
        await refreshCurrentFolder();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
    
    hideLoading();
}

// Delete file from Drive
async function deleteFileFromDrive(fileId) {
    await gapi.client.drive.files.delete({ fileId: fileId });
}

// Refresh current folder
async function refreshCurrentFolder() {
    if (!currentFolder || !currentFolderId) return;
    
    currentFiles = await getFilesInFolder(currentFolderId);
    folderCache[currentFolder] = { id: currentFolderId, files: currentFiles };
    
    // Update count
    const folderIndex = MASTER_FOLDERS.findIndex(f => f.name === currentFolder);
    if (folderIndex >= 0) {
        document.getElementById(`count-${folderIndex}`).textContent = `${currentFiles.length} file`;
    }
    
    renderFiles();
}

// Show loading
function showLoading(text) {
    document.getElementById('loadingText').textContent = text || 'Memuat...';
    document.getElementById('loadingOverlay').classList.add('active');
}

// Hide loading
function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

// Show toast
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

console.log('✅ Edit Master module loaded (v1.0)');
