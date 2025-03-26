// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded');
  
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const body = document.body;
  
  // Check system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  body.className = prefersDark ? 'dark-mode' : 'light-mode';
  themeToggleBtn.textContent = prefersDark ? '☀️' : '🌙';
  
  // Toggle theme
  themeToggleBtn.addEventListener('click', () => {
    const isDarkMode = body.classList.contains('dark-mode');
    body.className = isDarkMode ? 'light-mode' : 'dark-mode';
    themeToggleBtn.textContent = isDarkMode ? '🌙' : '☀️';
    
    // Tell the main process about the theme change
    if (window.api) {
      window.api.send('setTheme', !isDarkMode);
    }
  });
  
  // Form submission
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  
  if (loginForm) {
    console.log('Login form found');
    
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      console.log('Login form submitted');
      
      // Safely get elements and their values
      const hostEl = document.getElementById('host');
      const portEl = document.getElementById('port');
      const usernameEl = document.getElementById('username');
      const passwordEl = document.getElementById('password');
      const rememberEl = document.getElementById('remember');
      
      // Check if elements exist before accessing their values
      if (!hostEl || !portEl || !usernameEl || !passwordEl || !rememberEl) {
        console.error('One or more form elements not found', {
          hostEl, portEl, usernameEl, passwordEl, rememberEl
        });
        
        if (loginError) {
          loginError.textContent = 'Form error: Could not access all fields';
          loginError.style.display = 'block';
        }
        return;
      }
      
      // Get PostgreSQL connection details
      const host = hostEl.value || 'localhost';
      const port = portEl.value || '5432';
      const username = usernameEl.value || 'brosmar';
      const password = passwordEl.value || '';
      const rememberConnection = rememberEl.checked;
      
      // Clear any previous errors
      if (loginError) {
        loginError.textContent = '';
        loginError.style.display = 'none';
      }
      
      // Show loading state
      const submitButton = loginForm.querySelector('button[type="submit"]');
      const originalText = submitButton.textContent;
      submitButton.textContent = 'Connecting...';
      submitButton.disabled = true;
      
      console.log('Connecting to:', { host, port, user: username });
      
      // Send login details to main process
      if (window.api) {
        window.api.send('pgConnect', {
          host,
          port,
          user: username,
          password
        });
        
        // Listen for response
        window.api.receive('pgConnectResponse', (response) => {
          console.log('Received response:', response);
          submitButton.textContent = originalText;
          submitButton.disabled = false;
          
          if (!response.success) {
            loginError.textContent = response.error || 'Connection failed';
            loginError.style.display = 'block';
          }
          // Success handling is done by main process loading home page
        });
      } else {
        // For debugging when API is not available
        console.error('API not available!');
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        
        if (loginError) {
          loginError.textContent = 'API not available. Check preload script.';
          loginError.style.display = 'block';
        }
      }
    });
  } else {
    console.error('Login form not found');
  }
  
  // Handle logout response (redirects back to login)
  if (window.api) {
    window.api.receive('logoutResponse', () => {
      // The main process will load the login page
      console.log('Logged out successfully');
    });
  }
});