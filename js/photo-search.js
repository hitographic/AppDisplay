// =====================================================
// Photo Search Functions for Google Drive
// Version 1.0
// =====================================================

// Helper: Get folder ID by name from main AppDisplay_Data folder
async function getFolderIdByName(folderName) {
    if (!isGoogleDriveConnected()) return null;
    
    try {
        const response = await gapi.client.drive.files.list({
            q: `'${CONFIG.GOOGLE_FOLDER_ID}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            pageSize: 1
        });
        
        if (response.result.files && response.result.files.length > 0) {
            // Folder found - ID hidden for security
            return response.result.files[0].id;
        }
    } catch (error) {
        console.error('Error getting folder:', error.message);
    }
    return null;
}

// Helper: Normalize filename for comparison - remove special chars, extensions, extra spaces
function normalizeFileName(name) {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/\.(jpg|jpeg|png|gif|webp|bmp)$/i, '')  // Remove extension
        .replace(/[\/\\]+/g, ' ')                         // Replace / and \ with space
        .replace(/\s+/g, '')                              // Remove ALL spaces
        .replace(/[\-_]+/g, '')                           // Remove dashes and underscores
        .trim();
}

// Helper: Search for file in Google Drive folder by name
async function searchFileInDriveFolder(folderName, fileName) {
    if (!isGoogleDriveConnected() || !fileName) return null;
    
    try {
        const folderId = await getFolderIdByName(folderName);
        if (!folderId) {
            console.log(`📁 Folder "${folderName}" not found`);
            return null;
        }
        
        const searchName = fileName.trim();
        console.log(`🔍 Searching for "${searchName}" in folder "${folderName}"...`);
        
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed=false and (mimeType contains 'image/')`,
            fields: 'files(id, name, webViewLink, thumbnailLink)',
            pageSize: 200
        });
        
        if (response.result.files && response.result.files.length > 0) {
            console.log(`📁 Found ${response.result.files.length} files in folder "${folderName}"`);
            
            // Normalize search name
            const normalizedSearch = normalizeFileName(searchName);
            console.log(`   Normalized search: "${normalizedSearch}"`);
            
            for (const file of response.result.files) {
                const normalizedFileName = normalizeFileName(file.name);
                
                // Debug: log first few files for comparison
                if (response.result.files.indexOf(file) < 5) {
                    console.log(`   File: "${file.name}" → normalized: "${normalizedFileName}"`);
                }
                
                // Try different matching strategies
                if (normalizedFileName === normalizedSearch) {
                    console.log(`✅ Exact match: "${file.name}"`);
                    return file;
                }
                
                // Partial match - search contains file or vice versa
                if (normalizedFileName.includes(normalizedSearch) ||
                    normalizedSearch.includes(normalizedFileName)) {
                    console.log(`✅ Partial match: "${file.name}"`);
                    return file;
                }
            }
            
            console.log(`❌ No matching file found for "${fileName}"`);
            console.log(`   Normalized search was: "${normalizedSearch}"`);
            // List all files for debugging
            console.log(`   Available files in folder:`);
            response.result.files.forEach(f => console.log(`      - ${f.name}`));
        } else {
            console.log(`📁 Folder "${folderName}" is empty or not accessible`);
        }
    } catch (error) {
        console.error('Error searching file in Drive:', error);
    }
    return null;
}

// Override loadPhotoFromMaster to use Drive API search
const originalLoadPhotoFromMaster = window.loadPhotoFromMaster;

window.loadPhotoFromMaster = async function(type, kodeValue) {
    const field = PHOTO_FIELD_MAP[type];
    const folderName = PHOTO_FOLDER_MAP[type];
    
    console.log(`🔍 Looking for photo: type=${type}, kode=${kodeValue}, folder=${folderName}`);
    
    try {
        // Use searchFileInDriveFolder to find photo
        if (isGoogleDriveConnected()) {
            const matchingFile = await searchFileInDriveFolder(folderName, kodeValue);
            
            if (matchingFile) {
                console.log('✅ Found matching photo:', matchingFile.name);
                
                // Get thumbnail URL
                const thumbnailUrl = `https://drive.google.com/thumbnail?id=${matchingFile.id}&sz=w400`;
                
                // Update preview
                const previewContainer = document.getElementById(`preview-${type}`);
                if (previewContainer) {
                    previewContainer.innerHTML = `<img src="${thumbnailUrl}" alt="${kodeValue}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-image\\'></i><p>Gagal memuat foto</p>'">`;
                }
                
                // Update status
                const statusEl = document.getElementById(`status-${type}`);
                if (statusEl) {
                    statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Terupload';
                    statusEl.classList.add('uploaded');
                }
                
                // Enable preview button
                const previewBtn = document.getElementById(`btn-preview-${type}`);
                if (previewBtn) {
                    previewBtn.disabled = false;
                }
                
                // Store photo URL
                uploadedPhotos[type] = matchingFile.webViewLink || thumbnailUrl;
                
                showToast(`Foto "${kodeValue}" ditemukan`, 'success');
                return;
            }
        }
        
        // If no photo found, just show message
        showToast(`Kode "${kodeValue}" dipilih (belum ada foto)`, 'info');
        
    } catch (error) {
        console.error('Error loading photo from master:', error);
        showToast(`Kode "${kodeValue}" dipilih`, 'success');
    }
};

console.log('✅ Photo search module loaded (v1.2)');
