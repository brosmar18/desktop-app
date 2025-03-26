// Preload script for Electron
const { contextBridge, ipcRenderer } = require('electron');

// List of valid channels for sending/receiving messages with main process
const validSendChannels = ['pgConnect', 'logout', 'setTheme'];
const validReceiveChannels = ['pgConnectResponse', 'logoutResponse', 'themeChanged', 'restoreProgress'];
const validInvokeChannels = ['getConnectionInfo', 'getDatabases', 'getTables', 'getColumns', 
                         'createDatabase', 'selectBackupFile', 'restoreDatabase', 'cloneDatabase',
                         'executeQuery']; // Add executeQuery to the list

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Send a message to the main process
    send: (channel, data) => {
      if (validSendChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    
    // Receive a message from the main process
    receive: (channel, func) => {
      if (validReceiveChannels.includes(channel)) {
        // Remove previous listeners to avoid duplicates
        ipcRenderer.removeAllListeners(channel);
        
        // Add the new listener
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    
    // Get connection info from the main process (async)
    getConnectionInfo: async () => {
      if (validInvokeChannels.includes('getConnectionInfo')) {
        return await ipcRenderer.invoke('getConnectionInfo');
      }
    },
    
    // Database operations
    getDatabases: async () => {
      if (validInvokeChannels.includes('getDatabases')) {
        return await ipcRenderer.invoke('getDatabases');
      }
    },
    
    getTables: async (dbName) => {
      if (validInvokeChannels.includes('getTables')) {
        return await ipcRenderer.invoke('getTables', dbName);
      }
    },
    
    getColumns: async (dbName, tableName) => {
      if (validInvokeChannels.includes('getColumns')) {
        return await ipcRenderer.invoke('getColumns', dbName, tableName);
      }
    },
    
    // Create a new database
    createDatabase: async (options) => {
      if (validInvokeChannels.includes('createDatabase')) {
        return await ipcRenderer.invoke('createDatabase', options);
      }
    },
    
    // Select backup file using dialog
    selectBackupFile: async () => {
      if (validInvokeChannels.includes('selectBackupFile')) {
        return await ipcRenderer.invoke('selectBackupFile');
      }
    },
    
    // Restore database from backup
    restoreDatabase: async (options) => {
      if (validInvokeChannels.includes('restoreDatabase')) {
        return await ipcRenderer.invoke('restoreDatabase', options);
      }
    },
    
    // Clone database
    cloneDatabase: async (options) => {
      if (validInvokeChannels.includes('cloneDatabase')) {
        console.log('preload.js cloneDatabase called with:', options);
        return await ipcRenderer.invoke('cloneDatabase', options);
      }
    },
    
    // Execute SQL query (NEW)
    executeQuery: async (dbName, query) => {
      console.log('preload.js executeQuery called with dbName:', dbName);
      if (validInvokeChannels.includes('executeQuery')) {
        return await ipcRenderer.invoke('executeQuery', dbName, query);
      } else {
        console.error('executeQuery not in validInvokeChannels!');
        throw new Error('executeQuery not registered as valid channel');
      }
    }
  }
);

// Notify the renderer process that the preload script has loaded
console.log('Preload script loaded successfully');