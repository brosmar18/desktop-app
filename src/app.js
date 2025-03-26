// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded');
  
  // Initialize theme toggle
  initTheme();
  
  // Form submission
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  
  if (loginForm) {
    console.log('Login form found');
    
    loginForm.addEventListener('submit', async (e) => {
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
      
      try {
        await connectToDatabase({
          host,
          port,
          user: username,
          password
        });
        // Success is handled by main process loading the home page
      } catch (error) {
        console.error('Connection error:', error);
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        
        if (loginError) {
          loginError.textContent = error.message || 'Connection failed';
          loginError.style.display = 'block';
        }
      }
    });
  } else {
    console.error('Login form not found');
  }
});