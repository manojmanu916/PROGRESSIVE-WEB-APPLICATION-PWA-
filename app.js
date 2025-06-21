
// Progressive Web App JavaScript
class PWAApp {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.products = [];
        this.currentFilter = 'all';
        this.currentView = 'grid';
        this.isOnline = navigator.onLine;
        
        this.init();
    }

    async init() {
        // Initialize app components
        this.registerServiceWorker();
        this.setupEventListeners();
        this.setupPWAInstall();
        this.loadProducts();
        this.updateCartUI();
        this.setupNotifications();
        this.handleNetworkStatus();
        
        console.log('🚀 PWA App initialized successfully!');
    }

    // Service Worker Registration
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./service-worker.js');
                console.log('✅ Service Worker registered successfully:', registration.scope);
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                this.showToast('New version available! Refresh to update.', 'info');
                            }
                        }
                    });
                });
            } catch (error) {
                console.error('❌ Service Worker registration failed:', error);
            }
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Cart functionality
        document.getElementById('cart-btn').addEventListener('click', () => this.toggleCart());
        document.getElementById('close-cart').addEventListener('click', () => this.toggleCart());
        document.getElementById('clear-cart').addEventListener('click', () => this.clearCart());
        document.getElementById('checkout-btn').addEventListener('click', () => this.checkout());

        // Notification modal
        document.getElementById('notification-btn').addEventListener('click', () => this.toggleNotificationModal());
        document.getElementById('close-notification').addEventListener('click', () => this.toggleNotificationModal());
        document.getElementById('allow-notifications').addEventListener('click', () => this.requestNotificationPermission());
        document.getElementById('deny-notifications').addEventListener('click', () => this.toggleNotificationModal());

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterProducts(e.target.dataset.category));
        });

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleView(e.target.dataset.view));
        });

        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('show');
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.show').forEach(modal => {
                    modal.classList.remove('show');
                });
            }
        });
    }

    // PWA Installation
    setupPWAInstall() {
        let deferredPrompt;
        const installBtn = document.getElementById('install-btn');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installBtn.style.display = 'flex';
        });

        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                
                if (outcome === 'accepted') {
                    this.showToast('App installed successfully! 🎉', 'success');
                }
                
                deferredPrompt = null;
                installBtn.style.display = 'none';
            }
        });

        window.addEventListener('appinstalled', () => {
            this.showToast('App installed successfully! 🎉', 'success');
            installBtn.style.display = 'none';
        });
    }

    // Product Management
    async loadProducts() {
        const loading = document.getElementById('loading');
        loading.style.display = 'block';

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Sample products data
        this.products = [
            {
                id: 1,
                title: "Wireless Bluetooth Headphones",
                category: "electronics",
                price: 99.99,
                rating: 4.5,
                icon: "🎧"
            },
            {
                id: 2,
                title: "Smartphone with 5G",
                category: "electronics",
                price: 699.99,
                rating: 4.8,
                icon: "📱"
            },
            {
                id: 3,
                title: "Casual Cotton T-Shirt",
                category: "clothing",
                price: 24.99,
                rating: 4.2,
                icon: "👕"
            },
            {
                id: 4,
                title: "Premium Denim Jeans",
                category: "clothing",
                price: 79.99,
                rating: 4.6,
                icon: "👖"
            },
            {
                id: 5,
                title: "JavaScript Programming Guide",
                category: "books",
                price: 39.99,
                rating: 4.7,
                icon: "📚"
            },
            {
                id: 6,
                title: "Mystery Novel Collection",
                category: "books",
                price: 29.99,
                rating: 4.3,
                icon: "📖"
            },
            {
                id: 7,
                title: "Indoor Plant Pot Set",
                category: "home",
                price: 49.99,
                rating: 4.4,
                icon: "🪴"
            },
            {
                id: 8,
                title: "Kitchen Utensil Set",
                category: "home",
                price: 34.99,
                rating: 4.1,
                icon: "🍴"
            },
            {
                id: 9,
                title: "Gaming Mechanical Keyboard",
                category: "electronics",
                price: 129.99,
                rating: 4.9,
                icon: "⌨️"
            },
            {
                id: 10,
                title: "Cozy Winter Sweater",
                category: "clothing",
                price: 54.99,
                rating: 4.5,
                icon: "🧥"
            },
            {
                id: 11,
                title: "Fitness & Wellness Guide",
                category: "books",
                price: 22.99,
                rating: 4.2,
                icon: "💪"
            },
            {
                id: 12,
                title: "Smart Home Security Camera",
                category: "electronics",
                price: 159.99,
                rating: 4.6,
                icon: "📹"
            }
        ];

        loading.style.display = 'none';
        this.renderProducts();
    }

    renderProducts() {
        const grid = document.getElementById('products-grid');
        const filteredProducts = this.currentFilter === 'all' 
            ? this.products 
            : this.products.filter(p => p.category === this.currentFilter);

        grid.innerHTML = filteredProducts.map(product => `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    <span style="font-size: 4rem;">${product.icon}</span>
                </div>
                <div class="product-info">
                    <div class="product-category">${product.category}</div>
                    <h4 class="product-title">${product.title}</h4>
                    <div class="product-rating">
                        <div class="stars">${this.generateStars(product.rating)}</div>
                        <span class="rating-text">(${product.rating})</span>
                    </div>
                    <div class="product-price">$${product.price}</div>
                    <button class="add-to-cart" onclick="app.addToCart(${product.id})">
                        <i class="fas fa-shopping-cart"></i>
                        Add to Cart
                    </button>
                </div>
            </div>
        `).join('');
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let stars = '';
        
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        const emptyStars = 5 - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }

    filterProducts(category) {
        this.currentFilter = category;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        this.renderProducts();
        this.showToast(`Showing ${category === 'all' ? 'all' : category} products`, 'info');
    }

    toggleView(view) {
        this.currentView = view;
        const grid = document.getElementById('products-grid');
        
        // Update active view button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Toggle grid classes
        if (view === 'list') {
            grid.classList.add('list-view');
        } else {
            grid.classList.remove('list-view');
        }
    }

    // Cart Management
    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const existingItem = this.cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                ...product,
                quantity: 1
            });
        }

        this.saveCart();
        this.updateCartUI();
        this.showToast(`${product.title} added to cart! 🛒`, 'success');
        
        // Add bounce animation to cart button
        const cartBtn = document.getElementById('cart-btn');
        cartBtn.classList.add('bounce');
        setTimeout(() => cartBtn.classList.remove('bounce'), 1000);
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
        this.updateCartUI();
        this.renderCart();
        this.showToast('Item removed from cart', 'info');
    }

    updateQuantity(productId, change) {
        const item = this.cart.find(item => item.id === productId);
        if (!item) return;

        item.quantity += change;
        
        if (item.quantity <= 0) {
            this.removeFromCart(productId);
            return;
        }

        this.saveCart();
        this.updateCartUI();
        this.renderCart();
    }

    clearCart() {
        if (this.cart.length === 0) {
            this.showToast('Cart is already empty', 'info');
            return;
        }

        this.cart = [];
        this.saveCart();
        this.updateCartUI();
        this.renderCart();
        this.showToast('Cart cleared', 'info');
    }

    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
    }

    updateCartUI() {
        const cartCount = document.getElementById('cart-count');
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    toggleCart() {
        const modal = document.getElementById('cart-modal');
        
        if (modal.classList.contains('show')) {
            modal.classList.remove('show');
        } else {
            modal.classList.add('show');
            this.renderCart();
        }
    }

    renderCart() {
        const cartItems = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');

        if (this.cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <h4>Your cart is empty</h4>
                    <p>Add some products to get started!</p>
                </div>
            `;
            cartTotal.textContent = '0.00';
            return;
        }

        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        cartItems.innerHTML = this.cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-image">
                    <span style="font-size: 1.5rem;">${item.icon}</span>
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.title}</div>
                    <div class="cart-item-price">$${item.price}</div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="app.updateQuantity(${item.id}, -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn" onclick="app.updateQuantity(${item.id}, 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <button class="remove-item" onclick="app.removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        cartTotal.textContent = total.toFixed(2);
    }

    checkout() {
        if (this.cart.length === 0) {
            this.showToast('Your cart is empty!', 'error');
            return;
        }

        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Simulate checkout process
        setTimeout(() => {
            this.showToast(`Order placed successfully! Total: $${total.toFixed(2)} 🎉`, 'success');
            this.cart = [];
            this.saveCart();
            this.updateCartUI();
            this.renderCart();
            
            // Send notification if supported
            if (Notification.permission === 'granted') {
                new Notification('Order Confirmation', {
                    body: `Your order of $${total.toFixed(2)} has been placed successfully!`,
                    icon: './images/icon-192x192.png'
                });
            }
        }, 1500);
        
        this.toggleCart();
        this.showToast('Processing your order...', 'info');
    }

    // Notification Management
    setupNotifications() {
        this.updateNotificationStatus();
        
        // Show notification modal after 5 seconds if not already granted
        setTimeout(() => {
            if (Notification.permission === 'default') {
                this.toggleNotificationModal();
            }
        }, 5000);
    }

    updateNotificationStatus() {
        const badge = document.getElementById('notification-status');
        const btn = document.getElementById('notification-btn');
        
        switch (Notification.permission) {
            case 'granted':
                badge.style.display = 'block';
                badge.style.background = '#2ed573';
                btn.title = 'Notifications enabled';
                break;
            case 'denied':
                badge.style.display = 'block';
                badge.style.background = '#ff4757';
                btn.title = 'Notifications blocked';
                break;
            default:
                badge.style.display = 'none';
                btn.title = 'Enable notifications';
        }
    }

    toggleNotificationModal() {
        const modal = document.getElementById('notification-modal');
        modal.classList.toggle('show');
    }

    async requestNotificationPermission() {
        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                this.showToast('Notifications enabled! 🔔', 'success');
                
                // Show welcome notification
                setTimeout(() => {
                    new Notification('Welcome to ShopPWA!', {
                        body: 'You\'ll now receive updates about new products and offers.',
                        icon: './images/icon-192x192.png'
                    });
                }, 1000);
                
                // Setup periodic promotional notifications
                this.schedulePushNotifications();
            } else {
                this.showToast('Notifications blocked', 'error');
            }
            
            this.updateNotificationStatus();
            this.toggleNotificationModal();
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            this.showToast('Error enabling notifications', 'error');
        }
    }

    schedulePushNotifications() {
        // Schedule demo notifications
        const notifications = [
            {
                title: "🏷️ Flash Sale Alert!",
                body: "50% off on electronics - Limited time offer!",
                delay: 30000 // 30 seconds
            },
            {
                title: "📦 New Arrivals",
                body: "Check out our latest collection of winter wear!",
                delay: 60000 // 1 minute
            },
            {
                title: "🎁 Special Offer",
                body: "Free shipping on orders over $50!",
                delay: 120000 // 2 minutes
            }
        ];

        notifications.forEach(notif => {
            setTimeout(() => {
                if (Notification.permission === 'granted') {
                    new Notification(notif.title, {
                        body: notif.body,
                        icon: './images/icon-192x192.png',
                        badge: './images/icon-192x192.png'
                    });
                }
            }, notif.delay);
        });
    }

    // Network Status Management
    handleNetworkStatus() {
        const offlineIndicator = document.getElementById('offline-indicator');
        
        const updateOnlineStatus = () => {
            this.isOnline = navigator.onLine;
            
            if (this.isOnline) {
                offlineIndicator.style.display = 'none';
                this.showToast('Back online! 🌐', 'success');
            } else {
                offlineIndicator.style.display = 'block';
                this.showToast('You are offline - browsing cached content', 'info');
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        // Initial check
        if (!this.isOnline) {
            offlineIndicator.style.display = 'block';
        }
    }

    // Toast Notifications
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="toast-icon ${icons[type]}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, duration);
        
        // Click to dismiss
        toast.addEventListener('click', () => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        });
    }
}

// Initialize PWA App
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new PWAApp();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (app && app.showToast) {
        app.showToast('Something went wrong. Please try again.', 'error');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (app && app.showToast) {
        app.showToast('Something went wrong. Please try again.', 'error');
    }
});

// Export for global access
window.app = app;
