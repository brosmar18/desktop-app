/**
 * UI Utilities
 * Common functions for UI manipulation and rendering
 */

/**
 * Shows an element by setting its display style
 * @param {HTMLElement|string} element - The element or element ID to show
 * @param {string} displayValue - The display style value (default: 'block')
 */
function showElement(element, displayValue = 'block') {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) {
      el.style.display = displayValue;
    }
  }
  
  /**
   * Hides an element by setting its display style to 'none'
   * @param {HTMLElement|string} element - The element or element ID to hide
   */
  function hideElement(element) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) {
      el.style.display = 'none';
    }
  }
  
  /**
   * Sets text content of an element
   * @param {HTMLElement|string} element - The element or element ID
   * @param {string} text - The text to set
   */
  function setElementText(element, text) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) {
      el.textContent = text;
    }
  }
  
  /**
   * Sets HTML content of an element
   * @param {HTMLElement|string} element - The element or element ID
   * @param {string} html - The HTML to set
   */
  function setElementHTML(element, html) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) {
      el.innerHTML = html;
    }
  }
  
  /**
   * Creates a loading indicator in the specified element
   * @param {HTMLElement|string} element - The element or element ID to show loading in
   * @param {string} message - The loading message
   */
  function showLoading(element, message = 'Loading...') {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    
    if (!el) return;
    
    // Different loading indicators based on element type
    if (el.tagName === 'UL' || el.tagName === 'OL') {
      el.innerHTML = `<li class="loading">${message}</li>`;
    } else if (el.tagName === 'TBODY') {
      const colSpan = el.closest('table').querySelectorAll('th').length || 1;
      el.innerHTML = `<tr><td colspan="${colSpan}" class="loading">${message}</td></tr>`;
    } else {
      el.innerHTML = `<div class="loading">${message}</div>`;
    }
  }
  
  /**
   * Shows an error message in the specified element
   * @param {HTMLElement|string} element - The element or element ID to show error in
   * @param {string} message - The error message
   */
  function showError(element, message) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    
    if (!el) return;
    
    // Different error displays based on element type
    if (el.tagName === 'UL' || el.tagName === 'OL') {
      el.innerHTML = `<li class="error">${message}</li>`;
    } else if (el.tagName === 'TBODY') {
      const colSpan = el.closest('table').querySelectorAll('th').length || 1;
      el.innerHTML = `<tr><td colspan="${colSpan}" class="error">${message}</td></tr>`;
    } else {
      el.innerHTML = `<div class="error">${message}</div>`;
    }
  }
  
  /**
   * Creates and appends a button to a container
   * @param {HTMLElement} container - The container to append the button to
   * @param {string} text - The button text
   * @param {string} className - CSS class for the button
   * @param {Function} onClick - Click event handler
   * @returns {HTMLButtonElement} The created button
   */
  function createButton(container, text, className, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = className;
    button.addEventListener('click', onClick);
    container.appendChild(button);
    return button;
  }
  
  /**
   * Sets up a click handler for a button
   * @param {string} buttonId - The ID of the button element
   * @param {Function} handler - The click event handler
   */
  function setupButton(buttonId, handler) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', handler);
    }
  }
  
  /**
   * Creates a table row with cells from data
   * @param {Array} cellsData - Array of cell text content
   * @returns {HTMLTableRowElement} The created table row
   */
  function createTableRow(cellsData) {
    const tr = document.createElement('tr');
    
    cellsData.forEach(cellText => {
      const td = document.createElement('td');
      td.textContent = cellText || '-';
      tr.appendChild(td);
    });
    
    return tr;
  }