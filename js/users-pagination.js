// ================================================
// USERS PAGINATION & SEARCH FUNCTIONALITY
// ================================================

// Pagination state
let currentPage = 1;
let itemsPerPage = 10;
let filteredUsers = [];
let selectedUsers = new Set();

// Search and filter users
function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const roleFilter = document.getElementById('roleFilter').value;
    const permFilter = document.getElementById('permissionFilter').value;
    
    filteredUsers = allUsers.filter(user => {
        // Search filter
        const matchesSearch = !searchTerm || 
            user.nik.toLowerCase().includes(searchTerm) ||
            user.name.toLowerCase().includes(searchTerm) ||
            user.role.toLowerCase().includes(searchTerm);
        
        // Role filter
        const matchesRole = !roleFilter || user.role === roleFilter;
        
        // Permission filter
        const matchesPermission = !permFilter || (user.permissions && user.permissions.includes(permFilter));
        
        return matchesSearch && matchesRole && matchesPermission;
    });
    
    // Reset to page 1 when searching
    currentPage = 1;
    clearSelection();
    renderUsersTable();
    updatePagination();
}

// Change page size
function changePageSize() {
    itemsPerPage = parseInt(document.getElementById('perPageSelect').value);
    currentPage = 1;
    renderUsersTable();
    updatePagination();
}

// Go to specific page
function goToPage(page) {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderUsersTable();
    updatePagination();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update pagination UI
function updatePagination() {
    const totalItems = filteredUsers.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    
    // Update info
    document.getElementById('showingStart').textContent = totalItems > 0 ? start : 0;
    document.getElementById('showingEnd').textContent = end;
    document.getElementById('totalUsers').textContent = totalItems;
    
    // Build pagination controls
    const controls = document.getElementById('paginationControls');
    controls.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevBtn = createPageButton('‹ Prev', currentPage - 1, currentPage === 1);
    controls.appendChild(prevBtn);
    
    // Page numbers
    const maxButtons = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    if (startPage > 1) {
        controls.appendChild(createPageButton(1, 1));
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '8px 12px';
            controls.appendChild(ellipsis);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        controls.appendChild(createPageButton(i, i, false, i === currentPage));
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '8px 12px';
            controls.appendChild(ellipsis);
        }
        controls.appendChild(createPageButton(totalPages, totalPages));
    }
    
    // Next button
    const nextBtn = createPageButton('Next ›', currentPage + 1, currentPage === totalPages);
    controls.appendChild(nextBtn);
}

// Create pagination button
function createPageButton(label, page, disabled = false, active = false) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (active ? ' active' : '');
    btn.textContent = label;
    btn.disabled = disabled;
    btn.onclick = () => goToPage(page);
    return btn;
}

// Toggle select all checkbox
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.user-row-checkbox');
    
    checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
        const nik = cb.dataset.nik;
        if (selectAll.checked) {
            selectedUsers.add(nik);
        } else {
            selectedUsers.delete(nik);
        }
    });
    
    updateBulkActionsBar();
}

// Toggle individual user selection
function toggleUserSelection(checkbox) {
    const nik = checkbox.dataset.nik;
    
    if (checkbox.checked) {
        selectedUsers.add(nik);
    } else {
        selectedUsers.delete(nik);
        document.getElementById('selectAll').checked = false;
    }
    
    updateBulkActionsBar();
}

// Update bulk actions bar
function updateBulkActionsBar() {
    const bar = document.getElementById('bulkActionsBar');
    const count = selectedUsers.size;
    
    if (count > 0) {
        bar.classList.add('active');
        document.getElementById('selectedCount').textContent = count;
    } else {
        bar.classList.remove('active');
    }
}

// Clear selection
function clearSelection() {
    selectedUsers.clear();
    document.getElementById('selectAll').checked = false;
    document.querySelectorAll('.user-row-checkbox').forEach(cb => cb.checked = false);
    updateBulkActionsBar();
}

// Bulk edit permissions
function bulkEditPermissions() {
    if (selectedUsers.size === 0) {
        showToast('Pilih minimal 1 user', 'error');
        return;
    }
    
    // Reset checkboxes
    document.getElementById('bulkPermUserAdmin').checked = false;
    document.getElementById('bulkPermViewer').checked = false;
    document.getElementById('bulkPermEditor').checked = false;
    document.getElementById('bulkPermValidator').checked = false;
    
    // Update count
    document.getElementById('bulkEditCount').textContent = selectedUsers.size;
    
    // Show modal
    document.getElementById('bulkEditModal').classList.add('active');
}

// Close bulk edit modal
function closeBulkEditModal() {
    document.getElementById('bulkEditModal').classList.remove('active');
}

// Save bulk permissions
async function saveBulkPermissions() {
    const permissions = [];
    
    if (document.getElementById('bulkPermUserAdmin').checked) permissions.push('user_admin');
    if (document.getElementById('bulkPermViewer').checked) permissions.push('records_viewer');
    if (document.getElementById('bulkPermEditor').checked) permissions.push('records_editor');
    if (document.getElementById('bulkPermValidator').checked) permissions.push('records_validator');
    
    if (permissions.length === 0) {
        showToast('Pilih minimal 1 permission', 'error');
        return;
    }
    
    const permissionsString = permissions.join('|');
    
    showLoading('Mengupdate permissions...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const nik of selectedUsers) {
        try {
            const user = allUsers.find(u => String(u.nik) === String(nik));
            if (!user) continue;
            
            const result = await postRequest({
                action: 'updateUser',
                nik: nik,
                user: {
                    name: user.name,
                    password: user.password,
                    role: user.role,
                    permissions: permissionsString
                }
            });
            
            if (result.success) {
                successCount++;
                // Update local data
                user.permissions = permissionsString;
            } else {
                errorCount++;
            }
        } catch (error) {
            console.error('Error updating user:', nik, error);
            errorCount++;
        }
    }
    
    hideLoading();
    closeBulkEditModal();
    clearSelection();
    
    if (successCount > 0) {
        showToast(`${successCount} user berhasil diupdate`, 'success');
        renderUsersTable();
    }
    
    if (errorCount > 0) {
        showToast(`${errorCount} user gagal diupdate`, 'error');
    }
}

// Bulk delete users
async function bulkDeleteUsers() {
    if (selectedUsers.size === 0) {
        showToast('Pilih minimal 1 user', 'error');
        return;
    }
    
    if (!confirm(`Hapus ${selectedUsers.size} user yang dipilih?\n\nTindakan ini tidak dapat dibatalkan!`)) {
        return;
    }
    
    showLoading('Menghapus users...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const nik of selectedUsers) {
        try {
            const result = await postRequest({
                action: 'deleteUser',
                nik: nik
            });
            
            if (result.success) {
                successCount++;
                // Remove from local array
                const index = allUsers.findIndex(u => String(u.nik) === String(nik));
                if (index > -1) {
                    allUsers.splice(index, 1);
                }
            } else {
                errorCount++;
            }
        } catch (error) {
            console.error('Error deleting user:', nik, error);
            errorCount++;
        }
    }
    
    hideLoading();
    clearSelection();
    
    if (successCount > 0) {
        showToast(`${successCount} user berhasil dihapus`, 'success');
        handleSearch(); // Refresh filtered list
    }
    
    if (errorCount > 0) {
        showToast(`${errorCount} user gagal dihapus`, 'error');
    }
}
