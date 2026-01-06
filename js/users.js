// =====================================================
// VALID DISPLAY - User Management Script
// With Roles, Permissions, and Bulk Upload
// =====================================================

let allUsers = [];
let parsedCSVData = [];
const webAppUrl = CONFIG.GOOGLE_SHEETS_WEBAPP_URL || '';

// Role definitions
const ROLES = {
    admin: { name: 'Admin', icon: '👑', color: '#1976d2' },
    manager: { name: 'Manager', icon: '📊', color: '#f57c00' },
    supervisor: { name: 'Supervisor', icon: '👔', color: '#388e3c' },
    field: { name: 'Field', icon: '🏃', color: '#7b1fa2' }
};

// Permission definitions
const PERMISSIONS = {
    user_admin: { name: 'User Admin', icon: 'fas fa-users-cog', desc: 'Kelola User & Permissions' },
    records_viewer: { name: 'Viewer', icon: 'fas fa-eye', desc: 'Lihat Records' },
    records_editor: { name: 'Editor', icon: 'fas fa-edit', desc: 'CRUD Records' },
    records_validator: { name: 'Validator', icon: 'fas fa-check-double', desc: 'Validasi Records' }
};

// Default permissions per role
const DEFAULT_PERMISSIONS = {
    admin: ['user_admin', 'records_viewer', 'records_editor', 'records_validator'],
    manager: ['records_viewer', 'records_editor', 'records_validator'],
    supervisor: ['records_viewer', 'records_validator'],
    field: ['records_viewer', 'records_editor']
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('Users page loaded');
    
    // Check authentication
    if (!auth.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    // Check if has user_admin permission
    const currentUser = auth.getUser();
    if (!hasPermission('user_admin')) {
        alert('Anda tidak memiliki akses ke halaman ini');
        window.location.href = 'records.html';
        return;
    }

    // Set user name
    document.getElementById('userName').textContent = currentUser.name;

    // Hide any existing loading overlay first
    hideLoading();
    
    // Load users
    loadUsers();
    
    // Setup drag and drop for CSV
    setupDragAndDrop();
});

// Check if current user has permission
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

// JSONP request dengan cache buster
function jsonpRequest(url) {
    return new Promise((resolve, reject) => {
        const callbackName = 'usersCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const timeoutId = setTimeout(() => {
            console.log('JSONP timeout for:', url);
            delete window[callbackName];
            if (script && script.parentNode) script.parentNode.removeChild(script);
            reject(new Error('Request timeout'));
        }, 15000);

        window[callbackName] = (data) => {
            console.log('JSONP callback received:', data);
            clearTimeout(timeoutId);
            delete window[callbackName];
            if (script && script.parentNode) script.parentNode.removeChild(script);
            resolve(data);
        };

        const script = document.createElement('script');
        const cacheBuster = '_cb=' + Date.now();
        script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName + '&' + cacheBuster;
        
        script.onerror = (e) => {
            console.error('JSONP script error:', e);
            clearTimeout(timeoutId);
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
            reject(new Error('Gagal memuat data dari server'));
        };
        document.head.appendChild(script);
    });
}

// POST request via JSONP (GET with data parameter) - bypasses CORS
function postRequest(data) {
    console.log('📤 User operation via JSONP:', data.action);
    
    return new Promise((resolve, reject) => {
        const callbackName = 'usersPostCallback_' + Date.now();
        
        const timeoutId = setTimeout(() => {
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
            reject(new Error('Request timeout'));
        }, 30000);

        window[callbackName] = (response) => {
            clearTimeout(timeoutId);
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
            console.log('✅ User operation response:', response);
            resolve(response);
        };

        // Encode data as URL parameter for JSONP
        const encodedData = encodeURIComponent(JSON.stringify(data));
        const url = `${webAppUrl}?action=${data.action}&data=${encodedData}&callback=${callbackName}`;
        
        console.log('📤 JSONP URL length:', url.length);

        const script = document.createElement('script');
        script.src = url;
        script.onerror = () => {
            clearTimeout(timeoutId);
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
            reject(new Error('Script load error'));
        };
        document.head.appendChild(script);
    });
}
            resolve({ success: true, message: 'Request sent' });
        }, 5000);
    });
}

// Load all users
async function loadUsers() {
    console.log('Loading users from:', webAppUrl);
    showLoading('Memuat data user...');
    
    try {
        const result = await jsonpRequest(`${webAppUrl}?action=getUsers`);
        
        console.log('Users loaded raw:', result);
        hideLoading();
        
        if (result && result.success) {
            allUsers = (result.users || []).map(u => {
                const perms = parsePermissions(u.permissions);
                console.log(`User ${u.nik} permissions:`, perms);
                return {
                    ...u,
                    permissions: perms
                };
            });
            console.log('All users processed:', allUsers);
            renderUsersTable();
            showToast('Data user berhasil dimuat', 'success');
        } else {
            showToast('Gagal memuat data user: ' + (result?.error || 'Unknown error'), 'error');
            loadLocalUsers();
        }
    } catch (error) {
        console.error('Error loading users:', error);
        hideLoading();
        showToast('Timeout - Menampilkan data lokal', 'warning');
        loadLocalUsers();
    }
}

// Parse permissions from various formats
function parsePermissions(perms) {
    if (!perms) return [];
    if (Array.isArray(perms)) return perms;
    if (typeof perms === 'string') {
        return perms.split('|').map(p => p.trim()).filter(p => p);
    }
    return [];
}

// Fallback: Load users from local config
function loadLocalUsers() {
    console.log('Loading local users from CONFIG');
    allUsers = CONFIG.USERS.map(u => {
        // Handle both array and string permissions
        let perms = u.permissions;
        if (typeof perms === 'string') {
            perms = perms.split('|').map(p => p.trim()).filter(p => p);
        } else if (!Array.isArray(perms)) {
            perms = DEFAULT_PERMISSIONS[u.role] || ['records_viewer'];
        }
        
        return {
            nik: u.nik,
            password: u.password,
            name: u.name,
            role: u.role || 'field',
            permissions: perms
        };
    });
    console.log('Local users loaded:', allUsers);
    renderUsersTable();
}

// Render users table
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    
    if (allUsers.length === 0) {
        renderEmptyState();
        return;
    }
    
    console.log('Rendering users table:', allUsers);
    
    tbody.innerHTML = allUsers.map(user => {
        const role = ROLES[user.role] || ROLES.field;
        const permissions = parsePermissions(user.permissions);
        
        console.log(`Rendering user ${user.nik} with permissions:`, permissions);
        
        // Generate permission badges
        const permBadges = permissions.map(p => {
            const perm = PERMISSIONS[p];
            if (perm) {
                return `<span class="perm-badge perm-${p}" title="${perm.desc}"><i class="${perm.icon}"></i> ${perm.name}</span>`;
            }
            return '';
        }).filter(b => b).join('');
        
        return `
        <tr>
            <td><strong>${user.nik}</strong></td>
            <td>${user.name}</td>
            <td>
                <span class="role-badge role-${user.role}">
                    ${role.icon} ${role.name}
                </span>
            </td>
            <td>
                <div class="permission-badges">
                    ${permBadges || '<span style="color:#999;font-size:12px;">-</span>'}
                </div>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-edit" onclick="editUser('${user.nik}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-delete" onclick="deleteUser('${user.nik}', '${user.name}')">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
}

// Render empty state
function renderEmptyState() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="empty-state">
                <i class="fas fa-users-slash"></i>
                <p>Belum ada user</p>
            </td>
        </tr>
    `;
}

// Show add modal
function showAddModal() {
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Tambah User';
    document.getElementById('editMode').value = 'add';
    document.getElementById('originalNik').value = '';
    document.getElementById('userForm').reset();
    document.getElementById('userNik').disabled = false;
    clearPermissionCheckboxes();
    document.getElementById('userModal').classList.add('active');
}

// Edit user
function editUser(nik) {
    const user = allUsers.find(u => String(u.nik) === String(nik));
    if (!user) {
        console.error('User not found:', nik);
        return;
    }
    
    console.log('Editing user:', user);
    console.log('User permissions:', user.permissions);
    
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-edit"></i> Edit User';
    document.getElementById('editMode').value = 'edit';
    document.getElementById('originalNik').value = nik;
    document.getElementById('userNik').value = user.nik;
    document.getElementById('userNik').disabled = true;
    document.getElementById('userName2').value = user.name;
    document.getElementById('userPassword').value = user.password || '';
    document.getElementById('userRole').value = user.role || 'field';
    
    // Parse and set permissions
    let perms = parsePermissions(user.permissions);
    console.log('Parsed permissions:', perms);
    setPermissionCheckboxes(perms);
    
    document.getElementById('userModal').classList.add('active');
}

// Set permission checkboxes
function setPermissionCheckboxes(permissions) {
    clearPermissionCheckboxes();
    console.log('Setting checkboxes for:', permissions);
    
    if (!permissions || !Array.isArray(permissions)) {
        console.log('No permissions to set');
        return;
    }
    
    permissions.forEach(p => {
        const checkbox = document.querySelector(`input[name="permissions"][value="${p}"]`);
        if (checkbox) {
            checkbox.checked = true;
            console.log('Checked:', p);
        } else {
            console.log('Checkbox not found for:', p);
        }
    });
}

// Clear permission checkboxes
function clearPermissionCheckboxes() {
    document.querySelectorAll('input[name="permissions"]').forEach(cb => {
        cb.checked = false;
    });
}

// Get selected permissions
function getSelectedPermissions() {
    const permissions = [];
    document.querySelectorAll('input[name="permissions"]:checked').forEach(cb => {
        permissions.push(cb.value);
    });
    return permissions;
}

// On role change - set default permissions
function onRoleChange() {
    const role = document.getElementById('userRole').value;
    if (role && DEFAULT_PERMISSIONS[role]) {
        setPermissionCheckboxes(DEFAULT_PERMISSIONS[role]);
    }
}

// Close modal
function closeModal() {
    document.getElementById('userModal').classList.remove('active');
}

// Save user
async function saveUser(event) {
    event.preventDefault();
    
    const editMode = document.getElementById('editMode').value;
    const originalNik = document.getElementById('originalNik').value;
    const nik = document.getElementById('userNik').value.trim();
    const name = document.getElementById('userName2').value.trim();
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;
    const permissions = getSelectedPermissions();
    
    if (!nik || !name || !password || !role) {
        showToast('Mohon lengkapi semua field', 'error');
        return;
    }
    
    showLoading('Menyimpan...');
    
    try {
        let result;
        
        if (editMode === 'add') {
            result = await postRequest({
                action: 'addUser',
                user: { nik, name, password, role, permissions: permissions.join('|') }
            });
        } else {
            result = await postRequest({
                action: 'updateUser',
                nik: originalNik,
                user: { name, password, role, permissions: permissions.join('|') }
            });
        }
        
        hideLoading();
        
        if (result.success) {
            showToast(editMode === 'add' ? 'User berhasil ditambahkan' : 'User berhasil diupdate', 'success');
            closeModal();
            setTimeout(() => loadUsers(), 1000);
        } else {
            showToast(result.error || 'Gagal menyimpan', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Error: ' + error.message, 'error');
    }
}

// Delete user
async function deleteUser(nik, name) {
    const currentUser = auth.getUser();
    if (currentUser.nik === nik) {
        showToast('Tidak bisa menghapus akun sendiri', 'error');
        return;
    }
    
    if (!confirm(`Apakah Anda yakin ingin menghapus user "${name}" (${nik})?`)) {
        return;
    }
    
    showLoading('Menghapus...');
    
    try {
        const result = await postRequest({
            action: 'deleteUser',
            nik: nik
        });
        
        hideLoading();
        
        if (result.success) {
            showToast('User berhasil dihapus', 'success');
            setTimeout(() => loadUsers(), 1000);
        } else {
            showToast(result.error || 'Gagal menghapus', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Error: ' + error.message, 'error');
    }
}

// ==================== BULK UPLOAD ====================

function showBulkUploadModal() {
    document.getElementById('bulkModal').classList.add('active');
    document.getElementById('csvFile').value = '';
    document.getElementById('csvPaste').value = '';
    document.getElementById('csvPreviewContainer').style.display = 'none';
    parsedCSVData = [];
}

function closeBulkModal() {
    document.getElementById('bulkModal').classList.remove('active');
}

// Setup drag and drop
function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'));
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'));
    });
    
    dropZone.addEventListener('drop', handleDrop);
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        processCSVFile(files[0]);
    }
}

function handleCSVFile(event) {
    const file = event.target.files[0];
    if (file) {
        processCSVFile(file);
    }
}

function processCSVFile(file) {
    if (!file.name.endsWith('.csv')) {
        showToast('Mohon upload file CSV', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        parseCSVContent(content);
    };
    reader.readAsText(file);
}

function parseCSVFromTextarea() {
    const content = document.getElementById('csvPaste').value.trim();
    if (!content) {
        showToast('Mohon masukkan data CSV', 'error');
        return;
    }
    parseCSVContent(content);
}

function parseCSVContent(content) {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length === 0) {
        showToast('File CSV kosong', 'error');
        return;
    }
    
    // Check if first line is header
    const firstLine = lines[0].toLowerCase();
    let startIndex = 0;
    if (firstLine.includes('nik') && firstLine.includes('nama')) {
        startIndex = 1;
    }
    
    parsedCSVData = [];
    const existingNiks = allUsers.map(u => u.nik);
    
    for (let i = startIndex; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        
        if (parts.length >= 4) {
            const nik = parts[0].trim();
            const nama = parts[1].trim();
            const password = parts[2].trim();
            const role = parts[3].trim().toLowerCase();
            const permissions = parts[4] ? parts[4].trim() : '';
            
            let valid = true;
            let error = '';
            
            if (!nik) { valid = false; error = 'NIK kosong'; }
            else if (!nama) { valid = false; error = 'Nama kosong'; }
            else if (!password) { valid = false; error = 'Password kosong'; }
            else if (!['admin', 'manager', 'supervisor', 'field'].includes(role)) {
                valid = false; 
                error = 'Role tidak valid';
            }
            else if (existingNiks.includes(nik)) {
                valid = false;
                error = 'NIK sudah ada';
            }
            
            parsedCSVData.push({
                nik,
                nama,
                password,
                role,
                permissions: permissions || DEFAULT_PERMISSIONS[role]?.join('|') || 'records_viewer',
                valid,
                error
            });
        }
    }
    
    renderCSVPreview();
}

// Parse CSV line handling quoted strings
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    
    return result;
}

function renderCSVPreview() {
    const container = document.getElementById('csvPreviewContainer');
    const tbody = document.getElementById('csvPreviewBody');
    const validCount = parsedCSVData.filter(d => d.valid).length;
    
    document.getElementById('previewCount').textContent = parsedCSVData.length;
    document.getElementById('validCount').textContent = validCount;
    
    tbody.innerHTML = parsedCSVData.map(data => `
        <tr class="${data.valid ? 'valid' : 'invalid'}">
            <td>${data.valid ? '<i class="fas fa-check text-success"></i>' : '<i class="fas fa-times text-danger"></i> ' + data.error}</td>
            <td>${data.nik}</td>
            <td>${data.nama}</td>
            <td>${data.password}</td>
            <td>${data.role}</td>
            <td>${data.permissions}</td>
        </tr>
    `).join('');
    
    container.style.display = 'block';
    
    if (validCount === 0) {
        showToast('Tidak ada data valid untuk diupload', 'warning');
    }
}

async function uploadBulkUsers() {
    const validUsers = parsedCSVData.filter(d => d.valid);
    
    if (validUsers.length === 0) {
        showToast('Tidak ada data valid untuk diupload', 'error');
        return;
    }
    
    showLoading(`Mengupload ${validUsers.length} users...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const userData of validUsers) {
        try {
            await postRequest({
                action: 'addUser',
                user: {
                    nik: userData.nik,
                    name: userData.nama,
                    password: userData.password,
                    role: userData.role,
                    permissions: userData.permissions
                }
            });
            successCount++;
        } catch (error) {
            console.error('Error adding user:', userData.nik, error);
            failCount++;
        }
    }
    
    hideLoading();
    
    if (successCount > 0) {
        showToast(`Berhasil menambahkan ${successCount} user${failCount > 0 ? `, ${failCount} gagal` : ''}`, 'success');
        closeBulkModal();
        setTimeout(() => loadUsers(), 1000);
    } else {
        showToast('Gagal menambahkan user', 'error');
    }
}

// ==================== UTILITIES ====================

// Toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Loading functions
function showLoading(text = 'Memuat...') {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

// Global logout
function logout() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        auth.logout();
    }
}

// Close modal on outside click
document.getElementById('userModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

document.getElementById('bulkModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeBulkModal();
});
