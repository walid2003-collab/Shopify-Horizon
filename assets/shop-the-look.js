/**
 * Shop The Look Component
 * Handles carousel navigation, modal display, and AJAX cart functionality
 */

class ShopTheLook {
  constructor() {
    this.carousel = document.querySelector('[data-carousel]');
    this.cards = document.querySelectorAll('[data-look-id]');
    this.modal = document.querySelector('[data-modal]');
    this.modalOverlay = document.querySelector('[data-modal-overlay]');
    this.modalContent = document.querySelector('[data-modal-content]');
    this.modalClose = document.querySelector('[data-modal-close]');
    this.toast = document.querySelector('[data-toast]');
    this.prevBtn = document.querySelector('[data-carousel-prev]');
    this.nextBtn = document.querySelector('[data-carousel-next]');
    this.addAllBtn = document.querySelector('[data-add-all-to-bag]');
    this.currentProducts = null;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupSwipe();
  }

  setupEventListeners() {
    // Open modal when clicking look cards
    this.cards.forEach(card => {
      const button = card.querySelector('[data-open-modal]');
      if (button) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.openModal(card);
        });
      }
    });

    // Close modal
    if (this.modalClose) {
      this.modalClose.addEventListener('click', () => this.closeModal());
    }
    
    if (this.modalOverlay) {
      this.modalOverlay.addEventListener('click', () => this.closeModal());
    }

    // Add all to bag
    if (this.addAllBtn) {
      this.addAllBtn.addEventListener('click', () => this.addAllToCart());
    }

    // Carousel navigation
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.scroll('left'));
    }
    
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.scroll('right'));
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.classList.contains('active')) {
        this.closeModal();
      }
    });
  }

  setupSwipe() {
    if (!this.carousel) return;

    let startX = 0;
    let scrollLeft = 0;

    this.carousel.addEventListener('touchstart', (e) => {
      startX = e.touches[0].pageX;
      scrollLeft = this.carousel.scrollLeft;
    });

    this.carousel.addEventListener('touchmove', (e) => {
      const x = e.touches[0].pageX;
      const walk = (startX - x) * 2;
      this.carousel.scrollLeft = scrollLeft + walk;
    });
  }

  scroll(direction) {
    if (!this.carousel) return;
    
    const scrollAmount = this.carousel.offsetWidth * 0.8;
    if (direction === 'left') {
      this.carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      this.carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  async openModal(card) {
    const lookData = card.dataset.lookProducts;

    console.log('Opening modal with data:', lookData);

    if (!lookData) {
      this.modalContent.innerHTML = '<p style="text-align: center; padding: 40px;">No products linked to this look yet.</p>';
      this.showModal();
      return;
    }

    let settings;
    try {
      settings = JSON.parse(lookData);
      console.log('Parsed settings:', settings);
    } catch (e) {
      console.error('Error parsing look data:', e);
      this.modalContent.innerHTML = '<p style="text-align: center; padding: 40px;">Error loading product data.</p>';
      this.showModal();
      return;
    }

    // Collect product handles - they should now be clean strings from Liquid
    const productHandles = [];
    for (let i = 1; i <= 5; i++) {
      const productHandle = settings['product_' + i];
      if (productHandle && typeof productHandle === 'string' && productHandle.trim() !== '') {
        productHandles.push(productHandle.trim());
      }
    }

    console.log('Product handles:', productHandles);

    if (productHandles.length === 0) {
      this.modalContent.innerHTML = '<p style="text-align: center; padding: 40px;">No products linked to this look yet.</p>';
      this.showModal();
      return;
    }

    // Show modal with loading state
    this.modalContent.innerHTML = '<p style="text-align: center; padding: 40px; grid-column: 1 / -1;">Loading...</p>';
    this.showModal();

    try {
      const productData = await Promise.all(
        productHandles.map(handle => this.fetchProductData(handle))
      );
      
      console.log('Fetched products:', productData);
      
      this.modalContent.innerHTML = '';
      this.currentProducts = [];
      
      productData.forEach(data => {
        if (data && data.element && data.product) {
          this.modalContent.appendChild(data.element);
          this.currentProducts.push(data.product);
        }
      });

      if (this.currentProducts.length === 0) {
        this.modalContent.innerHTML = '<p style="text-align: center; padding: 40px; grid-column: 1 / -1;">No products available.</p>';
      }
    } catch (error) {
      console.error('Error loading products:', error);
      this.modalContent.innerHTML = '<p style="text-align: center; padding: 40px; grid-column: 1 / -1;">Error loading products. Please try again.</p>';
    }
  }

  async fetchProductData(handle) {
    try {
      const response = await fetch('/products/' + handle + '.js');
      if (!response.ok) throw new Error('Product not found');
      
      const product = await response.json();
      return {
        element: this.createProductElement(product),
        product: product
      };
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }

  createProductElement(product) {
    const div = document.createElement('div');
    div.className = 'shop-look-product';
    div.dataset.productId = product.id;

    const hasNewTag = product.tags.includes('new') || product.tags.includes('NEW');
    const imageUrl = product.featured_image || (product.images && product.images[0]);

    // Build variant dropdowns (one for each option)
    let variantSelectors = '';
    if (product.options && product.options.length > 0) {
      const selectorsHTML = product.options.map((optionName, optionIndex) => {
        // Get unique values for this option
        const values = [...new Set(product.variants.map(v => v['option' + (optionIndex + 1)]))];
        
        const optionsHTML = values.map(value => {
          return '<option value="' + value + '">' + value + '</option>';
        }).join('');

        const placeholder = optionName === 'Size' || optionName.toLowerCase().includes('size') 
          ? 'Select Size' 
          : optionName === 'Color' || optionName === 'Colour' || optionName.toLowerCase().includes('color') 
          ? 'Select Colour' 
          : 'Select ' + optionName;

        return '<div class="shop-look-variant-selector">' +
          '<select class="shop-look-variant-select" data-option-index="' + optionIndex + '" data-option-name="' + optionName + '">' +
          '<option value="" disabled selected>' + placeholder + '</option>' +
          optionsHTML +
          '</select>' +
          '</div>';
      }).join('');

      variantSelectors = '<div class="shop-look-variant-selectors">' + selectorsHTML + '</div>';
    }

    div.innerHTML = '<div class="shop-look-product__image-wrapper">' +
      '<img src="' + imageUrl + '" alt="' + this.escapeHtml(product.title) + '" class="shop-look-product__image" loading="lazy">' +
      (hasNewTag ? '<span class="shop-look-badge">NEW</span>' : '') +
      '</div>' +
      '<div class="shop-look-product__info">' +
      '<h4 class="shop-look-product__title">' + this.escapeHtml(product.title) + '</h4>' +
      '<p class="shop-look-product__price">' + this.formatMoney(product.price) + '</p>' +
      variantSelectors +
      '</div>';

    // Add event listeners for variant selection
    const selects = div.querySelectorAll('[data-option-index]');
    selects.forEach(select => {
      select.addEventListener('change', () => {
        this.updateSelectedVariant(div, product);
      });
    });

    return div;
  }

  updateSelectedVariant(productEl, product) {
    const selects = productEl.querySelectorAll('[data-option-index]');
    const selectedOptions = [];
    
    selects.forEach(select => {
      selectedOptions.push(select.value);
    });

    // Find matching variant
    const variant = product.variants.find(v => {
      return selectedOptions.every((value, index) => {
        return v['option' + (index + 1)] === value;
      });
    });

    // Store the selected variant ID on the product element
    if (variant) {
      productEl.dataset.selectedVariantId = variant.id;
      productEl.dataset.variantAvailable = variant.available;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async addAllToCart() {
    if (!this.currentProducts || this.currentProducts.length === 0) return;

    this.addAllBtn.disabled = true;
    this.addAllBtn.textContent = 'ADDING...';

    try {
      const items = [];
      
      // Collect all selected variants
      const productElements = this.modalContent.querySelectorAll('.shop-look-product');
      productElements.forEach((el, index) => {
        const product = this.currentProducts[index];
        if (!product) return;

        const variantSelect = el.querySelector('[data-variant-select]');
        let variantId;

        if (variantSelect) {
          variantId = parseInt(variantSelect.value);
        } else {
          variantId = product.variants[0].id;
        }

        items.push({
          id: variantId,
          quantity: 1
        });
      });

      // Add all items to cart
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: items })
      });

      if (response.ok) {
        this.showToast();
        this.addAllBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 20px; height: 20px; margin-right: 8px;"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>ADDED!';
        
        setTimeout(() => {
          this.addAllBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 20px; height: 20px; margin-right: 8px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>ADD TO BAG';
          this.addAllBtn.disabled = false;
        }, 2000);

        // Dispatch cart refresh event
        document.dispatchEvent(new CustomEvent('cart:refresh'));
      } else {
        throw new Error('Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      this.addAllBtn.textContent = 'ERROR - TRY AGAIN';
      this.addAllBtn.disabled = false;
    }
  }

  showModal() {
    if (this.modal && this.modalOverlay) {
      this.modal.classList.add('active');
      this.modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal() {
    if (this.modal && this.modalOverlay) {
      this.modal.classList.remove('active');
      this.modalOverlay.classList.remove('active');
      document.body.style.overflow = '';
      this.currentProducts = null;
    }
  }

  showToast() {
    if (this.toast) {
      this.toast.classList.add('active');
      setTimeout(() => {
        this.toast.classList.remove('active');
      }, 3000);
    }
  }

  formatMoney(cents) {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(dollars);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    new ShopTheLook();
  });
} else {
  new ShopTheLook();
}
