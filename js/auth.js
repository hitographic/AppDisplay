// =====================================================
// VALID DISPLAY - Authentication Module
// Supports Google Sheets User Database
// =====================================================

class Auth {
    constructor() {
        this.currentUser = null;
        this.isGoogleLoaded = false;
        this.tokenClient = null;
        this.webAppUrl = CONFIG.GOOGLE_SHEETS_WEBAPP_URL || '';
    }

    // Check if user is logged in
    isLoggedIn() {
        const user = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        if (user) {
            this.currentUser = JSON.parse(user);
            return true;
        }
        return false;
    }

    // JSONP request untuk bypass CORS
    jsonpRequest(url) {
        return new Promise((resolve, reject) => {
            const callbackName = 'authCallback_' + Date.now();
            const timeoutId = setTimeout(() => {
                delete window[callbackName];
                if (script.parentNode) script.parentNode.removeChild(script);
                reject(new Error('Request timeout'));
            }, 15000);

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
                reject(new Error('Script load error'));
            };
            document.head.appendChild(script);
        });
    }

    // Login with NIK and Password - try Google Sheets first, fallback to config
    async login(nik, password) {
        // Try Google Sheets login first
        if (this.webAppUrl && this.webAppUrl !== 'YOUR_WEBAPP_URL') {
            try {
                const result = await this.jsonpRequest(
                    `${this.webAppUrl}?action=login&nik=${encodeURIComponent(nik)}&password=${encodeURIComponent(password)}`
                );
                
                if (result.success && result.user) {
                    // Parse permissions
                    let permissions = [];
                    if (result.user.permissions) {
                        if (Array.isArray(result.user.permissions)) {
                            permissions = result.user.permissions;
                        } else if (typeof result.user.permissions === 'string') {
                            permissions = result.user.permissions.split('|').map(p => p.trim()).filter(p => p);
                        }
                    }
                    
                    this.currentUser = {
                        nik: result.user.nik,
                        name: result.user.name,
                        role: result.user.role || 'field',
                        permissions: permissions,
                        loginTime: new Date().toISOString()
                    };
                    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
                    return { success: true, user: this.currentUser };
                } else {
                    return { success: false, message: result.error || 'NIK atau Password salah!' };
                }
            } catch (error) {
                console.warn('Google Sheets login failed, trying local:', error);
            }
        }
        
        // Fallback to local config
        const user = CONFIG.USERS.find(u => u.nik === nik && u.password === password);
        if (user) {
            // Parse permissions from local config
            let permissions = user.permissions || [];
            if (typeof permissions === 'string') {
                permissions = permissions.split('|').map(p => p.trim()).filter(p => p);
            }
            
            this.currentUser = {
                nik: user.nik,
                name: user.name,
                role: user.role || 'field',
                permissions: permissions,
                loginTime: new Date().toISOString()
            };
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
            return { success: true, user: this.currentUser };
        }
        return { success: false, message: 'NIK atau Password salah!' };
    }

    // Logout
    logout() {
        this.currentUser = null;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.GOOGLE_TOKEN);
        // Navigate to root (login page)
        const basePath = window.location.pathname.includes('/AppDisplay') ? '/AppDisplay/' : '/';
        window.location.href = basePath;
    }

    // Get current user
    getUser() {
        if (!this.currentUser) {
            const user = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
            if (user) {
                this.currentUser = JSON.parse(user);
            }
        }
        return this.currentUser;
    }

    // Initialize Google API
    async initGoogleAPI() {
        return new Promise((resolve, reject) => {
            // Load Google API script
            if (!document.getElementById('google-api-script')) {
                const script = document.createElement('script');
                script.id = 'google-api-script';
                script.src = 'https://apis.google.com/js/api.js';
                script.onload = () => {
                    gapi.load('client', async () => {
                        try {
                            await gapi.client.init({
                                apiKey: CONFIG.GOOGLE_API_KEY,
                                discoveryDocs: CONFIG.DISCOVERY_DOCS,
                            });
                            this.isGoogleLoaded = true;
                            resolve(true);
                        } catch (error) {
                            console.error('Error initializing GAPI client:', error);
                            reject(error);
                        }
                    });
                };
                script.onerror = reject;
                document.head.appendChild(script);
            } else {
                resolve(this.isGoogleLoaded);
            }
        });
    }

    // Initialize Google Identity Services
    async initGoogleIdentity() {
        return new Promise((resolve, reject) => {
            if (!document.getElementById('google-gsi-script')) {
                const script = document.createElement('script');
                script.id = 'google-gsi-script';
                script.src = 'https://accounts.google.com/gsi/client';
                script.onload = () => {
                    this.tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: CONFIG.GOOGLE_CLIENT_ID,
                        scope: CONFIG.SCOPES,
                        callback: (response) => {
                            if (response.access_token) {
                                localStorage.setItem(CONFIG.STORAGE_KEYS.GOOGLE_TOKEN, response.access_token);
                                window.dispatchEvent(new CustomEvent('googleTokenReceived', { detail: response }));
                            }
                        },
                    });
                    resolve(true);
                };
                script.onerror = reject;
                document.head.appendChild(script);
            } else {
                resolve(true);
            }
        });
    }

    // Request Google Access Token
    requestAccessToken() {
        if (this.tokenClient) {
            this.tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            console.error('Token client not initialized');
        }
    }

    // Request Google Token (alias for requestAccessToken with Promise)
    async requestGoogleToken() {
        return new Promise((resolve, reject) => {
            if (!this.tokenClient) {
                reject(new Error('Token client not initialized. Please wait for Google API to load.'));
                return;
            }
            
            // Set up one-time listener for token
            const tokenHandler = (event) => {
                window.removeEventListener('googleTokenReceived', tokenHandler);
                resolve(event.detail);
            };
            window.addEventListener('googleTokenReceived', tokenHandler);
            
            // Request token
            try {
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            } catch (error) {
                window.removeEventListener('googleTokenReceived', tokenHandler);
                reject(error);
            }
            
            // Timeout after 60 seconds
            setTimeout(() => {
                window.removeEventListener('googleTokenReceived', tokenHandler);
                if (!this.hasGoogleToken()) {
                    reject(new Error('Token request timeout'));
                }
            }, 60000);
        });
    }

    // Get stored Google Token
    getGoogleToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.GOOGLE_TOKEN);
    }

    // Check if has valid Google Token
    hasGoogleToken() {
        return !!this.getGoogleToken();
    }
}

// Global auth instance
const auth = new Auth();

// Protect page - redirect to login if not authenticated
function protectPage() {
    if (!auth.isLoggedIn()) {
        // Navigate to root (login page)
        const basePath = window.location.pathname.includes('/AppDisplay') ? '/AppDisplay/' : '/';
        window.location.href = basePath;
        return false;
    }
    return true;
}

// Check if user is admin
function isAdmin() {
    const user = auth.getUser();
    return user && user.role === 'admin';
}

// Check if user is viewer only
function isViewer() {
    const user = auth.getUser();
    return user && user.role === 'viewer';
}

// Global logout function
function logout() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        auth.logout();
    }
}

// Debug function to check system status
function debugSystemStatus() {
    console.group('🔍 SYSTEM DEBUG STATUS');
    
    // Check user
    const user = auth.getUser();
    console.log('User logged in:', !!user);
    console.log('User data:', user);
    
    // Check storage
    const records = localStorage.getItem(CONFIG.STORAGE_KEYS.RECORDS);
    console.log('Records in localStorage:', !!records);
    console.log('Number of records:', records ? JSON.parse(records).length : 0);
    
    // Check Google Sheets config
    console.log('Google Sheets Web App URL:', CONFIG.GOOGLE_SHEETS_WEBAPP_URL);
    console.log('Web App configured:', CONFIG.GOOGLE_SHEETS_WEBAPP_URL && CONFIG.GOOGLE_SHEETS_WEBAPP_URL !== 'YOUR_WEBAPP_URL');
    
    // Check sheetsDB status
    console.log('SheetsDB configured:', sheetsDB?.isConfigured());
    console.log('SheetsDB URL:', sheetsDB?.webAppUrl);
    
    // Check storage config
    console.log('Storage using Google Sheets:', storage?.useGoogleSheets);
    console.log('Online status:', navigator.onLine);
    
    console.groupEnd();
}

// Make it available globally
window.debugSystemStatus = debugSystemStatus;

// Test JSONP request function
async function testGoogleSheetsConnection() {
    console.group('🧪 Testing Google Sheets Connection');
    
    const webAppUrl = CONFIG.GOOGLE_SHEETS_WEBAPP_URL;
    console.log('Web App URL:', webAppUrl);
    
    // Test 1: Simple GET request to check if server is responding
    try {
        console.log('Test 1: Checking if server responds...');
        const testUrl = webAppUrl + '?action=getAll&callback=testCallback';
        console.log('Test URL:', testUrl);
        
        // Fetch without JSONP first to see raw response
        const response = await fetch(testUrl);
        const text = await response.text();
        console.log('Raw response:', text.substring(0, 200));
    } catch (e) {
        console.error('Test 1 failed (CORS expected):', e.message);
    }
    
    // Test 2: JSONP request
    try {
        console.log('Test 2: JSONP request...');
        const result = await sheetsDB.jsonpRequest(webAppUrl + '?action=getAll', 5000);
        console.log('✅ JSONP Success:', result);
    } catch (e) {
        console.error('❌ JSONP failed:', e.message);
    }
    
    console.groupEnd();
}

window.testGoogleSheetsConnection = testGoogleSheetsConnection;
