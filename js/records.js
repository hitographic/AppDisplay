// =====================================================
// VALID DISPLAY - Records Page Script
// With Permissions and Validation Feature
// Version 6.0 - Server-side photo upload via Apps Script (No Google OAuth needed)
// =====================================================

let allRecords = [];
let filteredRecords = [];
let currentPreviewRecord = null;
let currentValidationRecordId = null;

// Pagination variables
let currentPage = 1;
let recordsPerPage = 12; // Default 12 records per page (3x4 grid)
const recordsPerPageOptions = [8, 12, 16, 24, 48];

// Permission functions are now in auth.js (hasPermission, canEdit, canValidate, canView)

document.addEventListener('DOMContentLoaded', function() {
    // Protect page
    if (!protectPage()) return;

    // Check if user can view
    if (!canView()) {
        showToast('Anda tidak memiliki akses untuk melihat records', 'error');
        setTimeout(() => {
            const basePath = window.location.pathname.includes('/AppDisplay') ? '/AppDisplay/' : '/';
            window.location.href = basePath;
        }, 1500);
        return;
    }

    // Initialize page
    initRecordsPage();
});

async function initRecordsPage() {
    console.log('🚀 initRecordsPage: Starting initialization...');
    
    // Show user name and role
    const user = auth.getUser();
    console.log('👤 User info:', user);
    document.getElementById('userName').textContent = user?.name || 'User';

    // Show/hide admin controls based on permissions
    setupPermissionBasedUI();

    // Initialize Google API for all users (to show status)
    await initGoogleDriveConnection();

    // ✅ LOAD RECORDS IMMEDIATELY (like master.html)
    console.log('📋 initRecordsPage: Loading all records on page init...');
    showLoading('⏳ Memuat semua data...');
    const success = await loadRecords();
    hideLoading();
    
    if (success) {
        showToast(`✅ Loaded ${allRecords.length} records`, 'success');
    } else {
        showToast(`⚠️ Using local data (${allRecords.length} records)`, 'warning');
    }

    // Initialize search filters
    initSearchFilters();

    // Initialize popup forms
    initForms();

    // Initialize preview tabs
    initPreviewTabs();
    
    // ✅ Display all records immediately
    renderAllRecordsAsCardList();
    
    console.log('✅ initRecordsPage: Initialization complete! Records displayed.');
}

// Show welcome/instruction state when page first loads
function showWelcomeState() {
    const grid = document.getElementById('recordsGrid');
    const emptyState = document.getElementById('emptyState');
    
    grid.innerHTML = `
        <div class="welcome-state">
            <div class="welcome-icon">
                <i class="fas fa-search-plus"></i>
            </div>
            <h3>Mulai Pencarian</h3>
            <p>Klik tombol <strong>"Advanced Search"</strong> di atas untuk mulai mencari records</p>
            <small>Data akan dimuat ketika Anda melakukan pencarian pertama</small>
        </div>
    `;
    emptyState.classList.add('hidden');
    hidePagination();
}

function setupPermissionBasedUI() {
    const addDataBtn = document.querySelector('.btn-primary[onclick="openAddDataPopup()"]');
    const userMgmtLink = document.getElementById('userManagementLink');
    const masterDataLink = document.getElementById('masterDataLink');
    const googleDriveAlert = document.getElementById('googleDriveAlert');
    const googleDriveConnected = document.getElementById('googleDriveConnected');
    const driveConnectionPopup = document.getElementById('driveConnectionPopup');
    const editMasterBtn = document.querySelector('a[href="edit-master.html"]');
    
    // Show user management link for user_admin permission
    if (hasPermission('user_admin')) {
        if (userMgmtLink) {
            userMgmtLink.style.display = 'inline-flex';
        }
    }
    
    // Show master data link and edit master button for master_editor permission
    if (hasPermission('master_editor')) {
        if (masterDataLink) {
            masterDataLink.style.display = 'inline-flex';
        }
        if (editMasterBtn) {
            editMasterBtn.style.display = 'inline-flex';
        }
    }
    
    // Hide add button if user can't edit
    if (!canEdit()) {
        if (addDataBtn) {
            addDataBtn.style.display = 'none';
        }
    }

    // Google Drive selalu terkoneksi via server (Apps Script)
    // Tidak perlu login Google untuk user
    if (canEdit()) {
        // Tampilkan status connected untuk editor
        if (googleDriveConnected) googleDriveConnected.style.display = 'flex';
    } else {
        // Sembunyikan status untuk non-editor
        if (googleDriveConnected) googleDriveConnected.style.display = 'none';
    }
}

async function initGoogleDriveConnection() {
    // Google Drive sekarang selalu terkoneksi via Apps Script (server-side)
    // User tidak perlu login Google lagi
    console.log('📁 Google Drive: Auto-connected via Apps Script (server-side)');
    updateDriveStatus(true);
}

// Update Google Drive status display
function updateDriveStatus(connected) {
    const statusDiv = document.getElementById('driveStatus');
    const statusText = document.getElementById('driveStatusText');
    const btnConnect = document.getElementById('btnConnectDrive');
    
    if (!statusDiv || !statusText || !btnConnect) return;
    
    // Selalu tampilkan sebagai terkoneksi via Apps Script
    statusDiv.classList.remove('disconnected');
    statusDiv.classList.add('connected');
    statusText.textContent = 'Google Drive: Terkoneksi ✓';
    btnConnect.innerHTML = '<i class="fas fa-check"></i> Terhubung';
    btnConnect.classList.add('connected');
    btnConnect.disabled = true;
}

// Connect to Google Drive - sekarang tidak perlu karena dikelola server
async function connectGoogleDrive() {
    // Google Drive sekarang otomatis terkoneksi via Apps Script
    showToast('Google Drive sudah terkoneksi via server', 'success');
    updateDriveStatus(true);
}

async function loadRecords() {
    console.log('🚀 loadRecords: Starting FAST load...');

    try {
        // ✅ USE FAST ENDPOINT - getRecordsBasic() instead of getAllRecords()
        // This is 10-50x faster because it doesn't process photos (no Google Drive access)
        console.log('🚀 loadRecords: Calling storage.getRecordsBasic() [FAST]...');
        allRecords = await storage.getRecordsBasic();
        console.log(`✅ loadRecords: FAST loaded ${allRecords.length} records`);
        
        if (allRecords.length === 0) {
            console.warn('⚠️ WARNING: No records found! Check if Google Sheets connection is working.');
            showToast('❌ Data tidak ditemukan di Google Sheets', 'error');
        }
        
        filteredRecords = [...allRecords];
        return true;
    } catch (error) {
        console.error('❌ loadRecords: Error loading records:', error);
        
        allRecords = storage.getRecordsLocal();
        console.log(`📦 loadRecords: Fallback - Loaded ${allRecords.length} records from local storage`);
        
        if (allRecords.length === 0) {
            showToast(
                `❌ Gagal memuat data dari Google Sheets dan tidak ada data lokal.\n\nMohon refresh halaman atau hubungi admin.`,
                'error'
            );
        } else {
            showToast(
                `⚠️ Menggunakan ${allRecords.length} records dari cache lokal.\n\nUntuk data terbaru: refresh halaman.`,
                'warning'
            );
        }
        
        filteredRecords = [...allRecords];
        return false;
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
    console.log('🎨 renderRecords: Rendering', filteredRecords.length, 'records');

    const grid = document.getElementById('recordsGrid');
    const emptyState = document.getElementById('emptyState');

    // Tidak render list di halaman utama - list hanya muncul dari Advanced Search
    // Kosongkan grid dan sembunyikan empty state (data ada tapi tidak ditampilkan sampai search)
    grid.innerHTML = '';
    emptyState.classList.add('hidden');
    hidePagination();
    
    console.log('📋 Records loaded:', filteredRecords.length, '- Use Advanced Search to view');
}

// Helper: Check if any filter is currently applied
function isFilterApplied() {
    const nomorMaterial = document.getElementById('searchNomorMaterial')?.value.trim() || '';
    const flavor = document.getElementById('searchFlavor')?.value.trim() || '';
    const negara = document.getElementById('searchNegara')?.value.trim() || '';
    const distributor = document.getElementById('searchDistributor')?.value.trim() || '';
    const date = document.getElementById('searchDate')?.value || '';
    const validationStatus = document.getElementById('searchValidation')?.value || '';
    
    return !!(nomorMaterial || flavor || negara || distributor || date || validationStatus);
}

// ✅ NEW FUNCTION: Display all records as card list on main page
function renderAllRecordsAsCardList() {
    const grid = document.getElementById('recordsGrid');
    const emptyState = document.getElementById('emptyState');
    
    // Use filteredRecords if filter has been applied, otherwise use allRecords
    let recordsToDisplay = filteredRecords.length > 0 || isFilterApplied() ? filteredRecords : allRecords;
    
    // Check if user is Viewer only (can view but cannot edit or validate)
    const userCanEdit = canEdit();
    const userCanValidate = canValidate();
    const isViewerOnly = !userCanEdit && !userCanValidate && canView();
    
    // For Viewer-only users, filter to show only validated records
    if (isViewerOnly) {
        recordsToDisplay = recordsToDisplay.filter(record => record.validationStatus === 'valid');
        console.log(`👁️ Viewer only mode: Showing ${recordsToDisplay.length} validated records`);
    }
    
    if (!recordsToDisplay || recordsToDisplay.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        hidePagination();
        return;
    }
    
    // Show records as card list
    emptyState.classList.add('hidden');
    
    // Reset to first page when filter changes
    if (filteredRecords.length > 0 && isFilterApplied()) {
        currentPage = 1;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(recordsToDisplay.length / recordsPerPage);
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const paginatedRecords = recordsToDisplay.slice(startIndex, endIndex);
    
    // Render paginated records
    grid.innerHTML = paginatedRecords.map(record => {
        // Determine validation status with emoji and inline styles
        let validationLabel = 'NOT VALIDATED';
        let validationEmoji = '🟡';
        let badgeStyle = 'background-color: rgba(234, 179, 8, 0.2); color: #b45309; border: 1px solid rgba(234, 179, 8, 0.4);';
        
        if (record.validationStatus === 'valid') {
            validationLabel = 'VALIDATED';
            validationEmoji = '🟢';
            badgeStyle = 'background-color: rgba(34, 197, 94, 0.2); color: #16a34a; border: 1px solid rgba(34, 197, 94, 0.4);';
        } else if (record.validationStatus === 'invalid') {
            validationLabel = 'INVALID';
            validationEmoji = '🔴';
            badgeStyle = 'background-color: rgba(239, 68, 68, 0.2); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.4);';
        }
        
        return `
            <div class="search-result-item">
                <!-- Row 1: Flavor + Actions -->
                <div class="search-result-row-1">
                    <div class="search-result-flavor-wrapper">
                        <span class="search-result-flavor">${escapeHtml(record.flavor)}</span>
                        <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 10px; font-size: 0.65rem; font-weight: 600; margin-left: 8px; white-space: nowrap; ${badgeStyle}">
                            ${validationEmoji} ${validationLabel}
                        </span>
                    </div>
                    <div class="search-result-actions">
                        <button class="btn-action view" onclick="openPreview('${record.id}')" title="Lihat">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${userCanEdit ? `
                        <button class="btn-action edit" onclick="editRecord('${record.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action delete" onclick="deleteRecord('${record.id}')" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn-action info" onclick="showValidationInfo('${record.id}')" title="Info">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Row 2: Distributor + Meta Info -->
                <div class="search-result-row-2">
                    <div class="search-result-distributor">
                        ${escapeHtml(record.distributor || '-')}
                    </div>
                    <span class="search-result-meta">${escapeHtml(record.negara)} • ${formatDate(record.updatedAt || record.tanggal)}</span>
                </div>
            </div>
        `;
    }).join('');
    
    // Display pagination controls
    renderPagination(totalPages, recordsToDisplay.length);
    
    console.log(`🎨 Displayed ${paginatedRecords.length} dari ${recordsToDisplay.length} records (Halaman ${currentPage}/${totalPages})`);
}

// ==================== PAGINATION FUNCTIONS ====================

// ==================== RECORDS INPUT FUNCTIONS ====================

// Mapping kolom foto ke folder Google Drive
const PHOTO_FOLDER_MAP = {
    photo_bumbu: 'Bumbu',
    photo_mbumbu: 'Minyak Bumbu',
    photo_si: 'Kode SI',
    photo_karton: 'Kode Karton',
    photo_etiket: 'Kode Etiket',
    photo_etiketbanded: 'Five or Six in One',
    photo_plakban: 'Plakban'
};

/**
 * Fungsi 1: Input manual dari Google Drive & Google Sheet
 * Mengambil data dari Google Sheet dan menggabungkan link foto dari Google Drive berdasarkan nama file (flavor)
 * @param {Array} sheetRecords - Data dari Google Sheet
 * @param {Object} driveFilesByFolder - { folderName: [ {name, id, webViewLink, ...}, ... ] }
 * @returns {Array} records dengan url foto terisi
 */
async function importRecordsManualFromSheetAndDrive(sheetRecords, driveFilesByFolder) {
    return sheetRecords.map(record => {
        // Untuk setiap kolom foto, cari file di folder yang sesuai
        Object.keys(PHOTO_FOLDER_MAP).forEach(photoKey => {
            const folderName = PHOTO_FOLDER_MAP[photoKey];
            const fileName = record[photoKey];
            if (fileName && driveFilesByFolder[folderName]) {
                // Cari file di folder dengan nama persis (case-insensitive)
                const file = driveFilesByFolder[folderName].find(f => f.name.toLowerCase() === fileName.toLowerCase());
                if (file) {
                    record[photoKey + '_url'] = file.webViewLink || file.webContentLink || '';
                } else {
                    record[photoKey + '_url'] = '';
                }
            } else {
                record[photoKey + '_url'] = '';
            }
        });
        return record;
    });
}

/**
 * Fungsi 2: Input melalui App
 * Upload foto ke Google Drive di folder sesuai mapping, nama file = flavor
 * @param {Object} record - Data record (flavor, dll)
 * @param {Object} photoFiles - { photo_bumbu: File, photo_mbumbu: File, ... }
 * @param {Function} uploadToDrive - fungsi async(folderName, file, fileName) => {id, name, webViewLink}
 * @returns {Object} record dengan info foto terisi
 */
async function inputRecordFromApp(record, photoFiles, uploadToDrive) {
    for (const photoKey of Object.keys(PHOTO_FOLDER_MAP)) {
        const folderName = PHOTO_FOLDER_MAP[photoKey];
        const file = photoFiles[photoKey];
        if (file) {
            // Nama file = flavor + ekstensi asli
            const ext = file.name.split('.').pop();
            const fileName = record.flavor + (ext ? ('.' + ext) : '');
            const uploaded = await uploadToDrive(folderName, file, fileName);
            record[photoKey] = uploaded.name;
            record[photoKey + '_url'] = uploaded.webViewLink || uploaded.webContentLink || '';
        }
    }
    return record;
}
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
    // No longer needed since Negara is now a text input
    // Keeping empty function for compatibility
    console.log('Search filters initialized (text inputs)');
}

function toggleAdvancedSearch() {
    const panel = document.getElementById('advancedSearchPanel');
    panel.classList.toggle('hidden');
    
    // Hide search results when closing panel - show all records instead
    if (panel.classList.contains('hidden')) {
        const searchResultsList = document.getElementById('searchResultsList');
        if (searchResultsList) {
            searchResultsList.classList.add('hidden');
        }
        // Show all records again
        renderAllRecordsAsCardList();
    }
}

// ==================== SEARCH FUNCTIONS ====================
// Autocomplete removed - simple text matching now used instead

// ==================== SEARCH FUNCTIONS ====================

async function applySearch() {
    // Data should already be loaded
    if (allRecords.length === 0) {
        showToast('⚠️ Data belum dimuat. Refresh halaman.', 'warning');
        return;
    }

    const nomorMaterial = document.getElementById('searchNomorMaterial').value.trim();
    const flavor = document.getElementById('searchFlavor').value.toLowerCase().trim();
    const negara = document.getElementById('searchNegara').value.toLowerCase().trim();
    const distributor = document.getElementById('searchDistributor').value.toLowerCase().trim();
    const date = document.getElementById('searchDate').value;
    const validationStatus = document.getElementById('searchValidation').value;

    console.log('🔍 applySearch: Filtering records with criteria:', {
        nomorMaterial, flavor, negara, distributor, date, validationStatus
    });

    filteredRecords = allRecords.filter(record => {
        let match = true;

        if (nomorMaterial && record.nomorMaterial !== nomorMaterial) {
            match = false;
        }

        if (flavor && !record.flavor.toLowerCase().includes(flavor)) {
            match = false;
        }

        if (negara && !record.negara.toLowerCase().includes(negara)) {
            match = false;
        }

        if (distributor && (!record.distributor || !record.distributor.toLowerCase().includes(distributor))) {
            match = false;
        }

        if (date && record.tanggal !== date) {
            match = false;
        }

        // Filter by validation status
        if (validationStatus) {
            // Normalize validation status from Google Sheets (can be 'valid', 'invalid', or empty)
            const recordStatus = record.validationStatus ? record.validationStatus.toLowerCase().trim() : 'pending';
            
            if (validationStatus === 'valid' && recordStatus !== 'valid') {
                match = false;
            } else if (validationStatus === 'invalid' && recordStatus !== 'invalid') {
                match = false;
            } else if (validationStatus === 'pending' && recordStatus !== 'pending' && recordStatus !== '') {
                match = false;
            }
        }

        return match;
    });

    currentPage = 1;
    
    // ✅ Display filtered results directly as card list
    renderAllRecordsAsCardList();
    
    showToast(`✅ Ditemukan ${filteredRecords.length} hasil`, 'success');
}

// Render search results as list view inside Advanced Search panel
function renderSearchResultsList(records) {
    const searchResultsList = document.getElementById('searchResultsList');
    const searchResultsContainer = document.getElementById('searchResultsContainer');
    const searchResultsCount = document.getElementById('searchResultsCount');
    
    if (!searchResultsList || !searchResultsContainer) return;
    
    // Show the results section
    searchResultsList.classList.remove('hidden');
    searchResultsCount.textContent = records.length;
    
    if (records.length === 0) {
        searchResultsContainer.innerHTML = `
            <div class="empty-search-results" style="text-align: center; padding: 20px; color: var(--gray-600);">
                <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                <p>Tidak ada data yang cocok dengan pencarian</p>
            </div>
        `;
        return;
    }
    
    const userCanEdit = canEdit();
    const userCanValidate = canValidate();
    
    searchResultsContainer.innerHTML = records.map(record => {
        // Determine validation status indicator
        let validationClass = 'pending';
        if (record.validationStatus === 'valid') {
            validationClass = 'valid';
        } else if (record.validationStatus === 'invalid') {
            validationClass = 'invalid';
        }
        
        return `
            <div class="search-result-item">
                <!-- Row 1: Flavor + Actions -->
                <div class="search-result-row-1">
                    <div class="search-result-flavor-wrapper">
                        <span class="validation-indicator ${validationClass}" title="${validationClass === 'valid' ? 'Valid' : validationClass === 'invalid' ? 'Invalid' : 'Belum Validasi'}"></span>
                        <span class="search-result-flavor">${escapeHtml(record.flavor)}</span>
                    </div>
                    <div class="search-result-actions">
                        <button class="btn-action view" onclick="openPreview('${record.id}')" title="Lihat">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${userCanEdit ? `
                        <button class="btn-action edit" onclick="editRecord('${record.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action delete" onclick="deleteRecord('${record.id}')" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn-action info" onclick="showValidationInfo('${record.id}')" title="Info">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Row 2: Distributor + Meta Info -->
                <div class="search-result-row-2">
                    <div class="search-result-distributor">
                        ${escapeHtml(record.distributor || '-')}
                    </div>
                    <span class="search-result-meta">${escapeHtml(record.negara)} • ${formatDate(record.updatedAt || record.tanggal)}</span>
                </div>
            </div>
        `;
    }).join('');
}

function resetSearch() {
    document.getElementById('searchNomorMaterial').value = '';
    document.getElementById('searchFlavor').value = '';
    document.getElementById('searchNegara').value = '';
    document.getElementById('searchDistributor').value = '';
    document.getElementById('searchDate').value = '';
    document.getElementById('searchValidation').value = '';

    // Reset to all records
    filteredRecords = [...allRecords];
    currentPage = 1;
    
    // Display all records again
    renderAllRecordsAsCardList();
    
    showToast('Filter direset - menampilkan semua records', 'info');
}

// ==================== ADD DATA POPUP ====================

function openAddDataPopup() {
    // Only users with editor permission can add data
    if (!canEdit()) {
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
// OPTIMIZED: Use already loaded allRecords instead of fetching again
async function checkDuplicateFlavorNegara(flavor, negara) {
    try {
        // Use already loaded records (allRecords is loaded on page init)
        const existingRecords = allRecords.length > 0 ? allRecords : await storage.getRecordsBasic();
        
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

// Check for duplicate Nomor Material
// OPTIMIZED: Use already loaded allRecords instead of fetching again
async function checkDuplicateNomorMaterial(nomorMaterial) {
    try {
        // Use already loaded records (allRecords is loaded on page init)
        const existingRecords = allRecords.length > 0 ? allRecords : await storage.getRecordsBasic();
        
        if (!existingRecords || existingRecords.length === 0) {
            return { isDuplicate: false };
        }
        
        // Find duplicate (same nomor material)
        const duplicate = existingRecords.find(record => {
            return record.nomorMaterial && 
                String(record.nomorMaterial).trim() === String(nomorMaterial).trim();
        });
        
        if (duplicate) {
            return {
                isDuplicate: true,
                existingRecord: duplicate,
                message: `Nomor Material "${nomorMaterial}" sudah ada!\n\nFlavor: ${duplicate.flavor || '-'}\nNegara: ${duplicate.negara || '-'}\nData dibuat oleh: ${duplicate.createdBy || 'Unknown'}\nTanggal: ${duplicate.tanggal || duplicate.createdAt}\n\nSilakan gunakan Nomor Material yang berbeda.`
            };
        }
        
        return { isDuplicate: false };
    } catch (error) {
        console.error('Error checking duplicate nomor material:', error);
        return { isDuplicate: false };
    }
}

async function proceedToCreateDisplay() {
    const tanggal = document.getElementById('inputTanggal').value;
    const nomorMaterial = document.getElementById('inputNomorMaterial').value.trim();
    const flavor = document.getElementById('inputFlavor').value.trim();
    const negara = document.getElementById('inputNegara').value.trim();
    const distributor = document.getElementById('inputDistributor').value.trim();

    if (!tanggal || !nomorMaterial || !flavor || !negara) {
        showToast('Mohon lengkapi semua field', 'error');
        return;
    }

    // Validate nomorMaterial contains only digits
    if (!/^\d+$/.test(nomorMaterial)) {
        showToast('Nomor Material harus berupa angka', 'error');
        return;
    }

    // FAST duplicate check using already loaded data
    // No loading spinner needed - this is instant!
    console.log('🔍 Checking duplicates using cached data...');
    
    const nomorMaterialCheck = await checkDuplicateNomorMaterial(nomorMaterial);
    
    if (nomorMaterialCheck.isDuplicate) {
        alert('⚠️ NOMOR MATERIAL DUPLIKAT!\n\n' + nomorMaterialCheck.message);
        showToast('Nomor Material sudah ada', 'error');
        return;
    }

    // Check for duplicate Flavor + Negara
    const duplicateCheck = await checkDuplicateFlavorNegara(flavor, negara);
    
    if (duplicateCheck.isDuplicate) {
        alert('⚠️ DATA DUPLIKAT!\n\n' + duplicateCheck.message);
        showToast('Kombinasi Flavor dan Negara sudah ada', 'error');
        return;
    }

    // Save to temp data
    const tempData = {
        id: storage.generateId(),
        tanggal: tanggal,
        nomorMaterial: nomorMaterial,
        flavor: flavor,
        negara: negara,
        distributor: distributor,
        createdAt: new Date().toISOString(),
        photos: {},
        kodeProduksi: []
    };

    console.log('📦 Saving temp data:', tempData);
    storage.saveTempData(tempData);
    console.log('✅ Temp data saved, navigating to create-display.html');

    // Navigate to create display page
    window.location.href = 'create-display.html';
}

// ==================== PREVIEW POPUP ====================

async function openPreview(recordId) {
    console.log('🔍 Opening preview for:', recordId);
    
    // Find basic record from already loaded data (for title/info)
    let basicRecord = allRecords.find(r => String(r.id) === String(recordId));
    if (!basicRecord) {
        basicRecord = filteredRecords.find(r => String(r.id) === String(recordId));
    }
    
    if (!basicRecord) {
        showToast('Record tidak ditemukan', 'error');
        return;
    }
    
    // Set basic info first (from fast-loaded data)
    currentPreviewRecord = { ...basicRecord };
    
    const popup = document.getElementById('previewPopup');
    const title = document.getElementById('previewTitle');
    title.innerHTML = `<i class="fas fa-images"></i> ${escapeHtml(currentPreviewRecord.flavor)}`;
    
    // Show popup with loading state
    popup.classList.remove('hidden');
    
    // Hide tabs during loading (will be shown dynamically after data loads)
    const tabsContainer = document.querySelector('.preview-tabs');
    if (tabsContainer) tabsContainer.style.display = 'none';
    
    // Show loading in preview content
    const previewContent = document.getElementById('previewContent');
    previewContent.innerHTML = `
        <div class="loading-preview">
            <i class="fas fa-spinner fa-spin fa-3x"></i>
            <p>Memuat foto...</p>
        </div>
    `;
    
    // Show record info (negara, nomor material) - this works with basic data
    renderPreviewRecordInfo();
    
    // Show kode produksi - this works with basic data
    renderKodeProduksi();
    
    // 🚀 LAZY LOAD: Fetch full record with processed photos from Google Sheets
    try {
        console.log('📷 Fetching full record with photos for:', recordId);
        const fullRecord = await sheetsDB.getRecordById(recordId);
        
        if (fullRecord) {
            console.log('✅ Full record loaded:', fullRecord);
            // Update currentPreviewRecord with full photo data
            currentPreviewRecord = fullRecord;
            
            // Ensure photos object exists
            if (typeof currentPreviewRecord.photos !== 'object') {
                currentPreviewRecord.photos = {};
            }
            
            // 🔥 Dynamic tabs: hide tabs with no data, show only tabs with data
            updatePreviewTabs(currentPreviewRecord.photos);
            
            // Render validation section in preview
            renderValidationInPreview();
            
        } else {
            console.warn('⚠️ Could not fetch full record, using basic data');
            // Hide all tabs when no data
            hideAllPreviewTabs();
            previewContent.innerHTML = `
                <div class="no-image">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Gagal memuat foto dari server</p>
                    <small>Record: ${escapeHtml(basicRecord.flavor)}</small>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Error fetching full record:', error);
        previewContent.innerHTML = `
            <div class="no-image">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error memuat foto</p>
                <small>${escapeHtml(error.message)}</small>
            </div>
        `;
    }
}

function renderValidationInPreview() {
    // Only show validation section for users with permission
    const validationSection = document.getElementById('previewValidationSection');
    
    if (!canValidate()) {
        // Hide validation section for users without permission
        validationSection.classList.add('hidden');
        return;
    }
    
    // Show validation section for authorized users
    validationSection.classList.remove('hidden');
    
    // Store current record ID for validation
    const recordId = currentPreviewRecord?.id;
    if (!recordId) return;
    
    document.getElementById('previewValidationRecordId').value = recordId;
    
    // Reset selection
    document.querySelectorAll('[name="previewValidationStatus"]').forEach(radio => {
        radio.checked = false;
    });
    document.querySelectorAll('.preview-validation-section .validation-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    document.getElementById('previewInvalidReasonContainer').style.display = 'none';
    document.getElementById('previewInvalidReason').value = '';
    
    // Pre-select if already validated
    if (currentPreviewRecord.validationStatus) {
        selectValidationInPreview(currentPreviewRecord.validationStatus);
        if (currentPreviewRecord.validationStatus === 'invalid' && currentPreviewRecord.validationReason) {
            document.getElementById('previewInvalidReason').value = currentPreviewRecord.validationReason;
        }
    }
    
    // ALWAYS show metadata section (tidak peduli status validasi)
    // Tanggal dan email hanya tampil saat ada validasi, 
    // tapi checklist selalu tampil dari column X
    showValidationMetadata();
}

function showValidationMetadata() {
    const metadataSection = document.getElementById('previewValidationMetadata');
    const record = currentPreviewRecord;
    
    // ALWAYS show metadata section
    metadataSection.classList.remove('hidden');
    
    // Show tanggal dan email hanya jika ada validasi
    const metadataInfo = document.getElementById('previewValidationMetadataInfo');
    if (record.validatedAt && record.validatedBy) {
        // Format date
        const validatedDate = new Date(record.validatedAt);
        const formattedDate = validatedDate.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        document.getElementById('previewValidationDate').textContent = formattedDate;
        document.getElementById('previewValidatedBy').textContent = record.validatedBy;
        metadataInfo.style.display = 'block';
    } else {
        // Hide tanggal dan email jika belum ada validasi
        metadataInfo.style.display = 'none';
    }
    
    // Render validation changes checklist (ALWAYS show)
    renderValidationChanges();
}

function renderValidationChanges() {
    const changesList = document.getElementById('previewValidationChanges');
    const record = currentPreviewRecord;
    
    // Element mapping dari create-display.html
    const validationElements = [
        { label: 'Bumbu' },
        { label: 'M. Bumbu' },
        { label: 'Karton Depan' },
        { label: 'Karton Belakang' },
        { label: 'Etiket' },
        { label: 'Etiket Banded' }
    ];
    
    // Clear previous content
    changesList.innerHTML = '';
    
    // Get updatedFields dari column X (dari create-display checklist)
    const updatedFields = record.updatedFields || [];
    
    // Render each element
    validationElements.forEach(element => {
        // Check if this element is in updatedFields array
        const isChecked = updatedFields.includes(element.label);
        const changeItem = document.createElement('div');
        changeItem.className = `change-item ${isChecked ? 'checked' : 'unchecked'}`;
        
        const icon = document.createElement('i');
        icon.className = isChecked ? 'fas fa-check-circle' : 'fas fa-circle';
        
        const text = document.createElement('span');
        text.className = 'change-item-text';
        text.textContent = element.label;
        
        changeItem.appendChild(icon);
        changeItem.appendChild(text);
        changesList.appendChild(changeItem);
    });
}

function selectValidationInPreview(status) {
    // Update radio buttons
    document.querySelectorAll('[name="previewValidationStatus"]').forEach(radio => {
        radio.checked = radio.value === status;
    });
    
    // Update visual selection
    document.querySelectorAll('.preview-validation-section .validation-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    const selectedOption = document.querySelector(`.preview-validation-section .${status}-option`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    // Show/hide invalid reason textarea
    const invalidReasonContainer = document.getElementById('previewInvalidReasonContainer');
    if (status === 'invalid') {
        invalidReasonContainer.style.display = 'block';
    } else {
        invalidReasonContainer.style.display = 'none';
    }
}

async function submitValidationFromPreview() {
    const recordId = document.getElementById('previewValidationRecordId').value;
    const status = document.querySelector('[name="previewValidationStatus"]:checked')?.value;
    const reason = document.getElementById('previewInvalidReason').value.trim();
    
    if (!status) {
        showToast('Pilih status validasi', 'error');
        return;
    }
    
    if (status === 'invalid' && !reason) {
        showToast('Jelaskan alasan data invalid', 'error');
        return;
    }
    
    showLoading('💾 Menyimpan validasi...');
    
    try {
        // Get validated elements from existing updatedFields or collect from photos
        let validatedElements = currentPreviewRecord.updatedFields || [];
        
        // If updatedFields is empty, collect from photos
        if (!validatedElements || validatedElements.length === 0) {
            validatedElements = [];
            const photos = currentPreviewRecord.photos || {};
            
            const photoMapping = [
                { key: 'photo_bumbu', label: 'Bumbu' },
                { key: 'photo_mbumbu', label: 'M. Bumbu' },
                { key: 'photo_kartonDepan', label: 'Karton Depan' },
                { key: 'photo_kartonBelakang', label: 'Karton Belakang' },
                { key: 'photo_etiket', label: 'Etiket' },
                { key: 'photo_etiketbanded', label: 'Etiket Banded' }
            ];
            
            photoMapping.forEach(mapping => {
                if (photos[mapping.key] && photos[mapping.key].trim() !== '') {
                    validatedElements.push(mapping.label);
                }
            });
        }
        
        const validationData = {
            id: recordId,
            validationStatus: status,
            validatedBy: auth.getUser().email,
            validatedAt: new Date().toISOString(),
            validationReason: status === 'invalid' ? reason : '',
            updatedFields: validatedElements  // Keep the checklist from create-display
        };
        
        console.log('📝 Submitting validation from preview:', validationData);
        
        // Update in storage
        await storage.updateRecord(recordId, validationData);
        console.log('✅ Storage updated successfully');
        
        // Always update currentPreviewRecord to reflect changes
        if (currentPreviewRecord) {
            currentPreviewRecord.validationStatus = status;
            currentPreviewRecord.validatedBy = validationData.validatedBy;
            currentPreviewRecord.validatedAt = validationData.validatedAt;
            currentPreviewRecord.validationReason = validationData.validationReason;
            currentPreviewRecord.updatedFields = validationData.updatedFields;
        }
        
        // Update in allRecords array (with string comparison for ID)
        const recordIndex = allRecords.findIndex(r => String(r.id) === String(recordId));
        if (recordIndex !== -1) {
            allRecords[recordIndex] = { ...allRecords[recordIndex], ...validationData };
            console.log('✅ Updated allRecords at index:', recordIndex);
        }
        
        hideLoading();
        showToast(`✅ Record berhasil di-${status === 'valid' ? 'validasi' : 'invalid'}kan`, 'success');
        
        // Re-render the records list to update validation status
        renderAllRecordsAsCardList();
        
        // Close validation section or update display
        setTimeout(() => {
            closePreviewPopup();
        }, 1000);
        
    } catch (error) {
        hideLoading();
        console.error('❌ Error submitting validation:', error);
        showToast(`❌ Error: ${error.message}`, 'error');
    }
}

function closePreviewPopup() {
    const popup = document.getElementById('previewPopup');
    popup.classList.add('hidden');
    currentPreviewRecord = null;
    
    // Reset all tabs to visible for next open
    const tabsContainer = document.querySelector('.preview-tabs');
    if (tabsContainer) tabsContainer.style.display = '';
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.style.display = '';
        btn.classList.remove('hidden');
    });
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

// Helper: Check if photo data has actual content (not null/empty)
function hasPhotoData(photoValue) {
    if (!photoValue) return false;
    if (typeof photoValue === 'string' && photoValue.trim() === '') return false;
    if (typeof photoValue === 'object') {
        // Object with at least a name or valid id means there's data in the sheet
        if (photoValue.name && photoValue.name.trim() !== '') return true;
        if (photoValue.id && photoValue.id !== null) return true;
        return false;
    }
    return true; // non-empty string
}

// 🔥 Dynamic tabs: show/hide tabs based on photo data availability
function updatePreviewTabs(photos) {
    const allTabs = document.querySelectorAll('.tab-btn');
    const previewContent = document.getElementById('previewContent');
    let firstVisibleTab = null;
    let visibleCount = 0;
    
    allTabs.forEach(btn => {
        const tabId = btn.getAttribute('data-tab');
        let photoData = photos[tabId];
        
        // Fallback for old 'karton' data
        if (!photoData && tabId === 'karton-depan' && photos['karton']) {
            photoData = photos['karton'];
        }
        
        if (hasPhotoData(photoData)) {
            btn.style.display = '';  // Show tab
            btn.classList.remove('hidden');
            visibleCount++;
            if (!firstVisibleTab) firstVisibleTab = tabId;
        } else {
            btn.style.display = 'none';  // Hide tab
            btn.classList.add('hidden');
            btn.classList.remove('active');
        }
    });
    
    console.log(`📷 Preview tabs: ${visibleCount} of ${allTabs.length} tabs have data`);
    
    if (visibleCount === 0) {
        // No photos at all - show message
        previewContent.innerHTML = `
            <div class="no-image">
                <i class="fas fa-cloud-upload-alt" style="font-size: 48px; color: #ccc;"></i>
                <p style="margin-top: 15px; color: #666;">Belum ada foto yang diupload untuk record ini</p>
            </div>
        `;
        // Hide the tabs container
        const tabsContainer = document.querySelector('.preview-tabs');
        if (tabsContainer) tabsContainer.style.display = 'none';
    } else {
        // Show tabs container
        const tabsContainer = document.querySelector('.preview-tabs');
        if (tabsContainer) tabsContainer.style.display = '';
        
        // Auto-select first visible tab
        allTabs.forEach(b => b.classList.remove('active'));
        const firstBtn = document.querySelector(`.tab-btn[data-tab="${firstVisibleTab}"]`);
        if (firstBtn) firstBtn.classList.add('active');
        showPreviewTab(firstVisibleTab);
    }
}

// Hide all tabs (used on error)
function hideAllPreviewTabs() {
    const tabsContainer = document.querySelector('.preview-tabs');
    if (tabsContainer) tabsContainer.style.display = 'none';
}

function showPreviewTab(tabId) {
    const previewContent = document.getElementById('previewContent');
    
    if (!currentPreviewRecord || !currentPreviewRecord.photos) {
        previewContent.innerHTML = `
            <div class="no-image">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Foto belum diupload</p>
            </div>
        `;
        return;
    }

    // Backward compatibility: map old 'karton' to new keys
    // If looking for karton-depan but data only has 'karton', use that
    let photo = currentPreviewRecord.photos[tabId];
    
    // Fallback for old 'karton' data when viewing new karton-depan/karton-belakang tabs
    if (!photo && tabId === 'karton-depan' && currentPreviewRecord.photos['karton']) {
        photo = currentPreviewRecord.photos['karton'];
        console.log('📷 Fallback: using old "karton" data for karton-depan');
    }
    // karton-belakang has no fallback from old data (it was single karton field before)
    
    console.log('📷 Preview tab:', tabId);
    console.log('📷 Photo data:', photo);

    // Helper: Get label text for tab
    const getTabLabel = (tab) => {
        const labels = {
            'bumbu': 'Bumbu',
            'm-bumbu': 'M. Bumbu',
            'si': 'SI',
            'karton-depan': 'Karton Depan',
            'karton-belakang': 'Karton Belakang',
            'etiket': 'Etiket',
            'etiket-banded': 'Etiket Banded',
            'plakban': 'Plakban'
        };
        return labels[tab] || tab;
    };

    // Helper: Get photo name from photo object or string
    const getPhotoName = (photoData) => {
        if (!photoData) return '';
        if (typeof photoData === 'string') return photoData;
        if (typeof photoData === 'object' && photoData.name) {
            // Remove extension if present
            return photoData.name.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
        }
        return '';
    };

    // Helper: cek apakah id adalah ID Google Drive valid (bukan nama file)
    // ID Google Drive biasanya panjang ~33 karakter dan tidak mengandung spasi atau ekstensi file
    const isValidDriveId = (id) => {
        if (!id || typeof id !== 'string') return false;
        // Jika ada spasi, titik (ekstensi), atau terlalu pendek, kemungkinan nama file
        if (id.includes(' ') || id.includes('.') || id.length < 20) return false;
        return true;
    };

    const tabLabel = getTabLabel(tabId);
    const photoName = getPhotoName(photo);

    // HTML template for photo caption
    const captionHtml = photoName ? `
        <div class="photo-caption">
            <strong>${escapeHtml(tabLabel)}:</strong> <span>${escapeHtml(photoName)}</span>
        </div>
    ` : '';

    if (photo && typeof photo === 'object') {
        if (photo.id && isValidDriveId(photo.id)) {
            // Use Google Drive thumbnail URL format (more reliable for display)
            const imgSrc = `https://lh3.googleusercontent.com/d/${photo.id}`;
            console.log('📷 Image source:', imgSrc);
            previewContent.innerHTML = `
                <img src="${imgSrc}" alt="${tabId}"
                     onerror="this.onerror=null; this.src='${photo.directLink || ''}'; if(!this.src) this.parentElement.innerHTML='<div class=\\'no-image\\'><i class=\\'fas fa-exclamation-triangle\\'></i><p>Gagal memuat gambar</p></div>';">
                ${captionHtml}
            `;
        } else if (photo.base64) {
            // Fallback to base64 if available
            previewContent.innerHTML = `
                <img src="${photo.base64}" alt="${tabId}">
                ${captionHtml}
            `;
        } else if (photo.directLink && isValidDriveId(photo.directLink.split('/d/')[1])) {
            previewContent.innerHTML = `
                <img src="${photo.directLink}" alt="${tabId}">
                ${captionHtml}
            `;
        } else if (photo.id || photo.name) {
            // Jika id/name adalah nama file (bukan ID Google Drive valid)
            // Artinya nama file ada di sheet tapi belum diupload ke Drive
            const fileName = photo.name || photo.id || '';
            previewContent.innerHTML = `
                <div class="no-image">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Foto belum diupload</p>
                    <small style="color: #999; margin-top: 5px; display: block;">File: ${escapeHtml(fileName)}</small>
                </div>
                ${captionHtml}
            `;
        } else {
            previewContent.innerHTML = `
                <div class="no-image">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Foto belum diupload</p>
                </div>
            `;
        }
    } else if (typeof photo === 'string' && photo.length > 0) {
        // Jika hanya nama file (input manual), belum diupload ke Drive
        previewContent.innerHTML = `
            <div class="no-image">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Foto belum diupload</p>
                <small style="color: #999; margin-top: 5px; display: block;">File: ${escapeHtml(photo)}</small>
            </div>
            <div class="photo-caption">
                <strong>${escapeHtml(tabLabel)}:</strong> <span>${escapeHtml(photo)}</span>
            </div>
        `;
    } else {
        previewContent.innerHTML = `
            <div class="no-image">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Foto belum diupload</p>
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

function renderPreviewRecordInfo() {
    const container = document.getElementById('previewRecordInfo');
    
    if (!currentPreviewRecord) {
        container.innerHTML = '';
        return;
    }

    let html = '<div class="record-info-grid">';
    
    if (currentPreviewRecord.negara) {
        html += `<span><i class="fas fa-globe"></i> <strong>Negara:</strong> ${escapeHtml(currentPreviewRecord.negara)}</span>`;
    }
    
    if (currentPreviewRecord.distributor) {
        html += `<span><i class="fas fa-truck"></i> <strong>Distributor:</strong> ${escapeHtml(currentPreviewRecord.distributor)}</span>`;
    }
    
    if (currentPreviewRecord.nomorMaterial) {
        html += `<span><i class="fas fa-barcode"></i> <strong>Nomor Material:</strong> ${escapeHtml(currentPreviewRecord.nomorMaterial)}</span>`;
    }
    
    if (currentPreviewRecord.tanggal) {
        html += `<span><i class="fas fa-calendar-alt"></i> <strong>Tanggal:</strong> ${formatDate(currentPreviewRecord.tanggal)}</span>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
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
        // Delete from storage (Google Sheets + local) - DO NOT delete photos from Drive
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

// Show validation info popup (for Editor only)
function showValidationInfo(recordId) {
    // Use string comparison for ID matching
    const record = allRecords.find(r => String(r.id) === String(recordId));
    if (!record) {
        showToast('Record tidak ditemukan', 'error');
        return;
    }
    
    let statusText = '';
    let statusClass = '';
    let statusIcon = '';
    
    if (record.validationStatus === 'valid') {
        statusText = 'Valid';
        statusClass = 'valid';
        statusIcon = 'fa-check-circle';
    } else if (record.validationStatus === 'invalid') {
        statusText = 'Invalid';
        statusClass = 'invalid';
        statusIcon = 'fa-times-circle';
    } else {
        statusText = 'Belum Divalidasi';
        statusClass = 'pending';
        statusIcon = 'fa-clock';
    }
    
    let infoHtml = `
        <div class="validation-info-popup">
            <div class="validation-status ${statusClass}">
                <i class="fas ${statusIcon}"></i> ${statusText}
            </div>
    `;
    
    if (record.validatedBy) {
        infoHtml += `<div class="validation-detail"><i class="fas fa-user"></i> Divalidasi oleh: <strong>${escapeHtml(record.validatedBy)}</strong></div>`;
    }
    
    if (record.validatedAt) {
        infoHtml += `<div class="validation-detail"><i class="fas fa-calendar-check"></i> Tanggal validasi: ${formatDateTime(record.validatedAt)}</div>`;
    }
    
    if (record.validationStatus === 'invalid' && record.validationReason) {
        infoHtml += `<div class="validation-detail reason"><i class="fas fa-exclamation-triangle"></i> Alasan: <strong>${escapeHtml(record.validationReason)}</strong></div>`;
    }
    
    infoHtml += '</div>';
    
    // Show in modal or alert
    showValidationInfoModal(record.flavor, infoHtml);
}

function showValidationInfoModal(title, content) {
    // Create modal if not exists
    let modal = document.getElementById('validationInfoModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'validationInfoModal';
        modal.className = 'popup-overlay hidden';
        modal.innerHTML = `
            <div class="popup-content validation-info-modal">
                <div class="popup-header">
                    <h2 id="validationInfoTitle"><i class="fas fa-info-circle"></i> Info Validasi</h2>
                    <button class="btn-close" onclick="closeValidationInfoModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="popup-body" id="validationInfoContent">
                </div>
                <div class="popup-footer">
                    <button class="btn-secondary" onclick="closeValidationInfoModal()">Tutup</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('validationInfoTitle').innerHTML = `<i class="fas fa-info-circle"></i> Info Validasi - ${escapeHtml(title)}`;
    document.getElementById('validationInfoContent').innerHTML = content;
    modal.classList.remove('hidden');
}

function closeValidationInfoModal() {
    const modal = document.getElementById('validationInfoModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function openValidationPopup(recordId) {
    console.log('🔍 openValidationPopup called with recordId:', recordId);
    
    if (!canValidate()) {
        showToast('Anda tidak memiliki akses untuk validasi', 'error');
        return;
    }
    
    // Convert to string for comparison (ID might be number or string)
    const record = allRecords.find(r => String(r.id) === String(recordId));
    if (!record) {
        console.error('❌ Record not found in allRecords. recordId:', recordId, 'allRecords IDs:', allRecords.map(r => r.id));
        showToast('Record tidak ditemukan', 'error');
        return;
    }
    
    console.log('✅ Found record:', record.flavor);
    
    currentValidationRecordId = recordId;
    
    // Build updated fields display
    let updatedFieldsHtml = '';
    if (record.updatedFields && Array.isArray(record.updatedFields) && record.updatedFields.length > 0) {
        updatedFieldsHtml = `
            <div style="margin-top: 10px; padding: 10px; background: #e8f5e9; border-radius: 8px; font-size: 12px;">
                <strong><i class="fas fa-clipboard-check"></i> Data yang diupdate:</strong><br>
                <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px;">
                    ${record.updatedFields.map(field => `<span style="background: #4caf50; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;"><i class="fas fa-check"></i> ${escapeHtml(field)}</span>`).join('')}
                </div>
            </div>
        `;
    }
    
    // Set record info
    document.getElementById('validationRecordInfo').innerHTML = `
        <strong>${escapeHtml(record.flavor)}</strong> - ${escapeHtml(record.negara)}<br>
        <small>Tanggal Update: ${formatDate(record.updatedAt || record.tanggal)}</small><br>
        <small>Diupdate oleh: <strong>${escapeHtml(record.updatedBy || record.createdBy || '-')}</strong></small>
        ${updatedFieldsHtml}
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
    
    console.log('📤 submitValidation called for recordId:', recordId);
    
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
        // Find record with string comparison
        const record = allRecords.find(r => String(r.id) === String(recordId));
        if (!record) {
            hideLoading();
            showToast('Record tidak ditemukan', 'error');
            return;
        }
        
        // Update validation fields
        record.validationStatus = status;
        record.validationReason = reason;
        record.validatedBy = validatorName;
        record.validatedAt = new Date().toISOString();
        
        console.log('📤 Updating validation:', {
            id: recordId,
            status: status,
            reason: reason,
            validatedBy: validatorName
        });
        
        // Update in Google Sheets via sheetsDB
        const result = await sheetsDB.updateRecord(recordId, record);
        
        if (!result || result.error) {
            throw new Error(result?.error || 'Failed to update validation');
        }
        
        console.log('✅ Validation saved:', result);
        
        hideLoading();
        showToast(`Record berhasil di-${status === 'valid' ? 'validasi' : 'invalid'}kan`, 'success');
        closeValidationPopup();
        
        // Re-render records to show updated status
        renderAllRecordsAsCardList();
    } catch (error) {
        hideLoading();
        console.error('❌ Error saving validation:', error);
        showToast('Gagal menyimpan validasi: ' + error.message, 'error');
    }
}

// Close popup when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('popup-overlay')) {
        // Prevent closing Drive Connection popup if user is editor and not connected
        const isDrivePopup = e.target.id === 'driveConnectionPopup';
        const isConnected = auth.hasGoogleToken() && checkConfig();
        const userCanEdit = hasPermission('records_editor');
        
        if (isDrivePopup && userCanEdit && !isConnected) {
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
        const userCanEdit = hasPermission('records_editor');
        
        // If user is editor and not connected, prevent closing popup with ESC
        if (!userCanEdit || isConnected) {
            closeDriveConnectionPopup();
        }
    }
});

// ==================== GOOGLE DRIVE STATUS (Server-Side Upload via Apps Script) ====================
// NOTE: Google Drive sekarang dikelola oleh server (Apps Script), user tidak perlu login Google

function updateGoogleDriveAlerts() {
    // Selalu tampilkan sebagai terkoneksi karena upload via server
    const googleDriveAlert = document.getElementById('googleDriveAlert');
    const googleDriveConnected = document.getElementById('googleDriveConnected');
    
    if (googleDriveAlert) googleDriveAlert.style.display = 'none';
    if (googleDriveConnected) googleDriveConnected.style.display = 'flex';
}

// Legacy functions - sekarang tidak diperlukan tapi tetap ada untuk backwards compatibility
function showDriveConnectionPopup() {
    // Tidak perlu popup - sudah otomatis terkoneksi via server
    console.log('showDriveConnectionPopup: Tidak diperlukan - upload via Apps Script');
}

function openDriveConnectionPopup() {
    // Tidak perlu popup
    console.log('openDriveConnectionPopup: Tidak diperlukan - upload via Apps Script');
}

function closeDriveConnectionPopup(force = false) {
    const popup = document.getElementById('driveConnectionPopup');
    if (popup) popup.classList.add('hidden');
}

function updateDrivePopupButtons() {
    // Tidak perlu - selalu terkoneksi via server
}

async function connectGoogleDriveFromPopup() {
    // Tidak perlu koneksi manual - otomatis via Apps Script
    showToast('Google Drive sudah terkoneksi via server', 'success');
    closeDriveConnectionPopup(true);
}

function disconnectGoogleDriveFromPopup() {
    // Tidak bisa disconnect - dikelola oleh server
    showToast('Google Drive dikelola oleh server dan tidak bisa diputus', 'info');
}

function skipGoogleDriveConnection() {
    // Tidak perlu skip - otomatis terkoneksi
    closeDriveConnectionPopup(true);
}

