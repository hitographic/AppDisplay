// =====================================================
// Popup Autocomplete for Add Data Form
// Fixed: Now using correct field names from Code.gs
// negara = country, flavor = flavor
// =====================================================

// Global popup state (avoid redeclaration across scripts)
const popupState = window.popupState || (window.popupState = {
    masterData: [],
    selectedNegara: ''
});

// Load master data for popup autocomplete
async function loadMasterDataForPopup() {
    try {
        console.log('📋 Loading master data for popup...');
        const response = await fetch(CONFIG.GOOGLE_SHEETS_WEBAPP_URL + '?action=getMaster');
        const result = await response.json();
        
        if (result.success && result.data) {
            popupState.masterData = result.data;
            console.log('✅ Loaded', popupState.masterData.length, 'master records for popup');
            console.log('📋 Sample data:', popupState.masterData[0]);
        }
    } catch (error) {
        console.error('❌ Failed to load master data for popup:', error);
        popupState.masterData = [];
    }
}

// Initialize autocomplete for Add Data popup
function initPopupAutocomplete() {
    var negaraInput = document.getElementById('inputNegara');
    var flavorInput = document.getElementById('inputFlavor');
    
    if (!negaraInput || !flavorInput) {
        console.log('❌ Input elements not found');
        return;
    }
    
    console.log('🔧 Initializing popup autocomplete...');
    
    // Remove existing listeners by cloning
    var newNegaraInput = negaraInput.cloneNode(true);
    var newFlavorInput = flavorInput.cloneNode(true);
    negaraInput.parentNode.replaceChild(newNegaraInput, negaraInput);
    flavorInput.parentNode.replaceChild(newFlavorInput, flavorInput);
    
    // Negara autocomplete
    newNegaraInput.addEventListener('input', function(e) {
        handleNegaraAutocomplete(e.target.value);
    });
    
    newNegaraInput.addEventListener('focus', function(e) {
        handleNegaraAutocomplete(e.target.value);
    });
    
    newNegaraInput.addEventListener('blur', function() {
        setTimeout(function() {
            var dd = document.getElementById('popupNegaraDropdown');
            if (dd) dd.classList.add('hidden');
        }, 200);
    });
    
    // Flavor autocomplete
    newFlavorInput.addEventListener('input', function(e) {
        handleFlavorAutocomplete(e.target.value);
    });
    
    newFlavorInput.addEventListener('focus', function(e) {
        if (!popupState.selectedNegara) {
            showToast('Pilih negara terlebih dahulu', 'warning');
            document.getElementById('inputNegara').focus();
            return;
        }
        handleFlavorAutocomplete(e.target.value);
    });
    
    newFlavorInput.addEventListener('blur', function() {
        setTimeout(function() {
            var dd = document.getElementById('popupFlavorDropdown');
            if (dd) dd.classList.add('hidden');
        }, 200);
    });
    
    console.log('✅ Popup autocomplete initialized');
}

// Handle Negara autocomplete - USE 'negara' FIELD (correct after Code.gs fix)
function handleNegaraAutocomplete(query) {
    var dropdown = document.getElementById('popupNegaraDropdown');
    if (!dropdown) {
        console.log('❌ Dropdown popupNegaraDropdown not found');
        return;
    }
    
    console.log('🔍 handleNegaraAutocomplete called with:', query);
    console.log('📋 masterDataForPopup length:', popupState.masterData.length);
    
    // Get unique NEGARA values from 'negara' field
    var negaraSet = {};
    popupState.masterData.forEach(function(m) {
        if (m.negara) negaraSet[m.negara] = true;
    });
    var negaraList = Object.keys(negaraSet).sort();
    
    console.log('📋 Unique negara count:', negaraList.length);
    
    var lowerQuery = query.toLowerCase().trim();
    var filtered = negaraList;
    if (lowerQuery.length > 0) {
        filtered = negaraList.filter(function(n) {
            return n.toLowerCase().indexOf(lowerQuery) !== -1;
        });
    }
    
    console.log('📋 Filtered results:', filtered.length);
    
    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-item" style="color: var(--gray-500); font-style: italic;">Tidak ditemukan</div>';
    } else {
        dropdown.innerHTML = filtered.slice(0, 15).map(function(negara) {
            var displayHtml = escapeHtmlPopup(negara);
            if (lowerQuery.length > 0) {
                var idx = negara.toLowerCase().indexOf(lowerQuery);
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
    
    dropdown.querySelectorAll('.autocomplete-item[data-value]').forEach(function(item) {
        item.addEventListener('mousedown', function(e) {
            e.preventDefault();
            var value = item.dataset.value;
            document.getElementById('inputNegara').value = value;
            popupState.selectedNegara = value;
            dropdown.classList.add('hidden');
            
            var flavorInput = document.getElementById('inputFlavor');
            flavorInput.value = '';
            flavorInput.placeholder = 'Ketik flavor untuk ' + value + '...';
            flavorInput.focus();
            
            showToast('Negara "' + value + '" dipilih', 'success');
        });
    });
}

// Handle Flavor autocomplete - USE 'flavor' FIELD (correct after Code.gs fix)
function handleFlavorAutocomplete(query) {
    var dropdown = document.getElementById('popupFlavorDropdown');
    if (!dropdown) return;
    
    if (!popupState.selectedNegara) {
        dropdown.innerHTML = '<div class="autocomplete-item" style="color: var(--warning-color); font-style: italic;">Pilih negara terlebih dahulu</div>';
        dropdown.classList.remove('hidden');
        return;
    }
    
    // Get flavors for selected negara
    var flavorsForNegara = popupState.masterData
        .filter(function(m) {
            return m.negara && m.negara.toLowerCase() === popupState.selectedNegara.toLowerCase();
        })
        .map(function(m) {
            return m.flavor;
        })
        .filter(Boolean);
    
    // Remove duplicates
    var flavorSet = {};
    flavorsForNegara.forEach(function(f) {
        flavorSet[f] = true;
    });
    var uniqueFlavors = Object.keys(flavorSet).sort();
    
    var lowerQuery = query.toLowerCase().trim();
    var filtered = uniqueFlavors;
    if (lowerQuery.length > 0) {
        filtered = uniqueFlavors.filter(function(f) {
            return f.toLowerCase().indexOf(lowerQuery) !== -1;
        });
    }
    
    if (filtered.length === 0) {
    var msg = uniqueFlavors.length === 0 ? 'Tidak ada flavor untuk ' + popupState.selectedNegara : 'Tidak ditemukan';
        dropdown.innerHTML = '<div class="autocomplete-item" style="color: var(--gray-500); font-style: italic;">' + msg + '</div>';
    } else {
        dropdown.innerHTML = filtered.slice(0, 15).map(function(flavor) {
            var displayHtml = escapeHtmlPopup(flavor);
            if (lowerQuery.length > 0) {
                var idx = flavor.toLowerCase().indexOf(lowerQuery);
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
    
    dropdown.querySelectorAll('.autocomplete-item[data-value]').forEach(function(item) {
        item.addEventListener('mousedown', function(e) {
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
    
    popupState.selectedNegara = '';
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
    
    popupState.selectedNegara = '';
    var flavorInput = document.getElementById('inputFlavor');
    if (flavorInput) flavorInput.placeholder = 'Pilih negara dulu, lalu ketik flavor...';
    
    var negaraDropdown = document.getElementById('popupNegaraDropdown');
    var flavorDropdown = document.getElementById('popupFlavorDropdown');
    if (negaraDropdown) negaraDropdown.classList.add('hidden');
    if (flavorDropdown) flavorDropdown.classList.add('hidden');
};

console.log('✅ Popup autocomplete module loaded (v2.7 - using correct field names)');
