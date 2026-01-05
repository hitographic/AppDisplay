// =====================================================
// VALID DISPLAY - Authentication Module
// =====================================================

class Auth {
    constructor() {
        this.currentUser = null;
        this.isGoogleLoaded = false;
        this.tokenClient = null;
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

    // Login with NIK and Password
    login(nik, password) {
        const user = CONFIG.USERS.find(u => u.nik === nik && u.password === password);
        if (user) {
            this.currentUser = {
                nik: user.nik,
                name: user.name,
                role: user.role || 'viewer',
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
        window.location.href = 'index.html';
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
        window.location.href = 'index.html';
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
