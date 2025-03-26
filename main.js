const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const { Client } = require('pg');
const { spawn } = require('child_process');
const fs = require('fs');

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

  // In main.js - Update the getTables function

  // Get tables for a database
  ipcMain.handle('getTables', async (event, dbName) => {
    try {
      if (!pgClient) {
        // Connection is missing - try to reconnect using stored credentials
        if (global.connectionInfo) {
          console.log('Reconnecting with stored credentials for user:', global.connectionInfo.user);

          // Create a new connection to PostgreSQL using stored credentials
          pgClient = new Client({
            host: global.connectionInfo.host,
            port: global.connectionInfo.port,
            user: global.connectionInfo.user,
            password: global.connectionInfo.password, // This should be stored securely
            database: 'postgres' // Connect to default postgres database first
          });

          await pgClient.connect();
        } else {
          throw new Error('Not connected to PostgreSQL and no stored credentials');
        }
      }

      // Close the existing connection
      await pgClient.end();

      // Create a new connection to the selected database
      pgClient = new Client({
        host: global.connectionInfo.host,
        port: global.connectionInfo.port,
        user: global.connectionInfo.user,
        password: global.connectionInfo.password,
        database: dbName // Connect directly to the selected database
      });

      // Connect to the database
      await pgClient.connect();
      console.log(`Connected to database: ${dbName}`);

      // Update the global connection info
      global.connectionInfo.database = dbName;
      global.connectionInfo.currentDb = dbName;

      // Now query for tables in this database
      const query = `
      SELECT table_name AS name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

      const result = await pgClient.query(query);
      console.log(`Found ${result.rows.length} tables in ${dbName}`);
      return result.rows;
    } catch (error) {
      console.error(`Error fetching tables for ${dbName}:`, error);
      throw error;
    }
  });

  // Update the connect function to store password securely
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
        password: credentials.password, // Store password in memory for reconnection
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
  // Get columns for a table
  ipcMain.handle('getColumns', async (event, dbName, tableName) => {
    try {
      if (!pgClient) {
        throw new Error('Not connected to PostgreSQL');
      }

      // Ensure we're connected to the right database
      if (global.connectionInfo.database !== dbName) {
        // Close the existing connection
        await pgClient.end();

        // Create a new connection to the selected database
        pgClient = new Client({
          host: global.connectionInfo.host,
          port: global.connectionInfo.port,
          user: global.connectionInfo.user,
          password: global.connectionInfo.password,
          database: dbName // Connect directly to the selected database
        });

        // Connect to the database
        await pgClient.connect();
        console.log(`Connected to database: ${dbName} for column query`);

        // Update the global connection info
        global.connectionInfo.database = dbName;
        global.connectionInfo.currentDb = dbName;
      }

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
      console.log(`Found ${result.rows.length} columns in table ${tableName}`);
      return result.rows;
    } catch (error) {
      console.error(`Error fetching columns for ${tableName}:`, error);
      throw error;
    }
  });

  // Create a new database
  ipcMain.handle('createDatabase', async (event, options) => {
    try {
      if (!pgClient) {
        throw new Error('Not connected to PostgreSQL');
      }

      // Validate options
      if (!options.name) {
        throw new Error('Database name is required');
      }

      // Build create database query
      let query = `CREATE DATABASE "${options.name}"`;

      // Add owner if specified
      if (options.owner) {
        query += ` OWNER "${options.owner}"`;
      }

      // Add encoding if specified
      if (options.encoding) {
        query += ` ENCODING '${options.encoding}'`;
      }

      // Add template if specified
      if (options.template) {
        query += ` TEMPLATE ${options.template}`;
      }

      console.log('Creating database with query:', query);

      // Execute query
      await pgClient.query(query);

      return { success: true };
    } catch (error) {
      console.error(`Error creating database ${options.name}:`, error);
      throw error;
    }
  });

  // Select backup file
  ipcMain.handle('selectBackupFile', async () => {
    if (!mainWindow) {
      throw new Error('No active window');
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select PostgreSQL Backup File',
      filters: [
        { name: 'PostgreSQL Backup', extensions: ['backup'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    return {
      canceled: result.canceled,
      filePath: result.filePaths[0]
    };
  });

  // Restore database from backup (fixed version)
  ipcMain.handle('restoreDatabase', async (event, options) => {
    try {
      if (!pgClient) {
        throw new Error('Not connected to PostgreSQL');
      }

      // Validate options
      if (!options.database) {
        throw new Error('Target database is required');
      }

      if (!options.backupFile) {
        throw new Error('Backup file is required');
      }

      // Check if file exists
      if (!fs.existsSync(options.backupFile)) {
        throw new Error(`Backup file not found: ${options.backupFile}`);
      }

      // Get connection info for pg_restore
      const connInfo = global.connectionInfo;

      if (!connInfo) {
        throw new Error('Connection information not available');
      }

      // Determine PostgreSQL bin directory - this is important for finding pg_restore
      // For development, we'll log more information to help troubleshoot
      console.log('Connection info:', {
        host: connInfo.host,
        port: connInfo.port,
        user: connInfo.user,
        database: options.database
      });

      // Build pg_restore command args
      const args = [
        `-h`, connInfo.host,
        `-p`, connInfo.port.toString(),
        `-U`, connInfo.user,
        `-d`, options.database,
        `-v` // verbose mode
      ];

      // Add optional args
      if (options.clean) {
        args.push(`--clean`);
      }

      if (options.singleTransaction) {
        args.push(`--single-transaction`);
      }

      // Add format specification, since pgAdmin backups are usually in custom format
      args.push(`-F`, `c`);

      // Add backup file path
      args.push(options.backupFile);

      console.log('Running pg_restore with command:', 'pg_restore', args.join(' '));

      // Create environment variables with password
      const env = { ...process.env };
      if (connInfo.password) {
        env.PGPASSWORD = connInfo.password;
      }

      // Log environment variables (excluding password)
      console.log('Environment PATH:', env.PATH);

      // Spawn pg_restore process - we need to make sure we're using the correct path
      // For different operating systems
      let pgRestoreBin = 'pg_restore';

      // On Windows, we might need to use full path to pg_restore.exe
      if (process.platform === 'win32') {
        // Try common installation directories
        const possiblePaths = [
          'C:\\Program Files\\PostgreSQL\\latest\\bin\\pg_restore.exe',
          'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_restore.exe',
          'C:\\Program Files\\PostgreSQL\\13\\bin\\pg_restore.exe',
          'C:\\Program Files\\PostgreSQL\\12\\bin\\pg_restore.exe',
        ];

        for (const path of possiblePaths) {
          if (fs.existsSync(path)) {
            pgRestoreBin = path;
            break;
          }
        }
      }

      // On macOS, pg_restore is often installed via Homebrew
      if (process.platform === 'darwin') {
        const possiblePaths = [
          '/usr/local/bin/pg_restore',
          '/opt/homebrew/bin/pg_restore',
          '/Applications/PostgreSQL/bin/pg_restore'
        ];

        for (const path of possiblePaths) {
          if (fs.existsSync(path)) {
            pgRestoreBin = path;
            break;
          }
        }
      }

      console.log(`Using pg_restore binary: ${pgRestoreBin}`);

      const pgRestore = spawn(pgRestoreBin, args, {
        env,
        shell: true // Using shell can help with path resolution
      });

      let stdoutOutput = '';
      let stderrOutput = '';
      let percent = 0;

      // Handle stdout
      pgRestore.stdout.on('data', (data) => {
        const text = data.toString();
        stdoutOutput += text;
        console.log(`pg_restore stdout: ${text}`);

        // Update progress (simulated since pg_restore doesn't provide progress)
        percent += 2;
        if (percent > 95) percent = 95;

        mainWindow.webContents.send('restoreProgress', {
          percent,
          message: 'Restoring database...'
        });
      });

      // Handle stderr
      pgRestore.stderr.on('data', (data) => {
        const text = data.toString();
        stderrOutput += text;
        console.log(`pg_restore stderr: ${text}`);

        // Update progress message with current operation
        if (text.includes('processing')) {
          mainWindow.webContents.send('restoreProgress', {
            percent,
            message: text.split('\n')[0] || 'Restoring database...'
          });
        }
      });

      // Handle process completion
      return new Promise((resolve, reject) => {
        pgRestore.on('close', (code) => {
          console.log(`pg_restore process exited with code ${code}`);

          // In pg_restore, non-zero exit codes might still be successful restores
          // with warnings or non-fatal errors
          if (code === 0) {
            // Complete progress
            mainWindow.webContents.send('restoreProgress', {
              percent: 100,
              message: 'Restore completed successfully'
            });

            resolve({
              success: true,
              output: stdoutOutput,
              warnings: stderrOutput
            });
          } else {
            // Check if we have fatal errors or just warnings
            if (stderrOutput.includes('errors ignored on restore')) {
              // This is usually just a warning, many restores still work correctly
              console.log('pg_restore completed with warnings:', stderrOutput);

              mainWindow.webContents.send('restoreProgress', {
                percent: 100,
                message: 'Restore completed with warnings'
              });

              resolve({
                success: true,
                output: stdoutOutput,
                warnings: stderrOutput,
                warningCount: code
              });
            } else {
              // Actual error
              const errorMessage = `pg_restore failed with code ${code}. Error details: ${stderrOutput}`;
              console.error(errorMessage);
              reject(new Error(errorMessage));
            }
          }
        });

        pgRestore.on('error', (error) => {
          const errorMessage = `Failed to execute pg_restore: ${error.message}`;
          console.error(errorMessage);
          reject(new Error(errorMessage));
        });
      });
    } catch (error) {
      console.error(`Error restoring database ${options.database}:`, error);
      throw error;
    }
  });
} // <-- This closing brace was missing

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