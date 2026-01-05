// =====================================================
// VALID DISPLAY - User Management Script
// =====================================================

let allUsers = [];
const webAppUrl = CONFIG.GOOGLE_SHEETS_WEBAPP_URL || '';

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!auth.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    // Check if admin
    if (!isAdmin()) {
        alert('Anda tidak memiliki akses ke halaman ini');
        window.location.href = 'records.html';
        return;
    }

    // Set user name
    const user = auth.getUser();
    document.getElementById('userName').textContent = user.name;

    // Load users
    loadUsers();
});

// JSONP request
function jsonpRequest(url) {
    return new Promise((resolve, reject) => {
        const callbackName = 'usersCallback_' + Date.now();
        const timeoutId = setTimeout(() => {
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
            reject(new Error('Request timeout - pastikan Apps Script sudah di-deploy'));
        }, 10000); // 10 detik timeout

        window[callbackName] = (data) => {
            clearTimeout(timeoutId);
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
            resolve(data);
        };

        const script = document.createElement('script');
        script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
        script.onerror = () => {
            clearTimeout(timeoutId);
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
            reject(new Error('Gagal memuat data dari server'));
        };
        document.head.appendChild(script);
    });
}

// POST request via form
function postRequest(data) {
    return new Promise((resolve, reject) => {
        const callbackName = 'usersPostCallback_' + Date.now();
        
        const iframe = document.createElement('iframe');
        iframe.name = 'postFrame_' + Date.now();
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = webAppUrl;
        form.target = iframe.name;
        form.style.display = 'none';

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'data';
        input.value = JSON.stringify({
            ...data,
            callback: callbackName
        });
        form.appendChild(input);

        document.body.appendChild(form);
        
        const messageHandler = (event) => {
            try {
                const response = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                if (response.callbackName === callbackName) {
                    window.removeEventListener('message', messageHandler);
                    document.body.removeChild(iframe);
                    document.body.removeChild(form);
                    resolve(response);
                }
            } catch (e) {}
        };
        window.addEventListener('message', messageHandler);

        form.submit();

        // Timeout fallback
        setTimeout(() => {
            window.removeEventListener('message', messageHandler);
            if (iframe.parentNode) document.body.removeChild(iframe);
            if (form.parentNode) document.body.removeChild(form);
            resolve({ success: true, message: 'Request sent' });
        }, 5000);
    });
}

// Load all users
async function loadUsers() {
    showLoading('Memuat data user...');
    
    try {
        const result = await jsonpRequest(`${webAppUrl}?action=getUsers`);
        
        hideLoading();
        
        if (result.success) {
            allUsers = result.users || [];
            renderUsersTable();
        } else {
            showToast('Gagal memuat data user: ' + (result.error || ''), 'error');
            renderEmptyState();
        }
    } catch (error) {
        hideLoading();
        console.error('Error loading users:', error);
        showToast('Error: ' + error.message, 'error');
        // Fallback: tampilkan user dari config lokal
        allUsers = CONFIG.USERS.map(u => ({
            nik: u.nik,
            password: u.password,
            name: u.name,
            role: u.role
        }));
        renderUsersTable();
        showToast('Menampilkan data lokal (Google Sheets tidak tersedia)', 'warning');
    }
}

// Render users table
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    
    if (allUsers.length === 0) {
        renderEmptyState();
        return;
    }
    
    tbody.innerHTML = allUsers.map(user => `
        <tr>
            <td><strong>${user.nik}</strong></td>
            <td>${user.name}</td>
            <td>
                <span class="role-badge role-${user.role}">
                    ${user.role === 'admin' ? '👑 Admin' : '👁️ Viewer'}
                </span>
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
    `).join('');
}

// Render empty state
function renderEmptyState() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="empty-state">
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
    document.getElementById('userModal').classList.add('active');
}

// Edit user
function editUser(nik) {
    const user = allUsers.find(u => u.nik == nik);
    if (!user) return;
    
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-edit"></i> Edit User';
    document.getElementById('editMode').value = 'edit';
    document.getElementById('originalNik').value = nik;
    document.getElementById('userNik').value = user.nik;
    document.getElementById('userNik').disabled = true; // NIK tidak bisa diubah
    document.getElementById('userName2').value = user.name;
    document.getElementById('userPassword').value = user.password;
    document.getElementById('userRole').value = user.role;
    document.getElementById('userModal').classList.add('active');
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
    
    if (!nik || !name || !password) {
        showToast('Mohon lengkapi semua field', 'error');
        return;
    }
    
    showLoading('Menyimpan...');
    
    try {
        let result;
        
        if (editMode === 'add') {
            result = await postRequest({
                action: 'addUser',
                user: { nik, name, password, role }
            });
        } else {
            result = await postRequest({
                action: 'updateUser',
                nik: originalNik,
                user: { name, password, role }
            });
        }
        
        hideLoading();
        
        if (result.success) {
            showToast(editMode === 'add' ? 'User berhasil ditambahkan' : 'User berhasil diupdate', 'success');
            closeModal();
            // Reload after short delay
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
    // Prevent deleting yourself
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
document.getElementById('userModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});
