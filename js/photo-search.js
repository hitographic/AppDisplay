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
            console.log(`📁 Found folder "${folderName}" with ID: ${response.result.files[0].id}`);
            return response.result.files[0].id;
        }
    } catch (error) {
        console.error('Error getting folder ID:', error);
    }
    return null;
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
            pageSize: 100
        });
        
        if (response.result.files && response.result.files.length > 0) {
            console.log(`📁 Found ${response.result.files.length} files in folder "${folderName}"`);
            
            // Normalize search name - handle special chars like /
            const normalizedSearch = searchName.toLowerCase()
                .replace(/[\/\\\s]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            for (const file of response.result.files) {
                const normalizedFileName = file.name.toLowerCase()
                    .replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')
                    .replace(/[\/\\\s]+/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                // Try different matching strategies
                if (normalizedFileName === normalizedSearch || 
                    normalizedFileName.includes(normalizedSearch) ||
                    normalizedSearch.includes(normalizedFileName)) {
                    console.log(`✅ Found matching file: "${file.name}"`);
                    return file;
                }
            }
            
            console.log(`❌ No matching file found for "${fileName}"`);
            console.log(`   Searched: "${normalizedSearch}"`);
        } else {
            console.log(`📁 Folder "${folderName}" is empty`);
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

console.log('✅ Photo search module loaded (v1.0)');
