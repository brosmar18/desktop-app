const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const { Client } = require('pg');

// Keep a global reference of the window object to prevent it from being garbage collected
let mainWindow;
let pgClient = null;
// Store connection info globally
global.connectionInfo = null;

// ===== Window Management =====

// Create the browser window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#071412', // Dark background by default
    webPreferences: {
      nodeIntegration: false, // For security reasons
      contextIsolation: true, // Protect against prototype pollution
      preload: path.join(__dirname, 'preload.js') // Use the preload script
    },
    // Modern look and feel
    frame: true,
    titleBarStyle: 'hiddenInset', // Gives a more modern look on macOS
    autoHideMenuBar: false
  });

  // Load the index.html file (login page)
  loadLoginPage();

  // Open DevTools in development
  mainWindow.webContents.openDevTools(); // Always open for debugging

  // Handle window being closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    // Close PostgreSQL connection if exists
    closePgConnection();
  });
}

// Load the login page
function loadLoginPage() {
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));
}

// Load the home page
function loadHomePage() {
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'src', 'pages', 'Home.html'),
    protocol: 'file:',
    slashes: true
  }));
}

// ===== Database Connection =====

// Establish PostgreSQL connection
async function connectToPg(credentials) {
  console.log('Attempting to connect to PostgreSQL:', {
    host: credentials.host,
    port: credentials.port,
    user: credentials.user,
    // Don't log the password
    database: 'postgres' // Default database
  });

  // Close existing connection if any
  await closePgConnection();

  // Create new client
  pgClient = new Client({
    host: credentials.host,
    port: credentials.port,
    user: credentials.user,
    password: credentials.password,
    database: 'postgres' // Default to postgres database
  });

  try {
    // Connect to PostgreSQL
    await pgClient.connect();
    console.log('Successfully connected to PostgreSQL');

    // Test connection with a simple query
    const res = await pgClient.query('SELECT current_database() as db, current_user as user');
    console.log('Query result:', res.rows[0]);

    // Store connection info for the home page
    global.connectionInfo = {
      host: credentials.host,
      port: credentials.port,
      user: credentials.user,
      database: 'postgres',
      connectedAs: res.rows[0].user,
      currentDb: res.rows[0].db
    };

    return { success: true, data: res.rows[0] };
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    
    // Clean up failed connection
    await closePgConnection();
    
    return { success: false, error: error.message || 'Failed to connect to PostgreSQL server' };
  }
}

// Close PostgreSQL connection
async function closePgConnection() {
  if (pgClient) {
    try {
      await pgClient.end();
      console.log('PostgreSQL connection closed');
    } catch (err) {
      console.error('Error closing existing connection:', err);
    }
    pgClient = null;
  }
}

// ===== IPC Handlers =====

// Set up all IPC handlers
function setupIpcHandlers() {
  // Handle getting connection info (synchronous)
  ipcMain.handle('getConnectionInfo', async () => {
    return global.connectionInfo;
  });

  // Handle PostgreSQL connection
  ipcMain.on('pgConnect', async (event, credentials) => {
    const result = await connectToPg(credentials);
    
    if (result.success) {
      // Success - Load home page
      loadHomePage();
    } else {
      // Send error back to renderer
      mainWindow.webContents.send('pgConnectResponse', {
        success: false,
        error: result.error
      });
    }
  });

  // Handle logout
  ipcMain.on('logout', async (event) => {
    console.log('Logout requested');

    // Close PostgreSQL connection
    await closePgConnection();

    // Clear connection info
    global.connectionInfo = null;

    // Load login page
    loadLoginPage();

    // Send response to renderer
    mainWindow.webContents.send('logoutResponse', { success: true });
  });

  // Handle theme change
  ipcMain.on('setTheme', (event, isDarkMode) => {
    // You could save this preference
    console.log('Theme changed to:', isDarkMode ? 'dark' : 'light');
  });

  // Get all databases
  ipcMain.handle('getDatabases', async () => {
    try {
      if (!pgClient) {
        throw new Error('Not connected to PostgreSQL');
      }

      // Use a simpler query that works reliably across PostgreSQL versions
      const query = `
        SELECT datname AS name
        FROM pg_database
        WHERE datistemplate = false
        ORDER BY datname
      `;
      const result = await pgClient.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching databases:', error);
      throw error;
    }
  });

  // Get tables for a database
  ipcMain.handle('getTables', async (event, dbName) => {
    try {
      if (!pgClient) {
        throw new Error('Not connected to PostgreSQL');
      }

      // Switch to the selected database
      await pgClient.query(`SET search_path TO ${dbName}`);

      const query = `
        SELECT table_name AS name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;

      const result = await pgClient.query(query);
      return result.rows;
    } catch (error) {
      console.error(`Error fetching tables for ${dbName}:`, error);
      throw error;
    }
  });

  // Get columns for a table
  ipcMain.handle('getColumns', async (event, dbName, tableName) => {
    try {
      if (!pgClient) {
        throw new Error('Not connected to PostgreSQL');
      }

      // Switch to the selected database
      await pgClient.query(`SET search_path TO ${dbName}`);

      const query = `
        SELECT 
          column_name AS name, 
          data_type AS type,
          CASE WHEN is_nullable = 'YES' THEN true ELSE false END AS nullable,
          column_default AS default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `;

      const result = await pgClient.query(query, [tableName]);
      return result.rows;
    } catch (error) {
      console.error(`Error fetching columns for ${tableName}:`, error);
      throw error;
    }
  });
}

// ===== App Lifecycle =====

// Create window when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers();

  // On macOS, recreate window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});