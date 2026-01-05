// =====================================================
// VALID DISPLAY - Records Page Script
// =====================================================

let allRecords = [];
let filteredRecords = [];
let currentPreviewRecord = null;

document.addEventListener('DOMContentLoaded', function() {
    // Protect page
    if (!protectPage()) return;

    // Initialize page
    initRecordsPage();
});

async function initRecordsPage() {
    // Show user name and role
    const user = auth.getUser();
    document.getElementById('userName').textContent = user?.name || 'User';

    // Show/hide admin controls based on role
    setupRoleBasedUI();

    // Initialize Google API for all users (to show status)
    await initGoogleDriveConnection();

    // Load records
    await loadRecords();

    // Initialize search filters
    initSearchFilters();

    // Initialize popup forms
    initForms();

    // Initialize preview tabs
    initPreviewTabs();
}

function setupRoleBasedUI() {
    const addDataBtn = document.querySelector('.btn-primary[onclick="openAddDataPopup()"]');
    const userMgmtLink = document.getElementById('userManagementLink');
    
    if (isAdmin()) {
        // Show user management link for admin
        if (userMgmtLink) {
            userMgmtLink.style.display = 'inline-flex';
        }
    }
    
    if (isViewer()) {
        // Hide add button for viewers
        if (addDataBtn) {
            addDataBtn.style.display = 'none';
        }
    }
}

async function initGoogleDriveConnection() {
    try {
        // Initialize Google API only for admin who needs to upload
        await auth.initGoogleAPI();
        await auth.initGoogleIdentity();

        // Listen for token received event
        window.addEventListener('googleTokenReceived', () => {
            showToast('Google Drive terkoneksi!', 'success');
            updateDriveStatus(true);
        });

        // Update initial status
        updateDriveStatus(auth.hasGoogleToken() && checkConfig());

        // Check for existing token
        if (!auth.hasGoogleToken() && checkConfig()) {
            console.log('Google Drive belum terkoneksi');
        }
    } catch (error) {
        console.error('Error initializing Google:', error);
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
        // Initialize if not already
        if (!auth.tokenClient) {
            await auth.initGoogleAPI();
            await auth.initGoogleIdentity();
        }
        
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

async function loadRecords() {
    showLoadingRecords();

    try {
        // Load from Google Sheets (if configured) or local storage
        allRecords = await storage.getAllRecords();
        filteredRecords = [...allRecords];
        renderRecords();
    } catch (error) {
        console.error('Error loading records:', error);
        allRecords = storage.getRecordsLocal();
        filteredRecords = [...allRecords];
        renderRecords();
    }
}

function showLoadingRecords() {
    document.getElementById('loadingRecords').classList.remove('hidden');
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('recordsGrid').innerHTML = '';
}

function hideLoadingRecords() {
    document.getElementById('loadingRecords').classList.add('hidden');
}

function renderRecords() {
    hideLoadingRecords();

    const grid = document.getElementById('recordsGrid');
    const emptyState = document.getElementById('emptyState');

    if (filteredRecords.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    const userIsAdmin = isAdmin();

    grid.innerHTML = filteredRecords.map(record => {
        // Get first available photo for card preview
        const previewPhoto = record.photos?.bumbu || record.photos?.karton || record.photos?.si || 
                            record.photos?.etiket || record.photos?.['m-bumbu'] || 
                            record.photos?.['etiket-banded'] || record.photos?.plakban;
        
        // Use Google thumbnail URL if photo has ID
        let previewSrc = '';
        if (previewPhoto?.id) {
            previewSrc = `https://lh3.googleusercontent.com/d/${previewPhoto.id}`;
        } else if (previewPhoto?.directLink) {
            previewSrc = previewPhoto.directLink;
        } else if (previewPhoto?.base64) {
            previewSrc = previewPhoto.base64;
        }
        
        return `
        <div class="record-card" onclick="openPreview('${record.id}')">
            <div class="card-preview">
                ${previewSrc 
                    ? `<img src="${previewSrc}" alt="${record.flavor}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                       <div class="no-image" style="display:none;">
                           <i class="fas fa-image"></i>
                           <p>No Preview</p>
                       </div>`
                    : `<div class="no-image">
                        <i class="fas fa-image"></i>
                        <p>No Preview</p>
                    </div>`
                }
            </div>
            <div class="card-content">
                <h3 class="card-title">${escapeHtml(record.flavor)}</h3>
                <div class="card-meta">
                    <span><i class="fas fa-globe"></i> ${escapeHtml(record.negara)}</span>
                    <span><i class="fas fa-calendar-plus"></i> ${formatDate(record.tanggal)}</span>
                </div>
                <div class="card-meta">
                    <span title="Dibuat"><i class="fas fa-plus-circle"></i> ${formatDateTime(record.createdAt)}${record.createdBy ? ` oleh ${escapeHtml(record.createdBy)}` : ''}</span>
                </div>
                <div class="card-meta">
                    <span title="Diupdate"><i class="fas fa-sync-alt"></i> ${formatDateTime(record.updatedAt || record.createdAt)}${record.updatedBy ? ` oleh ${escapeHtml(record.updatedBy)}` : ''}</span>
                </div>
                <span class="card-badge">${escapeHtml(record.negara)}</span>
            </div>
            <div class="card-actions" onclick="event.stopPropagation()">
                <button class="btn-view" onclick="openPreview('${record.id}')">
                    <i class="fas fa-eye"></i> Lihat
                </button>
                ${userIsAdmin ? `
                <button class="btn-edit" onclick="editRecord('${record.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-delete" onclick="deleteRecord('${record.id}')">
                    <i class="fas fa-trash"></i>
                </button>
                ` : ''}
            </div>
        </div>
    `;
    }).join('');
}

function initSearchFilters() {
    // Populate country filter
    const negaraSelect = document.getElementById('searchNegara');
    
    // Get unique countries from records
    const uniqueCountries = [...new Set(allRecords.map(r => r.negara))].sort();
    
    // Add all countries from config
    CONFIG.COUNTRIES.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        negaraSelect.appendChild(option);
    });
}

function toggleAdvancedSearch() {
    const panel = document.getElementById('advancedSearchPanel');
    panel.classList.toggle('hidden');
}

function applySearch() {
    const negara = document.getElementById('searchNegara').value.toLowerCase();
    const flavor = document.getElementById('searchFlavor').value.toLowerCase();
    const date = document.getElementById('searchDate').value;

    filteredRecords = allRecords.filter(record => {
        let match = true;

        if (negara && record.negara.toLowerCase() !== negara) {
            match = false;
        }

        if (flavor && !record.flavor.toLowerCase().includes(flavor)) {
            match = false;
        }

        if (date && record.tanggal !== date) {
            match = false;
        }

        return match;
    });

    renderRecords();
    
    showToast(`Ditemukan ${filteredRecords.length} hasil`, 'info');
}

function resetSearch() {
    document.getElementById('searchNegara').value = '';
    document.getElementById('searchFlavor').value = '';
    document.getElementById('searchDate').value = '';

    filteredRecords = [...allRecords];
    renderRecords();
    
    showToast('Filter direset', 'info');
}

// ==================== ADD DATA POPUP ====================

function openAddDataPopup() {
    // Only admin can add data
    if (!isAdmin()) {
        showToast('Anda tidak memiliki akses untuk menambah data', 'error');
        return;
    }
    
    const popup = document.getElementById('addDataPopup');
    popup.classList.remove('hidden');

    // Set default date to today
    document.getElementById('inputTanggal').value = new Date().toISOString().split('T')[0];
}

function closeAddDataPopup() {
    const popup = document.getElementById('addDataPopup');
    popup.classList.add('hidden');
    document.getElementById('addDataForm').reset();
}

function initForms() {
    const addDataForm = document.getElementById('addDataForm');
    
    addDataForm.addEventListener('submit', function(e) {
        e.preventDefault();
        proceedToCreateDisplay();
    });
}

// Check for duplicate Flavor + Negara combination
async function checkDuplicateFlavorNegara(flavor, negara) {
    try {
        // Get all existing records
        const existingRecords = await storage.getAllRecords();
        
        if (!existingRecords || existingRecords.length === 0) {
            return { isDuplicate: false };
        }
        
        // Find duplicate (same flavor and negara)
        const duplicate = existingRecords.find(record => {
            return record.flavor && record.negara &&
                record.flavor.toLowerCase().trim() === flavor.toLowerCase().trim() &&
                record.negara.toLowerCase().trim() === negara.toLowerCase().trim();
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
        return { isDuplicate: false };
    }
}

async function proceedToCreateDisplay() {
    const tanggal = document.getElementById('inputTanggal').value;
    const flavor = document.getElementById('inputFlavor').value.trim();
    const negara = document.getElementById('inputNegara').value;

    if (!tanggal || !flavor || !negara) {
        showToast('Mohon lengkapi semua field', 'error');
        return;
    }

    // Check for duplicate Flavor + Negara
    showLoading('Memeriksa data duplikat...');
    const duplicateCheck = await checkDuplicateFlavorNegara(flavor, negara);
    hideLoading();
    
    if (duplicateCheck.isDuplicate) {
        alert('⚠️ DATA DUPLIKAT!\n\n' + duplicateCheck.message);
        showToast('Kombinasi Flavor dan Negara sudah ada', 'error');
        return;
    }

    // Save to temp data
    const tempData = {
        id: storage.generateId(),
        tanggal: tanggal,
        flavor: flavor,
        negara: negara,
        createdAt: new Date().toISOString(),
        photos: {},
        kodeProduksi: []
    };

    storage.saveTempData(tempData);

    // Navigate to create display page
    window.location.href = 'create-display.html';
}

// ==================== PREVIEW POPUP ====================

function openPreview(recordId) {
    currentPreviewRecord = storage.getRecordById(recordId);
    
    console.log('🔍 Opening preview for:', recordId);
    console.log('🔍 Record data:', currentPreviewRecord);
    console.log('🔍 Photos:', currentPreviewRecord?.photos);
    
    if (!currentPreviewRecord) {
        showToast('Record tidak ditemukan', 'error');
        return;
    }

    const popup = document.getElementById('previewPopup');
    const title = document.getElementById('previewTitle');
    
    title.innerHTML = `<i class="fas fa-images"></i> ${escapeHtml(currentPreviewRecord.flavor)}`;
    
    // Show first tab content
    showPreviewTab('bumbu');
    
    // Show kode produksi
    renderKodeProduksi();
    
    popup.classList.remove('hidden');
}

function closePreviewPopup() {
    const popup = document.getElementById('previewPopup');
    popup.classList.add('hidden');
    currentPreviewRecord = null;
}

function initPreviewTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            
            // Update active state
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show tab content
            showPreviewTab(tab);
        });
    });
}

function showPreviewTab(tabId) {
    const previewContent = document.getElementById('previewContent');
    
    if (!currentPreviewRecord || !currentPreviewRecord.photos) {
        previewContent.innerHTML = `
            <div class="no-image">
                <i class="fas fa-image"></i>
                <p>Tidak ada foto</p>
            </div>
        `;
        return;
    }

    const photo = currentPreviewRecord.photos[tabId];
    console.log('📷 Preview tab:', tabId);
    console.log('📷 Photo data:', photo);
    
    if (photo && photo.id) {
        // Use Google Drive thumbnail URL format (more reliable for display)
        const imgSrc = `https://lh3.googleusercontent.com/d/${photo.id}`;
        console.log('📷 Image source:', imgSrc);
        
        previewContent.innerHTML = `
            <img src="${imgSrc}" alt="${tabId}" 
                 onerror="this.onerror=null; this.src='${photo.directLink || ''}'; if(!this.src) this.parentElement.innerHTML='<div class=\\'no-image\\'><i class=\\'fas fa-exclamation-triangle\\'></i><p>Gagal memuat gambar</p></div>';">
        `;
    } else if (photo && photo.base64) {
        // Fallback to base64 if available
        previewContent.innerHTML = `<img src="${photo.base64}" alt="${tabId}">`;
    } else {
        previewContent.innerHTML = `
            <div class="no-image">
                <i class="fas fa-image"></i>
                <p>Foto ${tabId} tidak tersedia</p>
            </div>
        `;
    }
}

function renderKodeProduksi() {
    const container = document.getElementById('previewKodeProduksi');
    
    if (!currentPreviewRecord || !currentPreviewRecord.kodeProduksi || currentPreviewRecord.kodeProduksi.length === 0) {
        container.innerHTML = '<span style="color: #999;">Tidak ada kode produksi</span>';
        return;
    }

    container.innerHTML = currentPreviewRecord.kodeProduksi.map((kode, index) => `
        <span>Kode ${index + 1}: ${escapeHtml(kode.join(' | '))}</span>
    `).join('');
}

// ==================== RECORD ACTIONS ====================

function editRecord(recordId) {
    // Only admin can edit
    if (!isAdmin()) {
        showToast('Anda tidak memiliki akses untuk mengedit data', 'error');
        return;
    }

    const record = storage.getRecordById(recordId);
    
    if (!record) {
        showToast('Record tidak ditemukan', 'error');
        return;
    }

    // Save to temp data for editing
    storage.saveTempData({ ...record, isEdit: true });
    
    // Navigate to create display page
    window.location.href = 'create-display.html';
}

async function deleteRecord(recordId) {
    // Only admin can delete
    if (!isAdmin()) {
        showToast('Anda tidak memiliki akses untuk menghapus data', 'error');
        return;
    }

    if (!confirm('Apakah Anda yakin ingin menghapus record ini?')) {
        return;
    }

    showLoading('Menghapus record...');

    try {
        const record = storage.getRecordById(recordId);
        
        // Delete photos from Google Drive if available
        if (record && record.photos && auth.hasGoogleToken()) {
            for (const key in record.photos) {
                if (record.photos[key]?.id) {
                    try {
                        await storage.deleteFromGoogleDrive(record.photos[key].id);
                    } catch (e) {
                        console.error('Error deleting photo:', e);
                    }
                }
            }
        }

        // Delete from storage (Google Sheets + local)
        await storage.deleteRecordComplete(recordId);

        // Update local array
        allRecords = allRecords.filter(r => r.id !== recordId);
        filteredRecords = filteredRecords.filter(r => r.id !== recordId);

        renderRecords();
        
        hideLoading();
        showToast('Record berhasil dihapus', 'success');
    } catch (error) {
        hideLoading();
        console.error('Error deleting record:', error);
        showToast('Gagal menghapus record', 'error');
    }
}

// ==================== UTILITIES ====================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
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

// Close popup when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('popup-overlay')) {
        e.target.classList.add('hidden');
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAddDataPopup();
        closePreviewPopup();
    }
});
