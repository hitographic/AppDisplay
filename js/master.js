// =====================================================
// VALID DISPLAY - Master Data Page Script
// With Permissions, Search, and CRUD
// =====================================================

let allMasterData = [];
let filteredMasterData = [];
let editingMasterId = null;

// Pagination variables
let masterCurrentPage = 1;
let masterPerPage = 10;

document.addEventListener('DOMContentLoaded', function() {
    // Protect page
    if (!protectPage()) return;

    // Initialize page
    initMasterPage();
});

async function initMasterPage() {
    console.log('🚀 initMasterPage: Starting initialization...');
    
    // Show user name
    const user = auth.getUser();
    console.log('👤 User info:', user);
    document.getElementById('userName').textContent = user?.name || 'User';

    // Show/hide admin controls based on permissions
    setupPermissionBasedUI();

    // Load master data
    console.log('📋 initMasterPage: Loading master data...');
    await loadMasterData();
    
    console.log('✅ initMasterPage: Initialization complete!');
}

function setupPermissionBasedUI() {
    const addMasterBtn = document.getElementById('btnAddMaster');
    const userMgmtLink = document.getElementById('userManagementLink');
    
    // Show user management link for user_admin permission
    if (hasPermission('user_admin')) {
        if (userMgmtLink) {
            userMgmtLink.style.display = 'inline-flex';
        }
    }
    
    // Hide add button if user can't edit
    if (!canEdit()) {
        if (addMasterBtn) {
            addMasterBtn.style.display = 'none';
        }
    }
}

// ==================== LOAD DATA ====================

async function loadMasterData() {
    showLoadingMaster();
    
    try {
        console.log('📥 Loading master data from API...');
        const result = await sheetsDB.getMasterData();
        
        if (result.success) {
            allMasterData = result.data || [];
            filteredMasterData = [...allMasterData];
            console.log('✅ Loaded', allMasterData.length, 'master records');
            renderMasterTable();
        } else {
            console.error('❌ Failed to load master data:', result.error);
            showToast('Gagal memuat data master: ' + result.error, 'error');
            allMasterData = [];
            filteredMasterData = [];
            renderMasterTable();
        }
    } catch (error) {
        console.error('❌ Error loading master data:', error);
        showToast('Error memuat data: ' + error.message, 'error');
        allMasterData = [];
        filteredMasterData = [];
        renderMasterTable();
    }
    
    hideLoadingMaster();
}

function showLoadingMaster() {
    const loading = document.getElementById('loadingMaster');
    const table = document.getElementById('masterTable');
    const empty = document.getElementById('emptyMasterState');
    
    if (loading) loading.classList.remove('hidden');
    if (table) table.classList.add('hidden');
    if (empty) empty.classList.add('hidden');
}

function hideLoadingMaster() {
    const loading = document.getElementById('loadingMaster');
    if (loading) loading.classList.add('hidden');
}

// ==================== RENDER TABLE ====================

function renderMasterTable() {
    hideLoadingMaster();
    
    const tbody = document.getElementById('masterTableBody');
    const table = document.getElementById('masterTable');
    const emptyState = document.getElementById('emptyMasterState');
    
    if (filteredMasterData.length === 0) {
        table.classList.add('hidden');
        emptyState.classList.remove('hidden');
        hideMasterPagination();
        return;
    }
    
    table.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    // Calculate pagination
    const totalRecords = filteredMasterData.length;
    const totalPages = Math.ceil(totalRecords / masterPerPage);
    
    if (masterCurrentPage > totalPages) masterCurrentPage = totalPages;
    if (masterCurrentPage < 1) masterCurrentPage = 1;
    
    const startIndex = (masterCurrentPage - 1) * masterPerPage;
    const endIndex = startIndex + masterPerPage;
    const paginatedData = filteredMasterData.slice(startIndex, endIndex);
    
    const userCanEdit = canEdit();
    
    tbody.innerHTML = paginatedData.map((master, index) => {
        const rowNum = startIndex + index + 1;
        return `
            <tr>
                <td>${rowNum}</td>
                <td>${escapeHtml(master.negara)}</td>
                <td><strong>${escapeHtml(master.flavor)}</strong></td>
                <td>${escapeHtml(master.keterangan || '-')}</td>
                <td>${escapeHtml(master.distributor || '-')}</td>
                <td>${escapeHtml(master.bumbu || '-')}</td>
                <td>${escapeHtml(master.minyakBumbu || '-')}</td>
                <td class="actions-cell">
                    <button class="btn-action view" onclick="viewMasterDetail('${master.id}')" title="Lihat Detail">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${userCanEdit ? `
                    <button class="btn-action edit" onclick="editMaster('${master.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action delete" onclick="deleteMaster('${master.id}')" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
    
    renderMasterPagination(totalPages, totalRecords);
}

function renderMasterPagination(totalPages, totalRecords) {
    const container = document.getElementById('masterPaginationContainer');
    if (!container) return;
    
    if (totalPages <= 1) {
        container.innerHTML = `
            <div class="pagination-info">
                <span>Menampilkan ${totalRecords} data</span>
            </div>
        `;
        return;
    }
    
    const startRecord = (masterCurrentPage - 1) * masterPerPage + 1;
    const endRecord = Math.min(masterCurrentPage * masterPerPage, totalRecords);
    
    let paginationHTML = `
        <div class="pagination-info">
            <span>Menampilkan ${startRecord}-${endRecord} dari ${totalRecords} data</span>
        </div>
        <div class="pagination-controls">
            <button class="btn-page" onclick="masterGoToPage(1)" ${masterCurrentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-angle-double-left"></i>
            </button>
            <button class="btn-page" onclick="masterGoToPage(${masterCurrentPage - 1})" ${masterCurrentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-angle-left"></i>
            </button>
    `;
    
    // Page numbers
    let startPage = Math.max(1, masterCurrentPage - 2);
    let endPage = Math.min(totalPages, masterCurrentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="btn-page ${i === masterCurrentPage ? 'active' : ''}" onclick="masterGoToPage(${i})">
                ${i}
            </button>
        `;
    }
    
    paginationHTML += `
            <button class="btn-page" onclick="masterGoToPage(${masterCurrentPage + 1})" ${masterCurrentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-angle-right"></i>
            </button>
            <button class="btn-page" onclick="masterGoToPage(${totalPages})" ${masterCurrentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-angle-double-right"></i>
            </button>
        </div>
    `;
    
    container.innerHTML = paginationHTML;
}

function hideMasterPagination() {
    const container = document.getElementById('masterPaginationContainer');
    if (container) container.innerHTML = '';
}

function masterGoToPage(page) {
    masterCurrentPage = page;
    renderMasterTable();
}

// ==================== SEARCH ====================

function toggleMasterSearch() {
    const panel = document.getElementById('masterSearchPanel');
    panel.classList.toggle('hidden');
}

function applyMasterSearch() {
    const flavor = document.getElementById('searchMasterFlavor').value.toLowerCase().trim();
    const negara = document.getElementById('searchMasterNegara').value.toLowerCase().trim();
    const distributor = document.getElementById('searchMasterDistributor').value.toLowerCase().trim();
    
    filteredMasterData = allMasterData.filter(master => {
        let match = true;
        
        if (flavor && !master.flavor.toLowerCase().includes(flavor)) {
            match = false;
        }
        
        if (negara && !master.negara.toLowerCase().includes(negara)) {
            match = false;
        }
        
        if (distributor && !master.distributor.toLowerCase().includes(distributor)) {
            match = false;
        }
        
        return match;
    });
    
    masterCurrentPage = 1;
    renderMasterTable();
    showToast(`Ditemukan ${filteredMasterData.length} hasil`, 'info');
}

function resetMasterSearch() {
    document.getElementById('searchMasterFlavor').value = '';
    document.getElementById('searchMasterNegara').value = '';
    document.getElementById('searchMasterDistributor').value = '';
    
    filteredMasterData = [...allMasterData];
    masterCurrentPage = 1;
    renderMasterTable();
    showToast('Filter direset', 'info');
}

// ==================== CRUD OPERATIONS ====================

function openAddMasterPopup() {
    if (!canEdit()) {
        showToast('Anda tidak memiliki akses untuk menambah data', 'error');
        return;
    }
    
    editingMasterId = null;
    document.getElementById('masterPopupTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Tambah Master Data';
    document.getElementById('masterForm').reset();
    document.getElementById('masterId').value = '';
    document.getElementById('masterPopup').classList.remove('hidden');
}

function closeMasterPopup() {
    document.getElementById('masterPopup').classList.add('hidden');
    editingMasterId = null;
}

function editMaster(id) {
    if (!canEdit()) {
        showToast('Anda tidak memiliki akses untuk mengedit data', 'error');
        return;
    }
    
    const master = allMasterData.find(m => String(m.id) === String(id));
    if (!master) {
        showToast('Data tidak ditemukan', 'error');
        return;
    }
    
    editingMasterId = id;
    document.getElementById('masterPopupTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Master Data';
    document.getElementById('masterId').value = id;
    
    document.getElementById('inputMasterNegara').value = master.negara || '';
    document.getElementById('inputMasterFlavor').value = master.flavor || '';
    document.getElementById('inputMasterKeterangan').value = master.keterangan || '';
    document.getElementById('inputMasterDistributor').value = master.distributor || '';
    document.getElementById('inputMasterBumbu').value = master.bumbu || '';
    document.getElementById('inputMasterMinyakBumbu').value = master.minyakBumbu || '';
    document.getElementById('inputMasterKodeSI').value = master.kodeSI || '';
    document.getElementById('inputMasterKodeEtiket').value = master.kodeEtiket || '';
    document.getElementById('inputMasterKodeKarton').value = master.kodeKarton || '';
    document.getElementById('inputMasterFiveOrSix').value = master.fiveOrSixInOne || '';
    document.getElementById('inputMasterPlakban').value = master.plakban || '';
    
    document.getElementById('masterPopup').classList.remove('hidden');
}

async function saveMaster(event) {
    event.preventDefault();
    
    const user = auth.getUser();
    const masterData = {
        negara: document.getElementById('inputMasterNegara').value.trim(),
        flavor: document.getElementById('inputMasterFlavor').value.trim(),
        keterangan: document.getElementById('inputMasterKeterangan').value.trim(),
        distributor: document.getElementById('inputMasterDistributor').value.trim(),
        bumbu: document.getElementById('inputMasterBumbu').value.trim(),
        minyakBumbu: document.getElementById('inputMasterMinyakBumbu').value.trim(),
        kodeSI: document.getElementById('inputMasterKodeSI').value.trim(),
        kodeEtiket: document.getElementById('inputMasterKodeEtiket').value.trim(),
        kodeKarton: document.getElementById('inputMasterKodeKarton').value.trim(),
        fiveOrSixInOne: document.getElementById('inputMasterFiveOrSix').value.trim(),
        plakban: document.getElementById('inputMasterPlakban').value.trim(),
        createdBy: user?.name || 'Unknown',
        updatedBy: user?.name || 'Unknown'
    };
    
    try {
        let result;
        
        if (editingMasterId) {
            // Update existing
            result = await sheetsDB.updateMaster(editingMasterId, masterData);
        } else {
            // Add new
            result = await sheetsDB.addMaster(masterData);
        }
        
        if (result.success) {
            showToast(editingMasterId ? 'Data berhasil diupdate' : 'Data berhasil ditambahkan', 'success');
            closeMasterPopup();
            await loadMasterData();
        } else {
            showToast('Gagal menyimpan: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error saving master:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

async function deleteMaster(id) {
    if (!canEdit()) {
        showToast('Anda tidak memiliki akses untuk menghapus data', 'error');
        return;
    }
    
    const master = allMasterData.find(m => String(m.id) === String(id));
    if (!master) {
        showToast('Data tidak ditemukan', 'error');
        return;
    }
    
    if (!confirm(`Hapus master data "${master.flavor}"?`)) {
        return;
    }
    
    try {
        const result = await sheetsDB.deleteMaster(id);
        
        if (result.success) {
            showToast('Data berhasil dihapus', 'success');
            await loadMasterData();
        } else {
            showToast('Gagal menghapus: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error deleting master:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

// ==================== VIEW DETAIL ====================

function viewMasterDetail(id) {
    const master = allMasterData.find(m => String(m.id) === String(id));
    if (!master) {
        showToast('Data tidak ditemukan', 'error');
        return;
    }
    
    const content = document.getElementById('masterDetailContent');
    content.innerHTML = `
        <div class="detail-grid">
            <div class="detail-section">
                <h3><i class="fas fa-info-circle"></i> Informasi Utama</h3>
                <div class="detail-row">
                    <span class="detail-label">Negara:</span>
                    <span class="detail-value">${escapeHtml(master.negara)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Flavor:</span>
                    <span class="detail-value"><strong>${escapeHtml(master.flavor)}</strong></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Keterangan:</span>
                    <span class="detail-value">${escapeHtml(master.keterangan || '-')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Distributor:</span>
                    <span class="detail-value">${escapeHtml(master.distributor || '-')}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-box"></i> Informasi Kemasan</h3>
                <div class="detail-row">
                    <span class="detail-label">Bumbu:</span>
                    <span class="detail-value">${escapeHtml(master.bumbu || '-')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Minyak Bumbu:</span>
                    <span class="detail-value">${escapeHtml(master.minyakBumbu || '-')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Kode SI:</span>
                    <span class="detail-value">${escapeHtml(master.kodeSI || '-')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Kode Etiket:</span>
                    <span class="detail-value">${escapeHtml(master.kodeEtiket || '-')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Kode Karton:</span>
                    <span class="detail-value">${escapeHtml(master.kodeKarton || '-')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Five/Six in One:</span>
                    <span class="detail-value">${escapeHtml(master.fiveOrSixInOne || '-')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Plakban:</span>
                    <span class="detail-value">${escapeHtml(master.plakban || '-')}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-clock"></i> Informasi Audit</h3>
                <div class="detail-row">
                    <span class="detail-label">Dibuat:</span>
                    <span class="detail-value">${formatDateTime(master.createdAt)} oleh ${escapeHtml(master.createdBy || '-')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Diupdate:</span>
                    <span class="detail-value">${formatDateTime(master.updatedAt)} oleh ${escapeHtml(master.updatedBy || '-')}</span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('masterDetailPopup').classList.remove('hidden');
}

function closeMasterDetailPopup() {
    document.getElementById('masterDetailPopup').classList.add('hidden');
}

// ==================== UTILITIES ====================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateStr;
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toast.className = 'toast ' + type;
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}
