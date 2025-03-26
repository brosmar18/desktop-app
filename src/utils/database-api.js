/**
 * Database API utility
 * Provides a cleaner interface to the database-related IPC API
 */

// Connect to PostgreSQL server
function connectToDatabase(credentials) {
  return new Promise((resolve, reject) => {
    if (!window.api) {
      reject(new Error('API not available'));
      return;
    }

    // Send credentials to main process
    window.api.send('pgConnect', credentials);

    // Handle response
    const responseHandler = (response) => {
      if (!response.success) {
        reject(new Error(response.error || 'Connection failed'));
      } else {
        resolve(response);
      }
    };

    // Set up one-time listener
    window.api.receive('pgConnectResponse', responseHandler);
  });
}

// Get connection information
async function getConnectionInfo() {
  if (!window.api) {
    throw new Error('API not available');
  }

  try {
    return await window.api.getConnectionInfo();
  } catch (error) {
    console.error('Error fetching connection info:', error);
    throw error;
  }
}

// Get all databases
async function getDatabases() {
  if (!window.api) {
    throw new Error('API not available');
  }

  try {
    return await window.api.getDatabases();
  } catch (error) {
    console.error('Error fetching databases:', error);
    throw error;
  }
}

// Get tables for a database
async function getTables(dbName) {
  if (!window.api) {
    throw new Error('API not available');
  }

  try {
    return await window.api.getTables(dbName);
  } catch (error) {
    console.error(`Error fetching tables for ${dbName}:`, error);
    throw error;
  }
}

// Get columns for a table
async function getColumns(dbName, tableName) {
  if (!window.api) {
    throw new Error('API not available');
  }

  try {
    return await window.api.getColumns(dbName, tableName);
  } catch (error) {
    console.error(`Error fetching columns for ${tableName}:`, error);
    throw error;
  }
}

// Create a new database
async function createDatabase(options) {
  if (!window.api) {
    throw new Error('API not available');
  }

  try {
    return await window.api.createDatabase(options);
  } catch (error) {
    console.error(`Error creating database ${options.name}:`, error);
    throw error;
  }
}

// Restore database from backup
async function restoreDatabase(options) {
  if (!window.api) {
    throw new Error('API not available');
  }

  try {
    return await window.api.restoreDatabase(options);
  } catch (error) {
    console.error(`Error restoring database ${options.database}:`, error);
    throw error;
  }
}

// Logout from the application
function logout() {
  return new Promise((resolve, reject) => {
    if (!window.api) {
      reject(new Error('API not available'));
      return;
    }

    window.api.send('logout');

    // Set up one-time listener for logout response
    window.api.receive('logoutResponse', (response) => {
      if (response.success) {
        resolve();
      } else {
        reject(new Error('Logout failed'));
      }
    });
  });
}

// Clone a database
async function cloneDatabase(sourceDb, targetDb, withData) {
  if (!window.api) {
    throw new Error('API not available');
  }

  try {
    return await window.api.cloneDatabase({
      sourceDb,
      targetDb,
      withData
    });
  } catch (error) {
    console.error(`Error cloning database ${sourceDb} to ${targetDb}:`, error);
    throw error;
  }
}

// Execute SQL query (NEW)
async function executeQuery(dbName, query) {
  if (!window.api) {
    throw new Error('API not available');
  }

  if (!window.api.executeQuery) {
    throw new Error('executeQuery method not available in API');
  }

  try {
    console.log(`Calling API to execute query on ${dbName}`);
    return await window.api.executeQuery(dbName, query);
  } catch (error) {
    console.error(`Error executing query on ${dbName}:`, error);
    throw error;
  }
}