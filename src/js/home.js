// Wait for DOM to be fully loaded before executing code
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize theme toggle
    initTheme();
    
    const logoutBtn = document.getElementById('logout-btn');
    
    // Handle logout button click
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await logout();
          console.log('Logged out successfully');
        } catch (error) {
          console.error('Logout failed:', error);
        }
      });
    }
    
    // Fetch connection info from main process and update UI
    await loadConnectionInfo();
  });
  
  // Function to load connection info from main process
  async function loadConnectionInfo() {
    try {
      const connectionInfo = await getConnectionInfo();
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