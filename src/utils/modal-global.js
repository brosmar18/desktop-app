/**
 * Modal Utility
 * Creates, shows, and manages modal dialogs
 */

class ModalManager {
    constructor() {
      this.modalContainer = null;
      this.modalContent = null;
      this.isVisible = false;
      
      // Initialize modal container
      this.createModalContainer();
      
      // Bind methods
      this.showModal = this.showModal.bind(this);
      this.hideModal = this.hideModal.bind(this);
      this.handleClickOutside = this.handleClickOutside.bind(this);
      
      // Add event listeners
      document.addEventListener('click', this.handleClickOutside);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isVisible) {
          this.hideModal();
        }
      });
    }
    
    /**
     * Create the modal container DOM element
     */
    createModalContainer() {
      // Remove existing container if any
      if (this.modalContainer) {
        document.body.removeChild(this.modalContainer);
      }
      
      // Create overlay container
      this.modalContainer = document.createElement('div');
      this.modalContainer.className = 'modal-overlay';
      this.modalContainer.style.display = 'none';
      
      // Create modal content container
      this.modalContent = document.createElement('div');
      this.modalContent.className = 'modal-content';
      
      // Add to DOM
      this.modalContainer.appendChild(this.modalContent);
      document.body.appendChild(this.modalContainer);
    }
    
    /**
     * Show a modal with the specified content
     * @param {string|HTMLElement} content - HTML content or element to display
     * @param {Object} options - Additional options for the modal
     */
    showModal(content, options = {}) {
      // Set default options
      const defaultOptions = {
        width: '500px',
        height: 'auto',
        closeOnClickOutside: true,
        onClose: null,
      };
      
      const modalOptions = { ...defaultOptions, ...options };
      
      // Set modal content
      if (typeof content === 'string') {
        this.modalContent.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        this.modalContent.innerHTML = '';
        this.modalContent.appendChild(content);
      } else {
        console.error('Invalid modal content');
        return;
      }
      
      // Set modal size
      this.modalContent.style.width = modalOptions.width;
      this.modalContent.style.height = modalOptions.height;
      
      // Store options
      this.currentOptions = modalOptions;
      
      // Show modal
      this.modalContainer.style.display = 'flex';
      this.isVisible = true;
      
      // Add animation class
      setTimeout(() => {
        this.modalContainer.classList.add('visible');
        this.modalContent.classList.add('visible');
      }, 10);
      
      // Setup close button if exists in the content
      const closeButton = this.modalContent.querySelector('.modal-close-btn');
      if (closeButton) {
        closeButton.addEventListener('click', this.hideModal);
      }
      
      // Setup form submit if exists
      const form = this.modalContent.querySelector('form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          // Get form data
          const formData = new FormData(form);
          const data = {};
          for (const [key, value] of formData.entries()) {
            data[key] = value;
          }
          
          // Call onSubmit if provided
          if (modalOptions.onSubmit && typeof modalOptions.onSubmit === 'function') {
            modalOptions.onSubmit(data);
          }
          
          // Close modal unless specified otherwise
          if (modalOptions.closeOnSubmit !== false) {
            this.hideModal();
          }
        });
      }
    }
    
    /**
     * Hide the modal
     */
    hideModal() {
      if (!this.isVisible) return;
      
      // Remove animation class
      this.modalContainer.classList.remove('visible');
      this.modalContent.classList.remove('visible');
      
      // Hide modal after animation
      setTimeout(() => {
        this.modalContainer.style.display = 'none';
        this.isVisible = false;
        
        // Call onClose if provided
        if (this.currentOptions && this.currentOptions.onClose) {
          this.currentOptions.onClose();
        }
      }, 300); // Match transition duration in CSS
    }
    
    /**
     * Handle clicks outside the modal content
     */
    handleClickOutside(event) {
      if (this.isVisible && 
          this.currentOptions && 
          this.currentOptions.closeOnClickOutside && 
          event.target === this.modalContainer) {
        this.hideModal();
      }
    }
    
    /**
     * Cleanup event listeners
     */
    destroy() {
      document.removeEventListener('click', this.handleClickOutside);
    }
  }
  
  // Create a singleton instance
  window.globalModalManager = new ModalManager();