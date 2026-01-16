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

    // Load records
    console.log('📋 initRecordsPage: Calling loadRecords()...');
    await loadRecords();

    // Initialize search filters
    initSearchFilters();

    // Initialize popup forms
    initForms();

    // Initialize preview tabs
    initPreviewTabs();
    
    console.log('✅ initRecordsPage: Initialization complete!');
}

function setupPermissionBasedUI() {
    const addDataBtn = document.querySelector('.btn-primary[onclick="openAddDataPopup()"]');
    const userMgmtLink = document.getElementById('userManagementLink');
    const masterDataLink = document.getElementById('masterDataLink');
    const googleDriveAlert = document.getElementById('googleDriveAlert');
    const googleDriveConnected = document.getElementById('googleDriveConnected');
    const driveConnectionPopup = document.getElementById('driveConnectionPopup');
    
    // Show user management link for user_admin permission
    if (hasPermission('user_admin')) {
        if (userMgmtLink) {
            userMgmtLink.style.display = 'inline-flex';
        }
    }
    
    // Show master data link for editors
    if (canEdit()) {
        if (masterDataLink) {
            masterDataLink.style.display = 'inline-flex';
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
    console.log('📋 loadRecords: Starting to load records...');

    try {
        // Load from Google Sheets (if configured) or local storage
        console.log('📋 loadRecords: Calling storage.getAllRecords()...');
        allRecords = await storage.getAllRecords();
        console.log(`✅ loadRecords: Loaded ${allRecords.length} records`);
        
        filteredRecords = [...allRecords];
        renderRecords();
    } catch (error) {
        console.error('❌ loadRecords: Error loading records:', error);
        console.log('⚠️ loadRecords: Falling back to local storage');
        allRecords = storage.getRecordsLocal();
        console.log(`📦 loadRecords: Loaded ${allRecords.length} records from local storage`);
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
    
    // Hide search results when closing panel
    if (panel.classList.contains('hidden')) {
        const searchResultsList = document.getElementById('searchResultsList');
        if (searchResultsList) {
            searchResultsList.classList.add('hidden');
        }
    } else {
        // Initialize autocomplete when panel opens
        initAutocomplete();
    }
}

// ==================== AUTOCOMPLETE FUNCTIONS ====================

let autocompleteActiveIndex = -1;

function initAutocomplete() {
    const flavorInput = document.getElementById('searchFlavor');
    const negaraInput = document.getElementById('searchNegara');
    const flavorDropdown = document.getElementById('flavorDropdown');
    const negaraDropdown = document.getElementById('negaraDropdown');
    
    // Remove existing listeners to prevent duplicates
    flavorInput.removeEventListener('input', handleFlavorInput);
    flavorInput.removeEventListener('keydown', handleFlavorKeydown);
    flavorInput.removeEventListener('blur', handleFlavorBlur);
    
    negaraInput.removeEventListener('input', handleNegaraInput);
    negaraInput.removeEventListener('keydown', handleNegaraKeydown);
    negaraInput.removeEventListener('blur', handleNegaraBlur);
    
    // Add new listeners
    flavorInput.addEventListener('input', handleFlavorInput);
    flavorInput.addEventListener('keydown', handleFlavorKeydown);
    flavorInput.addEventListener('blur', handleFlavorBlur);
    
    negaraInput.addEventListener('input', handleNegaraInput);
    negaraInput.addEventListener('keydown', handleNegaraKeydown);
    negaraInput.addEventListener('blur', handleNegaraBlur);
}

function handleFlavorInput(e) {
    const query = e.target.value.toLowerCase().trim();
    const dropdown = document.getElementById('flavorDropdown');
    
    if (query.length < 1) {
        dropdown.classList.add('hidden');
        return;
    }
    
    // Get unique flavors from allRecords
    const flavors = [...new Set(allRecords.map(r => r.flavor))].filter(f => f);
    const matches = flavors.filter(f => f.toLowerCase().includes(query));
    
    renderAutocompleteDropdown(dropdown, matches, query, 'searchFlavor');
}

function handleNegaraInput(e) {
    const query = e.target.value.toLowerCase().trim();
    const dropdown = document.getElementById('negaraDropdown');
    
    if (query.length < 1) {
        dropdown.classList.add('hidden');
        return;
    }
    
    // Get unique countries from allRecords
    const countries = [...new Set(allRecords.map(r => r.negara))].filter(n => n);
    const matches = countries.filter(n => n.toLowerCase().includes(query));
    
    renderAutocompleteDropdown(dropdown, matches, query, 'searchNegara');
}

function renderAutocompleteDropdown(dropdown, matches, query, inputId) {
    autocompleteActiveIndex = -1;
    
    if (matches.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-no-results">Tidak ditemukan</div>';
        dropdown.classList.remove('hidden');
        return;
    }
    
    // Limit to 10 results
    const limitedMatches = matches.slice(0, 10);
    
    dropdown.innerHTML = limitedMatches.map((item, index) => {
        // Highlight matching part
        const lowerItem = item.toLowerCase();
        const matchIndex = lowerItem.indexOf(query);
        let displayHtml = escapeHtml(item);
        
        if (matchIndex !== -1) {
            const before = item.substring(0, matchIndex);
            const match = item.substring(matchIndex, matchIndex + query.length);
            const after = item.substring(matchIndex + query.length);
            displayHtml = `${escapeHtml(before)}<span class="match">${escapeHtml(match)}</span>${escapeHtml(after)}`;
        }
        
        return `<div class="autocomplete-item" data-value="${escapeHtml(item)}" data-index="${index}">${displayHtml}</div>`;
    }).join('');
    
    dropdown.classList.remove('hidden');
    
    // Add click handlers
    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.getElementById(inputId).value = item.dataset.value;
            dropdown.classList.add('hidden');
        });
    });
}

function handleFlavorKeydown(e) {
    handleAutocompleteKeydown(e, 'flavorDropdown', 'searchFlavor');
}

function handleNegaraKeydown(e) {
    handleAutocompleteKeydown(e, 'negaraDropdown', 'searchNegara');
}

function handleAutocompleteKeydown(e, dropdownId, inputId) {
    const dropdown = document.getElementById(dropdownId);
    const items = dropdown.querySelectorAll('.autocomplete-item');
    
    if (dropdown.classList.contains('hidden') || items.length === 0) return;
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        autocompleteActiveIndex = Math.min(autocompleteActiveIndex + 1, items.length - 1);
        updateActiveItem(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        autocompleteActiveIndex = Math.max(autocompleteActiveIndex - 1, 0);
        updateActiveItem(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (autocompleteActiveIndex >= 0 && items[autocompleteActiveIndex]) {
            document.getElementById(inputId).value = items[autocompleteActiveIndex].dataset.value;
            dropdown.classList.add('hidden');
        }
    } else if (e.key === 'Escape') {
        dropdown.classList.add('hidden');
    }
}

function updateActiveItem(items) {
    items.forEach((item, index) => {
        if (index === autocompleteActiveIndex) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
}

function handleFlavorBlur() {
    setTimeout(() => {
        document.getElementById('flavorDropdown').classList.add('hidden');
    }, 150);
}

function handleNegaraBlur() {
    setTimeout(() => {
        document.getElementById('negaraDropdown').classList.add('hidden');
    }, 150);
}

// ==================== SEARCH FUNCTIONS ====================

function applySearch() {
    const nomorMaterial = document.getElementById('searchNomorMaterial').value.trim();
    const flavor = document.getElementById('searchFlavor').value.toLowerCase().trim();
    const negara = document.getElementById('searchNegara').value.toLowerCase().trim();
    const date = document.getElementById('searchDate').value;
    const validationStatus = document.getElementById('searchValidation').value;

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

        if (date && record.tanggal !== date) {
            match = false;
        }

        // Filter by validation status
        if (validationStatus) {
            const recordStatus = record.isValidated ? (record.validationStatus || 'valid') : 'pending';
            if (validationStatus === 'valid' && recordStatus !== 'valid') {
                match = false;
            } else if (validationStatus === 'invalid' && recordStatus !== 'invalid') {
                match = false;
            } else if (validationStatus === 'pending' && record.isValidated) {
                match = false;
            }
        }

        return match;
    });

    currentPage = 1; // Reset to first page when searching
    
    // Render search results in list view (tanpa gambar)
    renderSearchResultsList(filteredRecords);
    
    showToast(`Ditemukan ${filteredRecords.length} hasil`, 'info');
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
                <div class="search-result-flavor">
                    <span class="validation-indicator ${validationClass}" title="${validationClass === 'valid' ? 'Valid' : validationClass === 'invalid' ? 'Invalid' : 'Belum Validasi'}"></span>
                    ${escapeHtml(record.flavor)}
                </div>
                <span class="search-result-meta">${escapeHtml(record.negara)} • ${formatDate(record.tanggal)}</span>
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
                    ${userCanValidate ? `
                    <button class="btn-action validate" onclick="openValidationPopup('${record.id}')" title="Validasi">
                        <i class="fas fa-check-double"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function resetSearch() {
    document.getElementById('searchNomorMaterial').value = '';
    document.getElementById('searchFlavor').value = '';
    document.getElementById('searchNegara').value = '';
    document.getElementById('searchDate').value = '';
    document.getElementById('searchValidation').value = '';

    filteredRecords = [...allRecords];
    currentPage = 1; // Reset to first page
    
    // Hide search results list
    const searchResultsList = document.getElementById('searchResultsList');
    if (searchResultsList) {
        searchResultsList.classList.add('hidden');
    }
    
    showToast('Filter direset', 'info');
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

// Check for duplicate Nomor Material
async function checkDuplicateNomorMaterial(nomorMaterial) {
    try {
        // Get all existing records
        const existingRecords = await storage.getAllRecords();
        
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

    if (!tanggal || !nomorMaterial || !flavor || !negara) {
        showToast('Mohon lengkapi semua field', 'error');
        return;
    }

    // Validate nomorMaterial contains only digits
    if (!/^\d+$/.test(nomorMaterial)) {
        showToast('Nomor Material harus berupa angka', 'error');
        return;
    }

    // Check for duplicate Nomor Material
    showLoading('Memeriksa data duplikat...');
    const nomorMaterialCheck = await checkDuplicateNomorMaterial(nomorMaterial);
    
    if (nomorMaterialCheck.isDuplicate) {
        hideLoading();
        alert('⚠️ NOMOR MATERIAL DUPLIKAT!\n\n' + nomorMaterialCheck.message);
        showToast('Nomor Material sudah ada', 'error');
        return;
    }

    // Check for duplicate Flavor + Negara
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
        nomorMaterial: nomorMaterial,
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
    console.log('🔍 Opening preview for:', recordId, 'type:', typeof recordId);
    console.log('🔍 allRecords length:', allRecords.length);
    console.log('🔍 allRecords IDs:', allRecords.map(r => ({ id: r.id, type: typeof r.id })));
    
    // Cari dari allRecords yang sudah dimuat (bukan dari local storage)
    // Konversi kedua sisi ke string untuk perbandingan yang konsisten
    currentPreviewRecord = allRecords.find(r => String(r.id) === String(recordId));
    
    // Fallback ke filteredRecords jika tidak ditemukan di allRecords
    if (!currentPreviewRecord) {
        currentPreviewRecord = filteredRecords.find(r => String(r.id) === String(recordId));
    }
    
    // Fallback ke storage jika tidak ditemukan
    if (!currentPreviewRecord) {
        currentPreviewRecord = storage.getRecordById(recordId);
    }
    
    // Fallback: jika record tidak punya field photos, buat object kosong
    if (currentPreviewRecord && typeof currentPreviewRecord.photos !== 'object') {
        currentPreviewRecord.photos = {};
    }
    
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
    // Show record info (negara, nomor material)
    renderPreviewRecordInfo();
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

    // Helper: cek apakah id adalah ID Google Drive valid (bukan nama file)
    // ID Google Drive biasanya panjang ~33 karakter dan tidak mengandung spasi atau ekstensi file
    const isValidDriveId = (id) => {
        if (!id || typeof id !== 'string') return false;
        // Jika ada spasi, titik (ekstensi), atau terlalu pendek, kemungkinan nama file
        if (id.includes(' ') || id.includes('.') || id.length < 20) return false;
        return true;
    };

    if (photo && typeof photo === 'object') {
        if (photo.id && isValidDriveId(photo.id)) {
            // Use Google Drive thumbnail URL format (more reliable for display)
            const imgSrc = `https://lh3.googleusercontent.com/d/${photo.id}`;
            console.log('📷 Image source:', imgSrc);
            previewContent.innerHTML = `
                <img src="${imgSrc}" alt="${tabId}"
                     onerror="this.onerror=null; this.src='${photo.directLink || ''}'; if(!this.src) this.parentElement.innerHTML='<div class=\\'no-image\\'><i class=\\'fas fa-exclamation-triangle\\'></i><p>Gagal memuat gambar</p></div>';">
            `;
        } else if (photo.base64) {
            // Fallback to base64 if available
            previewContent.innerHTML = `<img src="${photo.base64}" alt="${tabId}">`;
        } else if (photo.directLink && isValidDriveId(photo.directLink.split('/d/')[1])) {
            previewContent.innerHTML = `<img src="${photo.directLink}" alt="${tabId}">`;
        } else if (photo.id || photo.name) {
            // Jika id/name adalah nama file (bukan ID Google Drive valid)
            const fileName = photo.name || photo.id || '';
            previewContent.innerHTML = `
                <div class="no-image">
                    <i class="fas fa-image"></i>
                    <p>Foto ${tabId} tidak ditemukan<br><small>Nama file: ${fileName}</small><br><small style="color:#888;">Gunakan ID Google Drive, bukan nama file</small></p>
                </div>
            `;
        } else {
            previewContent.innerHTML = `
                <div class="no-image">
                    <i class="fas fa-image"></i>
                    <p>Foto ${tabId} tidak tersedia</p>
                </div>
            `;
        }
    } else if (typeof photo === 'string' && photo.length > 0) {
        // Jika hanya nama file (input manual), tampilkan fallback
        previewContent.innerHTML = `
            <div class="no-image">
                <i class="fas fa-image"></i>
                <p>Foto ${tabId} tidak ditemukan<br><small>Nama file: ${photo}</small><br><small style="color:#888;">Gunakan ID Google Drive, bukan nama file</small></p>
            </div>
        `;
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

// Show validation info popup (for Editor only)
function showValidationInfo(recordId) {
    const record = allRecords.find(r => r.id === recordId);
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

