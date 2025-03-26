// Preload script for Electron
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Send a message to the main process
    send: (channel, data) => {
      // Only allow certain channels for security reasons
      const validSendChannels = ['pgConnect', 'logout', 'setTheme'];
      if (validSendChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    
    // Receive a message from the main process
    receive: (channel, func) => {
      const validReceiveChannels = [
        'pgConnectResponse', 
        'logoutResponse', 
        'themeChanged',
        'restoreProgress'
      ];
      
      if (validReceiveChannels.includes(channel)) {
        // Remove previous listeners to avoid duplicates
        ipcRenderer.removeAllListeners(channel);
        
        // Add the new listener
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    
    // Get connection info from the main process (async)
    getConnectionInfo: async () => {
      return await ipcRenderer.invoke('getConnectionInfo');
    },
    
    // Database operations
    getDatabases: async () => {
      return await ipcRenderer.invoke('getDatabases');
    },
    
    getTables: async (dbName) => {
      return await ipcRenderer.invoke('getTables', dbName);
    },
    
    getColumns: async (dbName, tableName) => {
      return await ipcRenderer.invoke('getColumns', dbName, tableName);
    },
    
    // Create a new database
    createDatabase: async (options) => {
      return await ipcRenderer.invoke('createDatabase', options);
    },
    
    // Select backup file using dialog
    selectBackupFile: async () => {
      return await ipcRenderer.invoke('selectBackupFile');
    },
    
    // Restore database from backup
    restoreDatabase: async (options) => {
      return await ipcRenderer.invoke('restoreDatabase', options);
    },
    
    // Clone database (new method)
    cloneDatabase: async (options) => {
      console.log('preload.js cloneDatabase called with:', options);
      return await ipcRenderer.invoke('cloneDatabase', options);
    }
  }
);

// Notify the renderer process that the preload script has loaded
console.log('Preload script loaded successfully');