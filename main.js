const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const { Client } = require('pg');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

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
  // mainWindow.webContents.openDevTools(); 


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
      password: credentials.password,
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
  console.log('Setting up IPC handlers...');
  
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

      // Modified query to include column counts for each table
      const query = `
        SELECT 
          t.table_name AS name,
          COUNT(c.column_name) AS column_count
        FROM 
          information_schema.tables t
        LEFT JOIN 
          information_schema.columns c 
        ON 
          t.table_name = c.table_name AND 
          t.table_schema = c.table_schema
        WHERE 
          t.table_schema = 'public'
        GROUP BY 
          t.table_name
        ORDER BY 
          t.table_name
      `;

      const result = await pgClient.query(query);
      console.log(`Found ${result.rows.length} tables in ${dbName}`);
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

  // Clone database
  ipcMain.handle('cloneDatabase', async (event, options) => {
    try {
      if (!pgClient) {
        throw new Error('Not connected to PostgreSQL');
      }

      // Validate options
      if (!options.sourceDb || !options.targetDb) {
        throw new Error('Source and target database names are required');
      }

      if (options.sourceDb === options.targetDb) {
        throw new Error('Source and target database names must be different');
      }

      // Check if target database already exists
      const checkQuery = `
      SELECT datname FROM pg_database WHERE datname = $1
      `;
      const checkResult = await pgClient.query(checkQuery, [options.targetDb]);

      if (checkResult.rows.length > 0) {
        throw new Error(`Database "${options.targetDb}" already exists`);
      }

      console.log(`Cloning database ${options.sourceDb} to ${options.targetDb} (with data: ${options.withData})`);

      // Create new database 
      await pgClient.query(`CREATE DATABASE "${options.targetDb}"`);

      // Clone schema and data if requested
      if (options.withData) {
        // We need to use pg_dump and pg_restore for a full clone
        const connInfo = global.connectionInfo;

        // Create environment variables with password for pg_dump and pg_restore
        const env = { ...process.env };
        if (connInfo.password) {
          env.PGPASSWORD = connInfo.password;
        }

        // Create a temporary file for the dump
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `pg_dump_${Date.now()}.custom`);

        // Determine pg_dump and pg_restore commands based on OS
        let pgDumpBin = 'pg_dump';
        let pgRestoreBin = 'pg_restore';

        if (process.platform === 'win32') {
          // Try common Windows installation paths
          const possiblePaths = [
            'C:\\Program Files\\PostgreSQL\\14\\bin',
            'C:\\Program Files\\PostgreSQL\\13\\bin',
            'C:\\Program Files\\PostgreSQL\\12\\bin'
          ];

          for (const basePath of possiblePaths) {
            const dumpPath = path.join(basePath, 'pg_dump.exe');
            const restorePath = path.join(basePath, 'pg_restore.exe');

            if (fs.existsSync(dumpPath) && fs.existsSync(restorePath)) {
              pgDumpBin = dumpPath;
              pgRestoreBin = restorePath;
              break;
            }
          }
        } else if (process.platform === 'darwin') {
          // Try common macOS paths
          const possiblePaths = [
            '/usr/local/bin',
            '/opt/homebrew/bin',
            '/Applications/PostgreSQL/bin'
          ];

          for (const basePath of possiblePaths) {
            const dumpPath = path.join(basePath, 'pg_dump');
            const restorePath = path.join(basePath, 'pg_restore');

            if (fs.existsSync(dumpPath) && fs.existsSync(restorePath)) {
              pgDumpBin = dumpPath;
              pgRestoreBin = restorePath;
              break;
            }
          }
        }

        console.log(`Using pg_dump at: ${pgDumpBin}`);
        console.log(`Using pg_restore at: ${pgRestoreBin}`);

        // Build pg_dump command args
        const dumpArgs = [
          `-h`, connInfo.host,
          `-p`, connInfo.port.toString(),
          `-U`, connInfo.user,
          `-F`, `c`, // custom format
          `-f`, tempFile,
          options.sourceDb
        ];

        console.log('Running pg_dump command:', pgDumpBin, dumpArgs.join(' '));

        // Run pg_dump to create backup
        await new Promise((resolve, reject) => {
          const dumpProcess = spawn(pgDumpBin, dumpArgs, { env });

          let stdoutData = '';
          let stderrData = '';

          dumpProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
            console.log(`pg_dump stdout: ${data}`);
          });

          dumpProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
            console.log(`pg_dump stderr: ${data}`);
          });

          dumpProcess.on('close', (code) => {
            if (code === 0) {
              console.log('pg_dump completed successfully');
              resolve();
            } else {
              console.error(`pg_dump exited with code ${code}`);
              reject(new Error(`pg_dump failed with code ${code}. Error: ${stderrData}`));
            }
          });

          dumpProcess.on('error', (error) => {
            console.error('Failed to start pg_dump:', error);
            reject(new Error(`Failed to execute pg_dump: ${error.message}`));
          });
        });

        // Build pg_restore command args
        const restoreArgs = [
          `-h`, connInfo.host,
          `-p`, connInfo.port.toString(),
          `-U`, connInfo.user,
          `-d`, options.targetDb,
          `-v`, // verbose mode
          tempFile
        ];

        console.log('Running pg_restore command:', pgRestoreBin, restoreArgs.join(' '));

        // Run pg_restore to restore backup to the new database
        await new Promise((resolve, reject) => {
          const restoreProcess = spawn(pgRestoreBin, restoreArgs, { env });

          let stdoutData = '';
          let stderrData = '';

          restoreProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
            console.log(`pg_restore stdout: ${data}`);
          });

          restoreProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
            console.log(`pg_restore stderr: ${data}`);
          });

          restoreProcess.on('close', (code) => {
            // pg_restore can have non-zero exit codes for non-fatal errors/warnings
            console.log(`pg_restore exited with code ${code}`);

            if (code === 0 || stderrData.includes('errors ignored on restore')) {
              console.log('pg_restore completed successfully with possible warnings');
              resolve();
            } else {
              reject(new Error(`pg_restore failed with code ${code}. Error: ${stderrData}`));
            }
          });

          restoreProcess.on('error', (error) => {
            console.error('Failed to start pg_restore:', error);
            reject(new Error(`Failed to execute pg_restore: ${error.message}`));
          });
        });

        // Clean up the temporary file
        try {
          fs.unlinkSync(tempFile);
          console.log(`Removed temporary file: ${tempFile}`);
        } catch (error) {
          console.error(`Warning: Could not remove temporary file ${tempFile}:`, error);
          // Non-fatal error, continue
        }
      } else {
        // Schema-only clone using SQL (simpler approach)
        console.log('Performing schema-only clone...');

        // This direct SQL approach transfers database structure without data
        // It's not as comprehensive as pg_dump, but works for basic schema cloning

        // First, we'll get a list of schemas to clone
        const schemasQuery = await pgClient.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT LIKE 'pg_%' 
        AND schema_name != 'information_schema'
      `);

        // Create a new connection to the target database
        const targetClient = new Client({
          host: global.connectionInfo.host,
          port: global.connectionInfo.port,
          user: global.connectionInfo.user,
          password: global.connectionInfo.password,
          database: options.targetDb
        });

        await targetClient.connect();

        try {
          // Create schemas in the target database
          for (const schemaRow of schemasQuery.rows) {
            const schemaName = schemaRow.schema_name;
            if (schemaName !== 'public') { // 'public' already exists
              await targetClient.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
            }
          }

          // Now, we need to get table definitions from the source database and create them in the target
          // We'll use a tempdb connection to the source database
          const sourceClient = new Client({
            host: global.connectionInfo.host,
            port: global.connectionInfo.port,
            user: global.connectionInfo.user,
            password: global.connectionInfo.password,
            database: options.sourceDb
          });

          await sourceClient.connect();

          try {
            // Get list of tables
            const tablesQuery = await sourceClient.query(`
            SELECT table_schema, table_name
            FROM information_schema.tables
            WHERE table_schema NOT LIKE 'pg_%'
            AND table_schema != 'information_schema'
            AND table_type = 'BASE TABLE'
          `);

            // Clone each table structure
            for (const tableRow of tablesQuery.rows) {
              const schema = tableRow.table_schema;
              const table = tableRow.table_name;

              // Get CREATE TABLE statement
              const ddlQuery = await sourceClient.query(`
              SELECT pg_get_ddl('${schema}.${table}'::regclass) as ddl
            `);

              if (ddlQuery.rows.length > 0 && ddlQuery.rows[0].ddl) {
                // Execute the CREATE TABLE statement in the target database
                await targetClient.query(ddlQuery.rows[0].ddl);
              }
            }
          } finally {
            await sourceClient.end();
          }
        } finally {
          await targetClient.end();
        }
      }

      // Return success
      return { success: true };
    } catch (error) {
      console.error(`Error cloning database ${options.sourceDb} to ${options.targetDb}:`, error);
      return { success: false, error: error.message };
    }
  });

  // Restore database from backup
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

  // Execute SQL query - NEW
  console.log('Registering executeQuery handler...');
  ipcMain.handle('executeQuery', async (event, dbName, query) => {
    console.log(`IPC: Executing query on ${dbName}: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`);
    
    let tempClient = null;
    
    try {
      // Create a dedicated client for this query
      tempClient = new Client({
        host: global.connectionInfo.host,
        port: global.connectionInfo.port,
        user: global.connectionInfo.user,
        password: global.connectionInfo.password,
        database: dbName
      });

      // Connect with timeout
      await Promise.race([
        tempClient.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        )
      ]);
      
      console.log(`Connected to database: ${dbName} for query execution`);
      
      // Execute the query with timeout
      const queryPromise = tempClient.query(query);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query execution timeout (30s)')), 30000)
      );
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      console.log(`Query executed, received ${result.rowCount || 0} rows`);
      
      // Process the result
      if (result.command === 'SELECT') {
        return {
          success: true,
          command: result.command,
          rowCount: result.rowCount,
          rows: result.rows,
          columns: result.fields.map(field => field.name)
        };
      } else {
        return {
          success: true,
          command: result.command,
          rowCount: result.rowCount || 0,
          message: `${result.command} completed. ${result.rowCount || 0} rows affected.`
        };
      }
    } catch (error) {
      console.error(`Error executing query on ${dbName}:`, error);
      return {
        success: false,
        error: error.message || 'Failed to execute query'
      };
    } finally {
      // Always close the temporary client to avoid connection leaks
      if (tempClient) {
        try {
          await tempClient.end();
          console.log('Temp client closed after query execution');
        } catch (err) {
          console.error('Error closing temp client:', err);
        }
      }
    }
  });
  
  console.log('IPC handlers setup completed');
}

// ===== App Lifecycle =====

// Create window when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  console.log('Setting up IPC handlers from app.whenReady()...');
  setupIpcHandlers();
  console.log('IPC handlers setup completed from app.whenReady()');

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