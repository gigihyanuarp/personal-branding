// ========================================
// ADMIN JAVASCRIPT
// ========================================

(function() {
    'use strict';

    // Mobile sidebar toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('open');
            mobileMenuBtn.setAttribute('aria-expanded', sidebar.classList.contains('open'));
        });
        
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('open');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            });
        }
    }

    // Message modal handling
    const messageModal = document.getElementById('messageModal');
    const modalOverlay = messageModal?.querySelector('.modal-overlay');
    const modalClose = messageModal?.querySelector('.modal-close');
    const modalBody = document.getElementById('modalBody');
    
    const openModal = () => {
        if (messageModal) {
            messageModal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    };
    
    const closeModal = () => {
        if (messageModal) {
            messageModal.classList.remove('open');
            document.body.style.overflow = '';
        }
    };
    
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
    if (modalClose) modalClose.addEventListener('click', closeModal);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && messageModal?.classList.contains('open')) {
            closeModal();
        }
    });

    // View message buttons
    document.querySelectorAll('.view-message').forEach(btn => {
        btn.addEventListener('click', async function() {
            const messageId = this.dataset.messageId;
            if (!messageId) return;
            
            openModal();
            modalBody.innerHTML = '<div class="loading">Memuat pesan...</div>';
            
            try {
                const response = await fetch(`/admin/messages/${messageId}/view`);
                if (response.ok) {
                    const html = await response.text();
                    modalBody.innerHTML = html;
                } else {
                    modalBody.innerHTML = '<div class="alert alert-error">Gagal memuat pesan</div>';
                }
            } catch (error) {
                console.error('Error loading message:', error);
                modalBody.innerHTML = '<div class="alert alert-error">Terjadi kesalahan saat memuat pesan</div>';
            }
        });
    });

    // Mark as read via AJAX
    document.querySelectorAll('form[action*="/read"]').forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            
            btn.disabled = true;
            btn.textContent = 'Memproses...';
            
            try {
                const response = await fetch(this.action, {
                    method: 'POST',
                    body: formData,
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                
                if (response.ok) {
                    const row = this.closest('tr');
                    row.classList.remove('unread');
                    const badge = row.querySelector('.badge');
                    if (badge) {
                        badge.className = 'badge badge-secondary';
                        badge.textContent = 'Dibaca';
                    }
                    btn.remove();
                    showToast('Pesan ditandai sebagai dibaca', 'success');
                } else {
                    showToast('Gagal memperbarui status', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Terjadi kesalahan', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    });

    // Confirm delete
    document.querySelectorAll('form[action*="/delete"]').forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!confirm('Yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.')) {
                e.preventDefault();
            }
        });
    });

    // Auto-generate slug from title
    const titleInput = document.getElementById('title');
    const slugInput = document.getElementById('slug');
    
    if (titleInput && slugInput) {
        let slugModified = false;
        
        slugInput.addEventListener('input', () => {
            slugModified = true;
        });
        
        titleInput.addEventListener('input', function() {
            if (!slugModified) {
                const slug = this.value
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');
                slugInput.value = slug;
            }
        });
        
        slugInput.addEventListener('focus', () => {
            slugModified = true;
        });
    }

    // Image preview for file input
    document.querySelectorAll('input[type="file"][accept*="image"]').forEach(input => {
        input.addEventListener('change', function() {
            const file = this.files[0];
            if (!file) return;
            
            if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
                showToast('Format file tidak didukung. Gunakan JPG, PNG, atau WebP.', 'error');
                this.value = '';
                return;
            }
            
            if (file.size > 2 * 1024 * 1024) {
                showToast('Ukuran file maksimal 2MB', 'error');
                this.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                let preview = input.parentNode.querySelector('.image-preview');
                if (!preview) {
                    preview = document.createElement('div');
                    preview.className = 'image-preview mt-2';
                    input.parentNode.appendChild(preview);
                }
                preview.innerHTML = `
                    <img src="${e.target.result}" alt="Preview" style="max-width: 200px; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
                    <p class="text-sm text-muted mt-1">Preview: ${file.name} (${(file.size / 1024).toFixed(1)} KB)</p>
                `;
            };
            reader.readAsDataURL(file);
        });
    });

    // Flash message auto-dismiss
    document.querySelectorAll('.alert').forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-10px)';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });

    // Table row click navigation (optional)
    document.querySelectorAll('.data-table tbody tr[data-href]').forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', (e) => {
            if (e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON' && !e.target.closest('a, button, form')) {
                window.location.href = row.dataset.href;
            }
        });
    });

    // Toast notification system
    window.showToast = function(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button class="toast-close" aria-label="Tutup">✕</button>
        `;
        
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                bottom: 1.5rem;
                right: 1.5rem;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            `;
            document.body.appendChild(container);
        }
        
        container.appendChild(toast);
        
        const closeBtn = toast.querySelector('.toast-close');
        const removeToast = () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            setTimeout(() => toast.remove(), 300);
        };
        
        closeBtn.addEventListener('click', removeToast);
        setTimeout(removeToast, 5000);
        
        // Trigger reflow for animation
        toast.offsetHeight;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    };

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K for search (future)
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            // Focus search input if exists
            const search = document.querySelector('input[type="search"]');
            if (search) search.focus();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
            document.body.style.overflow = '';
        }
    });

})();

// ========================================
// ADMIN TOAST STYLES (injected)
// ========================================
const adminToastStyles = `
.toast {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-radius: var(--radius-md);
    color: white;
    font-weight: 500;
    font-size: 0.875rem;
    box-shadow: var(--shadow-lg);
    min-width: 280px;
    max-width: 400px;
    opacity: 0;
    transform: translateX(100px);
    transition: all var(--transition-normal);
}

.toast.toast-success { background: var(--color-success); }
.toast.toast-error { background: var(--color-danger); }
.toast.toast-warning { background: var(--color-warning); }
.toast.toast-info { background: var(--color-info); }

.toast-close {
    background: rgba(255,255,255,0.2);
    border: none;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    cursor: pointer;
    flex-shrink: 0;
    transition: background var(--transition-fast);
}

.toast-close:hover { background: rgba(255,255,255,0.3); }

.image-preview { animation: fadeIn 0.2s ease; }

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 480px) {
    #toast-container {
        left: 1rem !important;
        right: 1rem !important;
        bottom: 1rem !important;
    }
    .toast { min-width: auto; max-width: none; }
}
`;

const adminStyleSheet = document.createElement('style');
adminStyleSheet.textContent = adminToastStyles;
document.head.appendChild(adminStyleSheet);