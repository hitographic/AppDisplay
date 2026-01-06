// =====================================================
// VALID DISPLAY - Records Page Script
// With Permissions and Validation Feature
// =====================================================

let allRecords = [];
let filteredRecords = [];
let currentPreviewRecord = null;
let currentValidationRecordId = null;

// Pagination variables
let currentPage = 1;
let recordsPerPage = 12; // Default 12 records per page (3x4 grid)
const recordsPerPageOptions = [8, 12, 16, 24, 48];

// Permission check functions
function hasPermission(permission) {
    const user = auth.getUser();
    if (!user) return false;
    
    // Legacy support: admin role has all permissions
    if (user.role === 'admin') return true;
    
    // Check permissions array
    if (user.permissions && Array.isArray(user.permissions)) {
        return user.permissions.includes(permission);
    }
    
    return false;
}

function canEdit() {
    return hasPermission('records_editor');
}

function canValidate() {
    return hasPermission('records_validator');
}

function canView() {
    return hasPermission('records_viewer') || hasPermission('records_editor') || hasPermission('records_validator');
}

document.addEventListener('DOMContentLoaded', function() {
    // Protect page
    if (!protectPage()) return;

    // Check if user can view
    if (!canView()) {
        showToast('Anda tidak memiliki akses untuk melihat records', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return;
    }

    // Initialize page
    initRecordsPage();
});

async function initRecordsPage() {
    // Show user name and role
    const user = auth.getUser();
    document.getElementById('userName').textContent = user?.name || 'User';

    // Show/hide admin controls based on permissions
    setupPermissionBasedUI();

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

function setupPermissionBasedUI() {
    const addDataBtn = document.querySelector('.btn-primary[onclick="openAddDataPopup()"]');
    const userMgmtLink = document.getElementById('userManagementLink');
    const googleDriveAlert = document.getElementById('googleDriveAlert');
    const googleDriveConnected = document.getElementById('googleDriveConnected');
    const driveConnectionPopup = document.getElementById('driveConnectionPopup');
    
    // Show user management link for user_admin permission
    if (hasPermission('user_admin')) {
        if (userMgmtLink) {
            userMgmtLink.style.display = 'inline-flex';
        }
    }
    
    // Hide add button if user can't edit
    if (!canEdit()) {
        if (addDataBtn) {
            addDataBtn.style.display = 'none';
        }
    }

    // Show/hide Google Drive alerts only for editors
    if (canEdit()) {
        updateGoogleDriveAlerts();
    } else {
        // Hide alerts for non-editors
        if (googleDriveAlert) googleDriveAlert.style.display = 'none';
        if (googleDriveConnected) googleDriveConnected.style.display = 'none';
    }
    
    // Pastikan popup Google Drive tersembunyi dari awal
    // Popup akan ditampilkan oleh initGoogleDriveConnection hanya jika diperlukan
    if (driveConnectionPopup && !driveConnectionPopup.classList.contains('hidden')) {
        driveConnectionPopup.classList.add('hidden');
    }
}

async function initGoogleDriveConnection() {
    try {
        // Initialize Google API only for editors who need to upload
        if (canEdit()) {
            await auth.initGoogleAPI();
            await auth.initGoogleIdentity();

            // Listen for token received event
            window.addEventListener('googleTokenReceived', () => {
                showToast('Google Drive terkoneksi!', 'success');
                updateDriveStatus(true);
                updateGoogleDriveAlerts();
                closeDriveConnectionPopup(true); // Force close after connect
            });

            // Check connection status
            const hasToken = auth.hasGoogleToken();
            const hasConfig = checkConfig();
            const connected = hasToken && hasConfig;
            
            console.log('Drive connection check:', { hasToken, hasConfig, connected });
            
            updateDriveStatus(connected);
            updateGoogleDriveAlerts();

            // Auto show popup HANYA jika belum terkoneksi
            if (!connected) {
                console.log('Google Drive belum terkoneksi - menampilkan popup');
                setTimeout(() => {
                    showDriveConnectionPopup();
                }, 500);
            } else {
                console.log('Google Drive sudah terkoneksi - popup tidak ditampilkan');
            }
        }
    } catch (error) {
        console.error('Error initializing Google:', error);
        updateDriveStatus(false);
        if (canEdit()) {
            updateGoogleDriveAlerts();
            // Show popup even on error for editors (only if not connected)
            const connected = auth.hasGoogleToken() && checkConfig();
            if (!connected) {
                setTimeout(() => {
                    showDriveConnectionPopup();
                }, 500);
            }
        }
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
        hidePagination();
        return;
    }

    emptyState.classList.add('hidden');

    // Calculate pagination
    const totalRecords = filteredRecords.length;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    
    // Ensure current page is valid
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    if (currentPage < 1) {
        currentPage = 1;
    }
    
    // Get records for current page
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

    const userCanEdit = canEdit();
    const userCanValidate = canValidate();

    grid.innerHTML = paginatedRecords.map(record => {
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
        
        // Validation badge
        let validationBadge = '';
        if (record.validationStatus === 'valid') {
            validationBadge = `<div class="validation-badge valid"><i class="fas fa-check-circle"></i> Valid</div>`;
        } else if (record.validationStatus === 'invalid') {
            validationBadge = `<div class="validation-badge invalid" title="${escapeHtml(record.validationReason || '')}"><i class="fas fa-times-circle"></i> Invalid</div>`;
        } else if (userCanValidate) {
            validationBadge = `<div class="validation-badge pending"><i class="fas fa-clock"></i> Belum Validasi</div>`;
        }
        
        return `
        <div class="record-card" onclick="openPreview('${record.id}')" style="position: relative;">
            ${validationBadge}
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
                ${userCanEdit ? `
                <button class="btn-edit" onclick="editRecord('${record.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-delete" onclick="deleteRecord('${record.id}')">
                    <i class="fas fa-trash"></i>
                </button>
                ` : ''}
                ${userCanValidate ? `
                <button class="btn-validate" onclick="openValidationPopup('${record.id}')">
                    <i class="fas fa-check-double"></i>
                </button>
                ` : ''}
            </div>
        </div>
    `;
    }).join('');
    
    // Render pagination
    renderPagination(totalPages, totalRecords);
}

// ==================== PAGINATION FUNCTIONS ====================

function renderPagination(totalPages, totalRecords) {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = `
            <div class="pagination-info">
                <span>Menampilkan ${totalRecords} data</span>
            </div>
        `;
        return;
    }
    
    const startRecord = (currentPage - 1) * recordsPerPage + 1;
    const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);
    
    let paginationHTML = `
        <div class="pagination-wrapper">
            <div class="pagination-info">
                <span>Menampilkan ${startRecord}-${endRecord} dari ${totalRecords} data</span>
                <div class="per-page-selector">
                    <label>Per halaman:</label>
                    <select id="recordsPerPageSelect" onchange="changeRecordsPerPage(this.value)">
                        ${recordsPerPageOptions.map(opt => 
                            `<option value="${opt}" ${opt === recordsPerPage ? 'selected' : ''}>${opt}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
            <div class="pagination-controls">
                <button class="pagination-btn" onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''} title="Halaman Pertama">
                    <i class="fas fa-angle-double-left"></i>
                </button>
                <button class="pagination-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} title="Sebelumnya">
                    <i class="fas fa-angle-left"></i>
                </button>
                
                ${generatePageNumbers(totalPages)}
                
                <button class="pagination-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} title="Selanjutnya">
                    <i class="fas fa-angle-right"></i>
                </button>
                <button class="pagination-btn" onclick="goToPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''} title="Halaman Terakhir">
                    <i class="fas fa-angle-double-right"></i>
                </button>
            </div>
        </div>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

function generatePageNumbers(totalPages) {
    let pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
        // Show all pages
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
    } else {
        // Show limited pages with ellipsis
        if (currentPage <= 3) {
            pages = [1, 2, 3, 4, '...', totalPages];
        } else if (currentPage >= totalPages - 2) {
            pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        } else {
            pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
        }
    }
    
    return pages.map(page => {
        if (page === '...') {
            return `<span class="pagination-ellipsis">...</span>`;
        }
        return `
            <button class="pagination-btn ${page === currentPage ? 'active' : ''}" 
                    onclick="goToPage(${page})">${page}</button>
        `;
    }).join('');
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderRecords();
    
    // Scroll to top of records grid
    const grid = document.getElementById('recordsGrid');
    if (grid) {
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function changeRecordsPerPage(value) {
    recordsPerPage = parseInt(value);
    currentPage = 1; // Reset to first page
    renderRecords();
}

function hidePagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    if (paginationContainer) {
        paginationContainer.innerHTML = '';
    }
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

    currentPage = 1; // Reset to first page when searching
    renderRecords();
    
    showToast(`Ditemukan ${filteredRecords.length} hasil`, 'info');
}

function resetSearch() {
    document.getElementById('searchNegara').value = '';
    document.getElementById('searchFlavor').value = '';
    document.getElementById('searchDate').value = '';

    filteredRecords = [...allRecords];
    currentPage = 1; // Reset to first page
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

    container.innerHTML = currentPreviewRecord.kodeProduksi.map((kode, index) => {
        // Support both old format (array) and new format (string)
        const kodeText = Array.isArray(kode) ? kode.filter(k => k).join(' | ') : kode;
        return `<span>Kode ${index + 1}: ${escapeHtml(kodeText)}</span>`;
    }).join('');
}

// ==================== RECORD ACTIONS ====================

function editRecord(recordId) {
    // Check editor permission
    if (!canEdit()) {
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
    // Check editor permission
    if (!canEdit()) {
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

// ==================== VALIDATION FUNCTIONS ====================

function openValidationPopup(recordId) {
    if (!canValidate()) {
        showToast('Anda tidak memiliki akses untuk validasi', 'error');
        return;
    }
    
    const record = allRecords.find(r => r.id === recordId);
    if (!record) {
        showToast('Record tidak ditemukan', 'error');
        return;
    }
    
    currentValidationRecordId = recordId;
    
    // Set record info
    document.getElementById('validationRecordInfo').innerHTML = `
        <strong>${escapeHtml(record.flavor)}</strong> - ${escapeHtml(record.negara)}<br>
        <small>Tanggal: ${formatDate(record.tanggal)}</small>
    `;
    
    document.getElementById('validationRecordId').value = recordId;
    
    // Reset selection
    document.querySelectorAll('.validation-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    document.querySelectorAll('input[name="validationStatus"]').forEach(radio => {
        radio.checked = false;
    });
    document.getElementById('invalidReasonContainer').style.display = 'none';
    document.getElementById('invalidReason').value = '';
    
    // Pre-select if already validated
    if (record.validationStatus) {
        selectValidation(record.validationStatus);
        if (record.validationStatus === 'invalid' && record.validationReason) {
            document.getElementById('invalidReason').value = record.validationReason;
        }
    }
    
    document.getElementById('validationPopup').classList.remove('hidden');
}

function closeValidationPopup() {
    document.getElementById('validationPopup').classList.add('hidden');
    currentValidationRecordId = null;
}

function selectValidation(status) {
    // Update radio buttons
    document.querySelectorAll('input[name="validationStatus"]').forEach(radio => {
        radio.checked = radio.value === status;
    });
    
    // Update visual selection
    document.querySelectorAll('.validation-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    const selectedOption = document.querySelector(`.${status}-option`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    // Show/hide invalid reason field
    const reasonContainer = document.getElementById('invalidReasonContainer');
    if (status === 'invalid') {
        reasonContainer.style.display = 'block';
    } else {
        reasonContainer.style.display = 'none';
    }
}

async function submitValidation() {
    const recordId = document.getElementById('validationRecordId').value;
    const statusRadio = document.querySelector('input[name="validationStatus"]:checked');
    
    if (!statusRadio) {
        showToast('Pilih status validasi', 'error');
        return;
    }
    
    const status = statusRadio.value;
    const reason = status === 'invalid' ? document.getElementById('invalidReason').value.trim() : '';
    
    if (status === 'invalid' && !reason) {
        showToast('Masukkan keterangan invalid', 'error');
        return;
    }
    
    // Get current user
    const currentUser = auth.getUser();
    const validatorName = currentUser ? currentUser.name : 'Unknown';
    
    showLoading('Menyimpan validasi...');
    
    try {
        // Update record with validation info
        const record = allRecords.find(r => r.id === recordId);
        if (record) {
            record.validationStatus = status;
            record.validationReason = reason;
            record.validatedBy = validatorName;
            record.validatedAt = new Date().toISOString();
            
            // Update in storage
            await storage.updateRecord(recordId, record);
            
            hideLoading();
            showToast(`Record berhasil di-${status === 'valid' ? 'validasi' : 'invalid'}kan`, 'success');
            closeValidationPopup();
            
            // Re-render records
            renderRecords();
        }
    } catch (error) {
        hideLoading();
        console.error('Error saving validation:', error);
        showToast('Gagal menyimpan validasi', 'error');
    }
}

// Close popup when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('popup-overlay')) {
        // Prevent closing Drive Connection popup if user is editor and not connected
        const isDrivePopup = e.target.id === 'driveConnectionPopup';
        const isConnected = auth.hasGoogleToken() && checkConfig();
        const canEdit = currentPermissions.some(p => p === 'records_editor');
        
        if (isDrivePopup && canEdit && !isConnected) {
            // Don't close popup for non-connected editors
            showToast('Harap hubungkan Google Drive terlebih dahulu', 'warning');
            return;
        }
        
        e.target.classList.add('hidden');
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAddDataPopup();
        closePreviewPopup();
        closeValidationPopup();
        
        // Only allow closing Drive popup if connected
        const isConnected = auth.hasGoogleToken() && checkConfig();
        const canEdit = currentPermissions.some(p => p === 'records_editor');
        
        // If user is editor and not connected, prevent closing popup with ESC
        if (!canEdit || isConnected) {
            closeDriveConnectionPopup();
        }
    }
});

// ==================== GOOGLE DRIVE CONNECTION POPUP ====================

function updateGoogleDriveAlerts() {
    const googleDriveAlert = document.getElementById('googleDriveAlert');
    const googleDriveConnected = document.getElementById('googleDriveConnected');
    
    const isConnected = auth.hasGoogleToken() && checkConfig();
    
    if (isConnected) {
        if (googleDriveAlert) googleDriveAlert.style.display = 'none';
        if (googleDriveConnected) googleDriveConnected.style.display = 'flex';
    } else {
        if (googleDriveAlert) googleDriveAlert.style.display = 'flex';
        if (googleDriveConnected) googleDriveConnected.style.display = 'none';
    }
}

function showDriveConnectionPopup() {
    // Double check - jangan tampilkan popup jika sudah terkoneksi
    const isConnected = auth.hasGoogleToken() && checkConfig();
    if (isConnected) {
        console.log('showDriveConnectionPopup: Sudah terkoneksi, popup tidak ditampilkan');
        return;
    }
    
    const popup = document.getElementById('driveConnectionPopup');
    if (popup) {
        popup.classList.remove('hidden');
        updateDrivePopupButtons();
    }
}

function openDriveConnectionPopup() {
    showDriveConnectionPopup();
}

function closeDriveConnectionPopup(force = false) {
    const popup = document.getElementById('driveConnectionPopup');
    const isConnected = auth.hasGoogleToken() && checkConfig();
    
    // Force close atau sudah terkoneksi
    if ((force || isConnected) && popup) {
        popup.classList.add('hidden');
    } else if (!isConnected && !force) {
        showToast('Harap hubungkan Google Drive terlebih dahulu', 'warning');
    }
}

function updateDrivePopupButtons() {
    const connectBtn = document.getElementById('btnConnectDrivePopup');
    const disconnectBtn = document.getElementById('btnDisconnectDrivePopup');
    const skipBtn = document.getElementById('btnSkipDrive');
    const statusDiv = document.getElementById('driveConnectStatus');
    
    const isConnected = auth.hasGoogleToken() && checkConfig();
    
    if (connectBtn && disconnectBtn) {
        if (isConnected) {
            connectBtn.style.display = 'none';
            disconnectBtn.style.display = 'block';
            if (skipBtn) skipBtn.style.display = 'none';
            
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.style.background = '#d4edda';
                statusDiv.style.color = '#155724';
                statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> Terhubung dengan Google Drive';
            }
        } else {
            connectBtn.style.display = 'block';
            disconnectBtn.style.display = 'none';
            if (skipBtn) skipBtn.style.display = 'block';
            
            if (statusDiv) {
                statusDiv.style.display = 'none';
            }
        }
    }
}

async function connectGoogleDriveFromPopup() {
    try {
        const connectBtn = document.getElementById('btnConnectDrivePopup');
        const statusDiv = document.getElementById('driveConnectStatus');
        
        if (connectBtn) {
            connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghubungkan...';
            connectBtn.disabled = true;
        }

        if (statusDiv) {
            statusDiv.style.display = 'block';
            statusDiv.style.background = '#fff3cd';
            statusDiv.style.color = '#856404';
            statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghubungkan ke Google Drive...';
        }

        // Request Google Drive access
        await auth.requestGoogleToken();
        
        // Update UI
        showToast('Google Drive berhasil terkoneksi!', 'success');
        updateGoogleDriveAlerts();
        updateDrivePopupButtons();
        
        // Close popup after successful connection
        setTimeout(() => {
            closeDriveConnectionPopup();
        }, 1500);
        
    } catch (error) {
        console.error('Error connecting Google Drive:', error);
        showToast('Gagal menghubungkan Google Drive: ' + error.message, 'error');
        
        const connectBtn = document.getElementById('btnConnectDrivePopup');
        const statusDiv = document.getElementById('driveConnectStatus');
        
        if (connectBtn) {
            connectBtn.innerHTML = '<i class="fas fa-link"></i> Menunggu koneksi...';
            connectBtn.disabled = false;
        }
        
        if (statusDiv) {
            statusDiv.style.display = 'block';
            statusDiv.style.background = '#f8d7da';
            statusDiv.style.color = '#721c24';
            statusDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Gagal terhubung. Silakan coba lagi.';
        }
    }
}

function disconnectGoogleDriveFromPopup() {
    if (confirm('Apakah Anda yakin ingin memutuskan koneksi Google Drive?\n\nFoto yang sudah diupload tetap tersimpan, tapi foto baru akan disimpan lokal saja.')) {
        // Clear Google token
        auth.clearGoogleToken();
        
        // Update UI
        showToast('Google Drive terputus', 'info');
        updateGoogleDriveAlerts();
        updateDrivePopupButtons();
        
        // Show popup again since disconnected
        showDriveConnectionPopup();
    }
}

function skipGoogleDriveConnection() {
    if (confirm('Jika melewati koneksi Google Drive, foto hanya akan tersimpan di browser (temporary).\n\nAnda masih bisa menghubungkan Google Drive nanti. Lanjutkan?')) {
        closeDriveConnectionPopup();
        showToast('Foto akan disimpan lokal saja (tidak permanen)', 'info');
    }
}

