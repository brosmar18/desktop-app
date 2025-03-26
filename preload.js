// Preload script for Electron
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Send a message to the main process
    send: (channel, data) => {
      // Only allow certain channels for security reasons
      const validChannels = ['pgConnect', 'logout', 'setTheme'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    // Receive a message from the main process
    receive: (channel, func) => {
      const validChannels = ['pgConnectResponse', 'logoutResponse', 'themeChanged'];
      if (validChannels.includes(channel)) {
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
    }
  }
);

// Notify the renderer process that the preload script has loaded
console.log('Preload script loaded successfully');