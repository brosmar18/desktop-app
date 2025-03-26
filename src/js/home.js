// Wait for DOM to be fully loaded before executing code
document.addEventListener('DOMContentLoaded', async () => {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const body = document.body;
    const logoutBtn = document.getElementById('logout-btn');
    
    // Check system preference for dark/light mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    body.className = prefersDark ? 'dark-mode' : 'light-mode';
    themeToggleBtn.textContent = prefersDark ? '☀️' : '🌙';
    
    // Toggle theme when button is clicked
    themeToggleBtn.addEventListener('click', () => {
      const isDarkMode = body.classList.contains('dark-mode');
      body.className = isDarkMode ? 'light-mode' : 'dark-mode';
      themeToggleBtn.textContent = isDarkMode ? '🌙' : '☀️';
      
      // Notify main process of theme change
      if (window.api) {
        window.api.send('setTheme', !isDarkMode);
      }
    });
    
    // Handle logout button click
    logoutBtn.addEventListener('click', () => {
      if (window.api) {
        window.api.send('logout');
      }
    });
    
    // Fetch connection info from main process and update UI
    await loadConnectionInfo();
  });
  
  // Function to load connection info from main process
  async function loadConnectionInfo() {
    try {
      const connectionInfo = await window.api.getConnectionInfo();
      console.log('Connection info:', connectionInfo);
      
      if (connectionInfo) {
        document.getElementById('conn-host').textContent = connectionInfo.host;
        document.getElementById('conn-port').textContent = connectionInfo.port;
        document.getElementById('conn-user').textContent = connectionInfo.user;
        document.getElementById('conn-db').textContent = connectionInfo.database;
        document.getElementById('conn-connected-as').textContent = connectionInfo.connectedAs;
      } else {
        console.error('No connection info available');
      }
    } catch (error) {
      console.error('Error fetching connection info:', error);
    }
  }