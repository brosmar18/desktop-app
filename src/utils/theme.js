/**
 * Theme management utility
 * Provides centralized functions for handling dark/light mode toggling
 */

// Initialize theme based on system preference and set up toggle functionality
function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const body = document.body;
    
    if (!themeToggleBtn || !body) {
      console.error('Theme toggle elements not found');
      return;
    }
    
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark);
    
    // Set up click handler
    themeToggleBtn.addEventListener('click', toggleTheme);
  }
  
  // Toggle between dark and light modes
  function toggleTheme() {
    const body = document.body;
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    
    if (!body || !themeToggleBtn) {
      console.error('Theme toggle elements not found');
      return;
    }
    
    const isDarkMode = body.classList.contains('dark-mode');
    setTheme(!isDarkMode);
    
    // Notify main process if needed
    if (window.api) {
      window.api.send('setTheme', !isDarkMode);
    }
  }
  
  // Set specific theme (dark or light)
  function setTheme(isDarkMode) {
    const body = document.body;
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    
    if (!body || !themeToggleBtn) {
      console.error('Theme toggle elements not found');
      return;
    }
    
    body.className = isDarkMode ? 'dark-mode' : 'light-mode';
    themeToggleBtn.textContent = isDarkMode ? '☀️' : '🌙';
  }