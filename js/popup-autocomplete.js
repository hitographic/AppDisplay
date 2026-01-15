// =====================================================
// Popup Autocomplete for Add Data Form
// =====================================================

// Load master data for popup autocomplete
async function loadMasterDataForPopup() {
    try {
        console.log('📋 Loading master data for popup...');
        const response = await fetch(`${CONFIG.GOOGLE_SHEETS_WEBAPP_URL}?action=getMaster`);
        const result = await response.json();
        
        if (result.success && result.data) {
            masterDataForPopup = result.data;
            console.log('✅ Loaded', masterDataForPopup.length, 'master records for popup');
        }
    } catch (error) {
        console.error('❌ Failed to load master data for popup:', error);
        masterDataForPopup = [];
    }
}

// Initialize autocomplete for Add Data popup
function initPopupAutocomplete() {
    const negaraInput = document.getElementById('inputNegara');
    const flavorInput = document.getElementById('inputFlavor');
    
    if (!negaraInput || !flavorInput) return;
    
    // Remove existing listeners by cloning
    const newNegaraInput = negaraInput.cloneNode(true);
    const newFlavorInput = flavorInput.cloneNode(true);
    negaraInput.parentNode.replaceChild(newNegaraInput, negaraInput);
    flavorInput.parentNode.replaceChild(newFlavorInput, flavorInput);
    
    // Negara autocomplete
    newNegaraInput.addEventListener('input', (e) => {
        handleNegaraAutocomplete(e.target.value);
    });
    
    newNegaraInput.addEventListener('focus', (e) => {
        handleNegaraAutocomplete(e.target.value);
    });
    
    newNegaraInput.addEventListener('blur', () => {
        setTimeout(() => {
            const dd = document.getElementById('negaraDropdown');
            if (dd) dd.classList.add('hidden');
        }, 200);
    });
    
    // Flavor autocomplete
    newFlavorInput.addEventListener('input', (e) => {
        handleFlavorAutocomplete(e.target.value);
    });
    
    newFlavorInput.addEventListener('focus', (e) => {
        if (!selectedNegaraForPopup) {
            showToast('Pilih negara terlebih dahulu', 'warning');
            document.getElementById('inputNegara').focus();
            return;
        }
        handleFlavorAutocomplete(e.target.value);
    });
    
    newFlavorInput.addEventListener('blur', () => {
        setTimeout(() => {
            const dd = document.getElementById('flavorDropdown');
            if (dd) dd.classList.add('hidden');
        }, 200);
    });
}

// Handle Negara autocomplete
function handleNegaraAutocomplete(query) {
    const dropdown = document.getElementById('negaraDropdown');
    if (!dropdown) return;
    
    const negaraList = [...new Set(masterDataForPopup.map(m => m.negara).filter(Boolean))];
    
    const lowerQuery = query.toLowerCase().trim();
    let filtered = negaraList;
    if (lowerQuery.length > 0) {
        filtered = negaraList.filter(n => n.toLowerCase().includes(lowerQuery));
    }
    
    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-item" style="color: var(--gray-500); font-style: italic;">Tidak ditemukan</div>';
    } else {
        dropdown.innerHTML = filtered.slice(0, 10).map(negara => {
            let displayHtml = escapeHtmlPopup(negara);
            if (lowerQuery.length > 0) {
                const idx = negara.toLowerCase().indexOf(lowerQuery);
                if (idx !== -1) {
                    displayHtml = escapeHtmlPopup(negara.substring(0, idx)) + 
                        '<span class="match">' + escapeHtmlPopup(negara.substring(idx, idx + lowerQuery.length)) + '</span>' +
                        escapeHtmlPopup(negara.substring(idx + lowerQuery.length));
                }
            }
            return '<div class="autocomplete-item" data-value="' + escapeHtmlPopup(negara) + '">' + displayHtml + '</div>';
        }).join('');
    }
    
    dropdown.classList.remove('hidden');
    
    dropdown.querySelectorAll('.autocomplete-item[data-value]').forEach(item => {
        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const value = item.dataset.value;
            document.getElementById('inputNegara').value = value;
            selectedNegaraForPopup = value;
            dropdown.classList.add('hidden');
            
            const flavorInput = document.getElementById('inputFlavor');
            flavorInput.value = '';
            flavorInput.placeholder = 'Ketik flavor untuk ' + value + '...';
            flavorInput.focus();
            
            showToast('Negara "' + value + '" dipilih', 'success');
        });
    });
}

// Handle Flavor autocomplete
function handleFlavorAutocomplete(query) {
    const dropdown = document.getElementById('flavorDropdown');
    if (!dropdown) return;
    
    if (!selectedNegaraForPopup) {
        dropdown.innerHTML = '<div class="autocomplete-item" style="color: var(--warning-color); font-style: italic;">Pilih negara terlebih dahulu</div>';
        dropdown.classList.remove('hidden');
        return;
    }
    
    const flavorsForNegara = masterDataForPopup
        .filter(m => m.negara && m.negara.toLowerCase() === selectedNegaraForPopup.toLowerCase())
        .map(m => m.flavor)
        .filter(Boolean);
    
    const uniqueFlavors = [...new Set(flavorsForNegara)];
    
    const lowerQuery = query.toLowerCase().trim();
    let filtered = uniqueFlavors;
    if (lowerQuery.length > 0) {
        filtered = uniqueFlavors.filter(f => f.toLowerCase().includes(lowerQuery));
    }
    
    if (filtered.length === 0) {
        const msg = uniqueFlavors.length === 0 ? 'Tidak ada flavor untuk ' + selectedNegaraForPopup : 'Tidak ditemukan';
        dropdown.innerHTML = '<div class="autocomplete-item" style="color: var(--gray-500); font-style: italic;">' + msg + '</div>';
    } else {
        dropdown.innerHTML = filtered.slice(0, 10).map(flavor => {
            let displayHtml = escapeHtmlPopup(flavor);
            if (lowerQuery.length > 0) {
                const idx = flavor.toLowerCase().indexOf(lowerQuery);
                if (idx !== -1) {
                    displayHtml = escapeHtmlPopup(flavor.substring(0, idx)) + 
                        '<span class="match">' + escapeHtmlPopup(flavor.substring(idx, idx + lowerQuery.length)) + '</span>' +
                        escapeHtmlPopup(flavor.substring(idx + lowerQuery.length));
                }
            }
            return '<div class="autocomplete-item" data-value="' + escapeHtmlPopup(flavor) + '">' + displayHtml + '</div>';
        }).join('');
    }
    
    dropdown.classList.remove('hidden');
    
    dropdown.querySelectorAll('.autocomplete-item[data-value]').forEach(item => {
        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.getElementById('inputFlavor').value = item.dataset.value;
            dropdown.classList.add('hidden');
        });
    });
}

function escapeHtmlPopup(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Override openAddDataPopup
window.openAddDataPopup = async function() {
    if (!canEdit()) {
        showToast('Anda tidak memiliki akses untuk menambah data', 'error');
        return;
    }
    
    var popup = document.getElementById('addDataPopup');
    popup.classList.remove('hidden');
    document.getElementById('inputTanggal').value = new Date().toISOString().split('T')[0];
    
    selectedNegaraForPopup = '';
    var flavorInput = document.getElementById('inputFlavor');
    if (flavorInput) flavorInput.placeholder = 'Pilih negara dulu, lalu ketik flavor...';
    
    await loadMasterDataForPopup();
    initPopupAutocomplete();
};

// Override closeAddDataPopup
window.closeAddDataPopup = function() {
    var popup = document.getElementById('addDataPopup');
    popup.classList.add('hidden');
    document.getElementById('addDataForm').reset();
    
    selectedNegaraForPopup = '';
    var flavorInput = document.getElementById('inputFlavor');
    if (flavorInput) flavorInput.placeholder = 'Pilih negara dulu, lalu ketik flavor...';
    
    var negaraDropdown = document.getElementById('negaraDropdown');
    var flavorDropdown = document.getElementById('flavorDropdown');
    if (negaraDropdown) negaraDropdown.classList.add('hidden');
    if (flavorDropdown) flavorDropdown.classList.add('hidden');
};

console.log('✅ Popup autocomplete module loaded');
