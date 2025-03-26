/**
 * Context Menu Component
 * Creates and manages context menus throughout the application
 */
class ContextMenu {
    constructor() {
      this.menuElement = null;
      this.menuItems = [];
      this.targetElement = null;
      this.isVisible = false;
      
      // Bind methods to this instance
      this.show = this.show.bind(this);
      this.hide = this.hide.bind(this);
      this.handleClickOutside = this.handleClickOutside.bind(this);
      
      // Create menu element if it doesn't exist
      this.createMenuElement();
      
      // Add global event listener for clicks outside menu
      document.addEventListener('click', this.handleClickOutside);
      document.addEventListener('contextmenu', (e) => {
        // If clicking outside an active menu, hide it
        if (this.isVisible && !this.menuElement.contains(e.target) && e.target !== this.targetElement) {
          this.hide();
        }
      });
      
      // Hide menu on scroll or window resize
      window.addEventListener('scroll', this.hide);
      window.addEventListener('resize', this.hide);
    }
    
    /**
     * Create the menu DOM element
     */
    createMenuElement() {
      // Remove existing menu if any
      if (this.menuElement) {
        document.body.removeChild(this.menuElement);
      }
      
      // Create new menu element
      this.menuElement = document.createElement('div');
      this.menuElement.className = 'context-menu';
      this.menuElement.style.display = 'none';
      
      // Add to document
      document.body.appendChild(this.menuElement);
    }
    
    /**
     * Set menu items
     * @param {Array} items - Array of menu item objects
     */
    setMenuItems(items) {
      this.menuItems = items;
    }
    
    /**
     * Show the context menu at the specified position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {HTMLElement} targetElement - The element that was right-clicked
     */
    show(x, y, targetElement) {
      if (!this.menuItems || this.menuItems.length === 0) {
        console.warn('No menu items to display');
        return;
      }
      
      // Store target element
      this.targetElement = targetElement;
      
      // Clear previous menu content
      this.menuElement.innerHTML = '';
      
      // Generate menu content
      this.generateMenuContent();
      
      // Position the menu
      this.menuElement.style.left = `${x}px`;
      this.menuElement.style.top = `${y}px`;
      
      // Show the menu
      this.menuElement.style.display = 'block';
      this.isVisible = true;
      
      // Adjust position if menu goes outside viewport
      this.adjustMenuPosition();
    }
    
    /**
     * Hide the context menu
     */
    hide() {
      if (this.menuElement) {
        this.menuElement.style.display = 'none';
        this.isVisible = false;
      }
    }
    
    /**
     * Generate menu content based on items
     */
    generateMenuContent() {
      // Create menu items
      this.menuItems.forEach(item => {
        if (item.type === 'separator') {
          // Add separator
          const separator = document.createElement('div');
          separator.className = 'context-menu-separator';
          this.menuElement.appendChild(separator);
        } else {
          // Add menu item
          const menuItem = document.createElement('div');
          menuItem.className = 'context-menu-item';
          
          if (item.disabled) {
            menuItem.classList.add('disabled');
          }
          
          if (item.danger) {
            menuItem.classList.add('danger');
          }
          
          // Create icon if specified
          if (item.icon) {
            const icon = document.createElement('span');
            icon.className = 'context-menu-icon';
            icon.innerHTML = item.icon;
            menuItem.appendChild(icon);
          }
          
          // Create label
          const label = document.createElement('span');
          label.className = 'context-menu-label';
          label.textContent = item.label;
          menuItem.appendChild(label);
          
          // Add click handler
          if (!item.disabled && item.onClick) {
            menuItem.addEventListener('click', (e) => {
              e.stopPropagation();
              this.hide();
              // Call the onClick handler with the target element
              item.onClick(this.targetElement);
            });
          }
          
          this.menuElement.appendChild(menuItem);
        }
      });
    }
    
    /**
     * Adjust menu position if it goes outside viewport
     */
    adjustMenuPosition() {
      const rect = this.menuElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Adjust horizontally if needed
      if (rect.right > viewportWidth) {
        this.menuElement.style.left = `${viewportWidth - rect.width}px`;
      }
      
      // Adjust vertically if needed
      if (rect.bottom > viewportHeight) {
        this.menuElement.style.top = `${viewportHeight - rect.height}px`;
      }
    }
    
    /**
     * Handle clicks outside the menu
     */
    handleClickOutside(event) {
      if (this.isVisible && !this.menuElement.contains(event.target)) {
        this.hide();
      }
    }
    
    /**
     * Cleanup event listeners
     */
    destroy() {
      document.removeEventListener('click', this.handleClickOutside);
      window.removeEventListener('scroll', this.hide);
      window.removeEventListener('resize', this.hide);
      
      if (this.menuElement && this.menuElement.parentNode) {
        this.menuElement.parentNode.removeChild(this.menuElement);
      }
    }
  }
  
  // Create a singleton instance
  const contextMenu = new ContextMenu();
  
  // Make it globally available
  window.contextMenu = contextMenu;