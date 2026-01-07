// =====================================================
// VALID DISPLAY - Login Page Script
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    if (auth.isLoggedIn()) {
        window.location.href = 'records/';
        return;
    }

    // Initialize form
    initLoginForm();
});

function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });
}

async function handleLogin() {
    const nik = document.getElementById('nik').value.trim();
    const password = document.getElementById('password').value;
    
    // Validate inputs
    if (!nik || !password) {
        showToast('Mohon isi NIK dan Password', 'error');
        return;
    }

    // Show loading
    showLoading('Memproses login...');

    try {
        const result = await auth.login(nik, password);
        
        hideLoading();
        
        if (result.success) {
            showToast('Login berhasil! Mengalihkan...', 'success');
            
            setTimeout(() => {
                window.location.href = 'records/';
            }, 1000);
        } else {
            showToast(result.message, 'error');
            
            // Shake effect on form
            const loginBox = document.querySelector('.login-box');
            loginBox.style.animation = 'shake 0.5s ease';
            setTimeout(() => {
                loginBox.style.animation = '';
            }, 500);
        }
    } catch (error) {
        hideLoading();
        showToast('Terjadi kesalahan. Coba lagi.', 'error');
        console.error('Login error:', error);
    }
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

// ==================== UTILITIES ====================

function showLoading(message = 'Memproses...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = overlay.querySelector('p');
    if (text) text.textContent = message;
    overlay.classList.remove('hidden');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.add('hidden');
}

function showToast(message, type = 'info') {
    // Remove existing toast container
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Add shake animation
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);
