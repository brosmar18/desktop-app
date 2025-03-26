// Global variables to track state and modules
let currentDb = null;
let currentTable = null;
let allDatabases = [];
let currentTables = [];
let currentColumns = [];
let isRefreshing = false;
let modalManager = null;
let modalTemplates = null;

// Wait for DOM to be fully loaded before executing code
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize theme toggle
  initTheme();

  // Load the modal functionality using traditional approaches
  loadDependencies();

  setupLogout();
  setupSearch();
  setupTableViewInteractions();
  setupColumnViewInteractions();
  setupRefreshButton();

  // Initialize database context menu
  initDatabaseContextMenu();

  // Load databases on page load
  await loadDatabases();
});

// Load dependencies using script tags
function loadDependencies() {
  // Create and append modal.js script
  const modalScript = document.createElement('script');
  modalScript.src = '../utils/modal-global.js';
  modalScript.onload = () => {
    console.log('Modal manager loaded');
    // Now the globalModalManager will be available
    modalManager = window.globalModalManager;
  };
  document.head.appendChild(modalScript);

  // Create and append modal-templates.js script
  const templatesScript = document.createElement('script');
  templatesScript.src = '../utils/modal-templates-global.js';
  templatesScript.onload = () => {
    console.log('Modal templates loaded');
    // Now the global templates object will be available
    modalTemplates = window.modalTemplates;
  };
  document.head.appendChild(templatesScript);

  // Create and append database-operations.js script
  const dbOperationsScript = document.createElement('script');
  dbOperationsScript.src = '../services/database-operations.js';
  dbOperationsScript.onload = () => {
    console.log('Database operations service loaded');
  };
  document.head.appendChild(dbOperationsScript);
}

// Initialize the database context menu
function initDatabaseContextMenu() {
  // We need to create this as a global function now
  window.handleContextMenu = function (contextMenu, target) {
    const dbName = target.textContent || target.getAttribute('data-db-name');

    // Configure menu items with simplified labels
    const databaseMenuItems = [
      {
        label: 'Query',  // Changed from 'Connect' to 'Query'
        icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 9a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3A.5.5 0 0 1 6 9z"/><path d="M4.5 5a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-5a.5.5 0 0 0-.5-.5h-7zm0-1h7A1.5 1.5 0 0 1 13 5.5v5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 10.5v-5A1.5 1.5 0 0 1 4.5 4z"/></svg>',
        onClick: (target) => {
          const dbName = target.textContent || target.getAttribute('data-db-name');
          console.log(`Open SQL query interface for database: ${dbName}`);
          showSqlQueryModal(dbName);
        }
      },
      {
        label: 'Clone',
        icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>',
        onClick: (target) => {
          const dbName = target.textContent || target.getAttribute('data-db-name');
          console.log(`Clone database: ${dbName}`);
          showCloneModal(dbName);
        }
      },
      {
        label: 'Backup',
        icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/></svg>',
        onClick: (target) => {
          const dbName = target.textContent || target.getAttribute('data-db-name');
          console.log(`Backup database: ${dbName}`);
          showBackupModal(dbName);
        }
      },
      {
        label: 'Rename',
        icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>',
        onClick: (target) => {
          const dbName = target.textContent || target.getAttribute('data-db-name');
          console.log(`Rename database: ${dbName}`);
          showRenameModal(dbName);
        }
      },
      {
        label: 'Delete',
        icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>',
        danger: true,
        onClick: (target) => {
          const dbName = target.textContent || target.getAttribute('data-db-name');
          console.log(`Delete database: ${dbName}`);
          showDeleteModal(dbName);
        }
      }
    ];

    contextMenu.setMenuItems(databaseMenuItems);
  };

  // We'll use a dynamic import to load our module but convert the result to global
  const menuScript = document.createElement('script');
  menuScript.src = '../components/Menu-global.js';
  document.head.appendChild(menuScript);
}

// Global handler functions for modals
window.showCloneModal = function (dbName) {
  if (!window.globalModalManager || !window.modalTemplates) {
    console.error('Modal components not loaded yet');
    setTimeout(() => window.showCloneModal(dbName), 500);
    return;
  }

  window.globalModalManager.showModal(window.modalTemplates.getCloneDatabaseTemplate(dbName), {
    onSubmit: async (data) => {
      // Handle form submission
      console.log('Clone database form submitted:', data);

      // Validate that the names are different
      if (data.sourceDb === data.targetDb) {
        alert('Source and target database names must be different.');
        return;
      }

      // Check if the database already exists
      const exists = allDatabases.some(db => db.name.toLowerCase() === data.targetDb.toLowerCase());
      if (exists) {
        alert(`A database with the name "${data.targetDb}" already exists.`);
        return;
      }

      // Show loading indicator
      const loadingElement = document.createElement('div');
      loadingElement.className = 'modal-loading';
      loadingElement.innerHTML = '<div class="spinner"></div><p>Cloning database...</p>';
      document.body.appendChild(loadingElement);

      try {
        // Call the database operation service
        if (window.dbOperations) {
          const result = await window.dbOperations.cloneDatabase(
            data.sourceDb,
            data.targetDb,
            data.withData === 'true'
          );

          // Remove loading indicator
          document.body.removeChild(loadingElement);

          if (result.success) {
            alert(`Database "${data.sourceDb}" successfully cloned to "${data.targetDb}"`);

            // Refresh the database list
            await loadDatabases();
          } else {
            alert(`Failed to clone database: ${result.error}`);
          }
        } else {
          // Fallback for backward compatibility
          alert(`Clone functionality for "${data.sourceDb}" to "${data.targetDb}" with data=${data.withData} will be implemented in a future update.`);
          document.body.removeChild(loadingElement);
        }
      } catch (error) {
        // Remove loading indicator
        if (document.body.contains(loadingElement)) {
          document.body.removeChild(loadingElement);
        }
        alert(`Error: ${error.message || 'An unknown error occurred'}`);
      }
    }
  });
};

window.showBackupModal = function (dbName) {
  if (!window.globalModalManager || !window.modalTemplates) {
    console.error('Modal components not loaded yet');
    setTimeout(() => window.showBackupModal(dbName), 500);
    return;
  }

  window.globalModalManager.showModal(window.modalTemplates.getBackupDatabaseTemplate(dbName), {
    onSubmit: async (data) => {
      console.log('Backup database form submitted:', data);

      // Show loading indicator
      const loadingElement = document.createElement('div');
      loadingElement.className = 'modal-loading';
      loadingElement.innerHTML = '<div class="spinner"></div><p>Backing up database...</p>';
      document.body.appendChild(loadingElement);

      try {
        // Call the database operation service
        if (window.dbOperations) {
          const result = await window.dbOperations.backupDatabase(
            data.database,
            data.format,
            data.compression
          );

          // Remove loading indicator
          document.body.removeChild(loadingElement);

          if (result.success) {
            alert(`Database "${data.database}" successfully backed up`);
          } else {
            alert(`Failed to backup database: ${result.error}`);
          }
        } else {
          // Fallback for backward compatibility
          alert(`Backup functionality for "${data.database}" (format: ${data.format}, compression: ${data.compression}) will be implemented in a future update.`);
          document.body.removeChild(loadingElement);
        }
      } catch (error) {
        // Remove loading indicator
        if (document.body.contains(loadingElement)) {
          document.body.removeChild(loadingElement);
        }
        alert(`Error: ${error.message || 'An unknown error occurred'}`);
      }
    }
  });
};

window.showRenameModal = function (dbName) {
  if (!window.globalModalManager || !window.modalTemplates) {
    console.error('Modal components not loaded yet');
    setTimeout(() => window.showRenameModal(dbName), 500);
    return;
  }

  window.globalModalManager.showModal(window.modalTemplates.getRenameDatabaseTemplate(dbName), {
    onSubmit: async (data) => {
      console.log('Rename database form submitted:', data);

      if (!data.newName || data.newName.trim() === '') {
        alert('New database name cannot be empty.');
        return;
      }

      if (data.currentName === data.newName) {
        alert('New name is the same as the current name.');
        return;
      }

      const exists = allDatabases.some(db => db.name.toLowerCase() === data.newName.toLowerCase());
      if (exists) {
        alert(`A database with the name "${data.newName}" already exists.`);
        return;
      }

      // Show loading indicator
      const loadingElement = document.createElement('div');
      loadingElement.className = 'modal-loading';
      loadingElement.innerHTML = '<div class="spinner"></div><p>Renaming database...</p>';
      document.body.appendChild(loadingElement);

      try {
        // Call the database operation service
        if (window.dbOperations) {
          const result = await window.dbOperations.renameDatabase(
            data.currentName,
            data.newName
          );

          // Remove loading indicator
          document.body.removeChild(loadingElement);

          if (result.success) {
            alert(`Database "${data.currentName}" successfully renamed to "${data.newName}"`);

            // Refresh the database list
            await loadDatabases();
          } else {
            alert(`Failed to rename database: ${result.error}`);
          }
        } else {
          // Fallback for backward compatibility
          alert(`Rename functionality for "${data.currentName}" to "${data.newName}" will be implemented in a future update.`);
          document.body.removeChild(loadingElement);
        }
      } catch (error) {
        // Remove loading indicator
        if (document.body.contains(loadingElement)) {
          document.body.removeChild(loadingElement);
        }
        alert(`Error: ${error.message || 'An unknown error occurred'}`);
      }
    }
  });
};

window.showDeleteModal = function (dbName) {
  if (!window.globalModalManager || !window.modalTemplates) {
    console.error('Modal components not loaded yet');
    setTimeout(() => window.showDeleteModal(dbName), 500);
    return;
  }

  window.globalModalManager.showModal(window.modalTemplates.getDeleteDatabaseTemplate(dbName), {
    onSubmit: async (data) => {
      console.log('Delete database form submitted:', data);

      if (data.confirmName !== dbName) {
        alert('The database name you entered does not match the database you are trying to delete.');
        return;
      }

      // Show loading indicator
      const loadingElement = document.createElement('div');
      loadingElement.className = 'modal-loading';
      loadingElement.innerHTML = '<div class="spinner"></div><p>Deleting database...</p>';
      document.body.appendChild(loadingElement);

      try {
        // Call the database operation service
        if (window.dbOperations) {
          const result = await window.dbOperations.deleteDatabase(dbName);

          // Remove loading indicator
          document.body.removeChild(loadingElement);

          if (result.success) {
            alert(`Database "${dbName}" successfully deleted`);

            // Refresh the database list
            await loadDatabases();
          } else {
            alert(`Failed to delete database: ${result.error}`);
          }
        } else {
          // Fallback for backward compatibility
          alert(`Delete functionality for "${dbName}" will be implemented in a future update.`);
          document.body.removeChild(loadingElement);
        }
      } catch (error) {
        // Remove loading indicator
        if (document.body.contains(loadingElement)) {
          document.body.removeChild(loadingElement);
        }
        alert(`Error: ${error.message || 'An unknown error occurred'}`);
      }
    }
  });
};

// Show SQL query modal for executing SQL on selected database
window.showSqlQueryModal = function (dbName) {
  if (!window.globalModalManager || !window.modalTemplates) {
    console.error('Modal components not loaded yet');
    setTimeout(() => window.showSqlQueryModal(dbName), 500);
    return;
  }

  window.globalModalManager.showModal(window.modalTemplates.getSqlQueryTemplate(dbName), {
    width: '800px', // Wider modal for query editor
    closeOnSubmit: false // Keep modal open after submitting
  });

  // Once the modal is shown, set up the SQL execution
  setTimeout(() => {
    const executeBtn = document.getElementById('execute-query-btn');
    const queryInput = document.getElementById('sql-query');
    const resultsContainer = document.getElementById('query-results');
    const resultsCount = document.getElementById('query-results-count');

    if (!executeBtn || !queryInput || !resultsContainer) {
      console.error('SQL query modal elements not found');
      return;
    }

    // Execute query when button is clicked
    executeBtn.addEventListener('click', async () => {
      const query = queryInput.value.trim();

      if (!query) {
        resultsContainer.innerHTML = '<div class="query-error">Please enter a SQL query</div>';
        return;
      }

      // Show loading indicator
      resultsContainer.innerHTML = '<div class="query-loading">Executing query...</div>';

      try {
        // Call the database operation service
        if (window.dbOperations) {
          const result = await window.dbOperations.executeQuery(dbName, query);

          if (result.success) {
            // Display results
            if (result.rows && result.rows.length > 0) {
              // Create a table for the results
              const table = document.createElement('table');
              table.className = 'query-results-table';

              // Create header row
              const thead = document.createElement('thead');
              const headerRow = document.createElement('tr');

              result.columns.forEach(column => {
                const th = document.createElement('th');
                th.textContent = column;
                headerRow.appendChild(th);
              });

              thead.appendChild(headerRow);
              table.appendChild(thead);

              // Create body rows
              const tbody = document.createElement('tbody');

              result.rows.forEach(row => {
                const tr = document.createElement('tr');

                result.columns.forEach(column => {
                  const td = document.createElement('td');
                  td.textContent = row[column] !== undefined ? row[column] : '';
                  tr.appendChild(td);
                });

                tbody.appendChild(tr);
              });

              table.appendChild(tbody);

              // Update results container
              resultsContainer.innerHTML = '';
              resultsContainer.appendChild(table);

              // Update count
              resultsCount.textContent = `${result.rows.length} row${result.rows.length !== 1 ? 's' : ''} returned`;
            } else {
              resultsContainer.innerHTML = '<div class="query-success">Query executed successfully. No rows returned.</div>';
              resultsCount.textContent = '';
            }
          } else {
            resultsContainer.innerHTML = `<div class="query-error">Error: ${result.error}</div>`;
            resultsCount.textContent = '';
          }
        } else {
          // Fallback for backward compatibility
          resultsContainer.innerHTML = '<div class="query-error">SQL execution functionality not available</div>';
          resultsCount.textContent = '';
        }
      } catch (error) {
        resultsContainer.innerHTML = `<div class="query-error">Error: ${error.message || 'An unknown error occurred'}</div>`;
        resultsCount.textContent = '';
      }
    });

    // Focus the query input
    queryInput.focus();
  }, 100);
};
// Set up the refresh button
function setupRefreshButton() {
  const refreshBtn = document.getElementById('refresh-databases-btn');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      // Prevent multiple refreshes at once
      if (isRefreshing) return;

      try {
        // Update button state
        isRefreshing = true;
        refreshBtn.classList.add('refreshing');

        // Clear search
        const searchInput = document.getElementById('database-search');
        if (searchInput) {
          searchInput.value = '';
        }

        // Reload databases
        await loadDatabases();

        console.log('Databases refreshed successfully');
      } catch (error) {
        console.error('Error refreshing databases:', error);

        // Show error in database list
        const databaseList = document.getElementById('database-list');
        if (databaseList) {
          databaseList.innerHTML = `<li class="list-item error">Error refreshing databases: ${error.message}</li>`;
        }
      } finally {
        // Reset button state
        isRefreshing = false;
        refreshBtn.classList.remove('refreshing');
      }
    });
  }
}

// Set up logout button
function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');

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
}

// Set up database search functionality
function setupSearch() {
  const searchInput = document.getElementById('database-search');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      filterDatabases(searchTerm);
    });
  }
}

// Set up additional UI interactions for the improved layout
function setupTableViewInteractions() {
  const gridViewBtn = document.getElementById('grid-view-btn');
  const listViewBtn = document.getElementById('list-view-btn');
  const gridView = document.getElementById('grid-view');
  const listView = document.getElementById('list-view');

  if (gridViewBtn && listViewBtn && gridView && listView) {
    // Grid view button
    gridViewBtn.addEventListener('click', () => {
      gridViewBtn.classList.add('active');
      listViewBtn.classList.remove('active');
      gridView.style.display = 'grid';
      listView.style.display = 'none';
    });

    // List view button
    listViewBtn.addEventListener('click', () => {
      listViewBtn.classList.add('active');
      gridViewBtn.classList.remove('active');
      listView.style.display = 'block';
      gridView.style.display = 'none';
    });
  }

  // Table filter functionality
  const tableFilter = document.getElementById('table-filter');
  const clearFilterBtn = document.getElementById('clear-filter');

  if (tableFilter && clearFilterBtn) {
    tableFilter.addEventListener('input', () => {
      filterTables(tableFilter.value.toLowerCase());
    });

    clearFilterBtn.addEventListener('click', () => {
      tableFilter.value = '';
      filterTables('');
    });
  }

  // Sort functionality
  const sortSelect = document.getElementById('sort-tables');

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      sortTables(sortSelect.value);
    });
  }
}

// Setup column view interactions
function setupColumnViewInteractions() {
  // Back buttons
  const backToTablesLink = document.getElementById('back-to-tables');
  const backToTablesBtn = document.getElementById('back-to-tables-btn');

  if (backToTablesLink) {
    backToTablesLink.addEventListener('click', (e) => {
      e.preventDefault();
      showTablesView();
    });
  }

  if (backToTablesBtn) {
    backToTablesBtn.addEventListener('click', () => {
      showTablesView();
    });
  }

  // Column filter
  const columnFilter = document.getElementById('column-filter');
  const clearColumnFilterBtn = document.getElementById('clear-column-filter');

  if (columnFilter && clearColumnFilterBtn) {
    columnFilter.addEventListener('input', () => {
      filterColumns(columnFilter.value.toLowerCase());
    });

    clearColumnFilterBtn.addEventListener('click', () => {
      columnFilter.value = '';
      filterColumns('');
    });
  }

  // Column sort
  const sortColumnsSelect = document.getElementById('sort-columns');

  if (sortColumnsSelect) {
    sortColumnsSelect.addEventListener('change', () => {
      sortColumns(sortColumnsSelect.value);
    });
  }
}

// Load databases from PostgreSQL
async function loadDatabases() {
  try {
    // Show loading state
    const databaseList = document.getElementById('database-list');
    if (!databaseList) {
      throw new Error('Database list element not found');
    }

    databaseList.innerHTML = '<li class="list-item loading">Loading databases...</li>';

    console.log('Fetching databases...');

    // Call API to get databases
    const databases = await getDatabases();
    console.log('Databases loaded:', databases);

    // Store all databases for filtering
    allDatabases = databases;

    // Render the list
    renderDatabaseList(databases);

    // If a database was previously selected, try to restore that selection
    if (currentDb) {
      // Find the database in the list
      const dbItem = document.querySelector(`#database-list .list-item[data-db-name="${currentDb}"]`);
      if (dbItem) {
        // Add active class
        dbItem.classList.add('active');
      }
    }
  } catch (error) {
    console.error('Error loading databases:', error);
    const databaseList = document.getElementById('database-list');
    if (databaseList) {
      databaseList.innerHTML = `<li class="list-item error">Error loading databases: ${error.message}</li>`;
    }
  }
}

// Render database list in the sidebar with context menu support
function renderDatabaseList(databases) {
  const databaseList = document.getElementById('database-list');

  if (!databaseList) {
    console.error('Database list element not found');
    return;
  }

  if (!databases || databases.length === 0) {
    databaseList.innerHTML = '<li class="list-item empty">No databases found</li>';
    return;
  }

  databaseList.innerHTML = '';
  console.log('Rendering databases:', databases);

  databases.forEach(db => {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.textContent = db.name;
    li.setAttribute('data-db-name', db.name);

    // Add title attribute to show full name on hover
    li.setAttribute('title', db.name);

    // Add click handler for normal clicks
    li.addEventListener('click', () => {
      // Clear active class from all items
      document.querySelectorAll('#database-list .list-item').forEach(item => {
        item.classList.remove('active');
      });

      // Add active class to clicked item
      li.classList.add('active');

      // Load tables for selected database
      loadTables(db.name);
    });

    // Add context menu handler
    li.addEventListener('contextmenu', async (e) => {
      e.preventDefault(); // Prevent default context menu

      // Add active class to right-clicked item
      document.querySelectorAll('#database-list .list-item').forEach(item => {
        item.classList.remove('active');
      });
      li.classList.add('active');

      // Use the global context menu
      if (window.contextMenu) {
        // Call the global handler function
        if (window.handleContextMenu) {
          window.handleContextMenu(window.contextMenu, li);
        }

        // Show context menu at cursor position
        window.contextMenu.show(e.pageX, e.pageY, li);
      } else {
        console.error('Context menu not loaded yet');
      }
    });

    databaseList.appendChild(li);
  });
}

// Filter databases based on search term
function filterDatabases(searchTerm) {
  if (!searchTerm) {
    renderDatabaseList(allDatabases);
    return;
  }

  const filtered = allDatabases.filter(db =>
    db.name.toLowerCase().includes(searchTerm)
  );

  renderDatabaseList(filtered);

  // If the current database is still in the filtered list, highlight it
  if (currentDb) {
    const dbItem = document.querySelector(`#database-list .list-item[data-db-name="${currentDb}"]`);
    if (dbItem) {
      dbItem.classList.add('active');
    }
  }
}

// Load tables for a selected database
async function loadTables(dbName) {
  try {
    currentDb = dbName;

    // Update UI to show tables view
    const noSelection = document.getElementById('no-selection');
    const columnsView = document.getElementById('columns-view');
    const tablesView = document.getElementById('tables-view');
    const selectedDbName = document.getElementById('selected-db-name');

    if (noSelection) noSelection.style.display = 'none';
    if (columnsView) columnsView.style.display = 'none';
    if (tablesView) tablesView.style.display = 'block';
    if (selectedDbName) selectedDbName.textContent = dbName;

    // Show loading state in both grid and list view
    const gridView = document.getElementById('grid-view');
    const listBody = document.getElementById('tables-list-body');

    if (gridView) {
      gridView.innerHTML = '<div class="loading">Loading tables...</div>';
    }

    if (listBody) {
      listBody.innerHTML = '<tr><td colspan="3" class="loading">Loading tables...</td></tr>';
    }

    // Clear filter input
    const filterInput = document.getElementById('table-filter');
    if (filterInput) {
      filterInput.value = '';
    }

    console.log('Loading tables for database:', dbName);

    try {
      // Call API to get tables
      const tables = await getTables(dbName);
      console.log('Tables loaded:', tables);

      // Update tables count
      const tablesCount = document.getElementById('tables-count');
      if (tablesCount) {
        tablesCount.textContent = `${tables.length} ${tables.length === 1 ? 'table' : 'tables'}`;
      }

      // Store tables for filtering/sorting
      currentTables = tables;

      // Render tables in both views
      renderTableViews(tables);

      // Show empty state if no tables
      const tablesEmpty = document.getElementById('tables-empty');
      if (tablesEmpty) {
        tablesEmpty.style.display = tables.length === 0 ? 'flex' : 'none';
      }


      // Set default visibility of views based on current active view
      const gridViewBtn = document.getElementById('grid-view-btn');
      const listViewBtn = document.getElementById('list-view-btn');
      const listView = document.getElementById('list-view');

      if (gridViewBtn && listViewBtn && gridView && listView) {
        if (listViewBtn.classList.contains('active')) {
          // List view is default
          gridView.style.display = 'none';
          listView.style.display = 'block';
        } else {
          // Grid view is alternative
          gridView.style.display = 'grid';
          listView.style.display = 'none';
        }
      }

    } catch (error) {
      console.error(`Error fetching tables for ${dbName}:`, error);

      if (gridView) {
        gridView.innerHTML = `<div class="error">Error loading tables: ${error.message}</div>`;
      }

      if (listBody) {
        listBody.innerHTML = `<tr><td colspan="3" class="error">Error loading tables: ${error.message}</td></tr>`;
      }

      // Additional debugging
      console.log('Current connection info:', await getConnectionInfo());
    }
  } catch (error) {
    console.error(`Error in loadTables for ${dbName}:`, error);
  }
}

// Render tables in both grid and list views
function renderTableViews(tables) {
  renderGridView(tables);
  renderListView(tables);
}

// Render tables grid view
function renderGridView(tables) {
  const gridView = document.getElementById('grid-view');

  if (!gridView) {
    console.error('Grid view element not found');
    return;
  }

  if (!tables || tables.length === 0) {
    gridView.innerHTML = '';
    return;
  }

  let gridHTML = '';

  tables.forEach(table => {
    // Generate random column count for demo purposes (in real app, you would get this from the database)
    const columnCount = Math.floor(Math.random() * 20) + 1;

    gridHTML += `
      <div class="table-card" data-table="${table.name}" onclick="loadColumns('${table.name}')">
        <div class="table-card-header">
          <div class="table-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2z"/>
              <path d="M14 3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V1a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2zm-1 7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4z"/>
            </svg>
          </div>
          <div class="table-name" title="${table.name}">${table.name}</div>
        </div>
        <div class="table-card-body">
          <div class="table-meta">
            <div class="table-meta-item">
              <span class="table-meta-label">Type:</span>
              <span class="table-meta-value">Table</span>
            </div>
            <div class="table-meta-item">
              <span class="table-meta-label">Columns:</span>
              <span class="table-meta-value">${columnCount}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  gridView.innerHTML = gridHTML;
}

// Render tables list view
function renderListView(tables) {
  const listBody = document.getElementById('tables-list-body');

  if (!listBody) {
    console.error('List body element not found');
    return;
  }

  if (!tables || tables.length === 0) {
    listBody.innerHTML = '';
    return;
  }

  let listHTML = '';

  tables.forEach(table => {
    // Generate random column count for demo purposes
    const columnCount = Math.floor(Math.random() * 20) + 1;

    listHTML += `
      <tr data-table="${table.name}">
        <td>
          <span class="table-row-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2z"/>
              <path d="M14 3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V1a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2zm-1 7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4z"/>
            </svg>
          </span>
          <span class="table-row-name">${table.name}</span>
        </td>
        <td>Table (${columnCount} columns)</td>
        <td class="table-row-actions">
          <button class="table-action-btn" onclick="loadColumns('${table.name}')">
            View Columns
          </button>
        </td>
      </tr>
    `;
  });

  listBody.innerHTML = listHTML;
}

// Filter tables based on search term
function filterTables(searchTerm) {
  if (!currentTables) return;

  let filtered = currentTables;

  if (searchTerm) {
    filtered = currentTables.filter(table =>
      table.name.toLowerCase().includes(searchTerm)
    );
  }

  // Apply sort to filtered results
  const sortSelect = document.getElementById('sort-tables');
  if (sortSelect) {
    sortTablesArray(filtered, sortSelect.value);
  }

  // Update both views
  renderTableViews(filtered);

  // Show/hide empty state
  const tablesEmpty = document.getElementById('tables-empty');
  if (tablesEmpty) {
    tablesEmpty.style.display = filtered.length === 0 ? 'flex' : 'none';
  }
}

// Sort tables based on sort option
function sortTables(sortOption) {
  if (!currentTables) return;

  // Create a copy to avoid modifying the original array
  const sorted = [...currentTables];

  sortTablesArray(sorted, sortOption);

  // Update both views
  renderTableViews(sorted);
}

// Sort tables array in place
function sortTablesArray(tablesArray, sortOption) {
  switch (sortOption) {
    case 'name-asc':
      tablesArray.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      tablesArray.sort((a, b) => b.name.localeCompare(a.name));
      break;
    default:
      tablesArray.sort((a, b) => a.name.localeCompare(b.name));
  }
}

// Load columns for a selected table (improved version)
async function loadColumns(tableName) {
  try {
    currentTable = tableName;

    // Update UI to show columns view
    showColumnsView();

    const selectedTableName = document.getElementById('selected-table-name');
    const dbBreadcrumb = document.getElementById('db-breadcrumb');
    const tableBreadcrumb = document.getElementById('table-breadcrumb');

    if (selectedTableName) selectedTableName.textContent = tableName;
    if (dbBreadcrumb) dbBreadcrumb.textContent = currentDb;
    if (tableBreadcrumb) tableBreadcrumb.textContent = tableName;

    // Show loading state
    const columnsList = document.getElementById('columns-list');
    if (!columnsList) {
      throw new Error('Columns list element not found');
    }

    columnsList.innerHTML = '<tr><td colspan="4" class="loading">Loading columns...</td></tr>';

    // Clear filter
    const columnFilter = document.getElementById('column-filter');
    if (columnFilter) {
      columnFilter.value = '';
    }

    console.log('Loading columns for table:', tableName);

    try {
      // Call API to get columns
      const columns = await getColumns(currentDb, tableName);
      console.log('Columns loaded:', columns);

      // Store original column order for sorting
      columns.forEach((column, index) => {
        column.position = index;
      });

      // Store columns for filtering/sorting
      currentColumns = columns;

      // Set default sort option to position
      const sortSelect = document.getElementById('sort-columns');
      if (sortSelect) {
        sortSelect.value = 'position';
      }

      // Render columns
      renderColumnsList(columns);

      // Show/hide empty state
      const emptyColumns = document.getElementById('empty-columns');
      if (emptyColumns) {
        emptyColumns.style.display = columns.length === 0 ? 'flex' : 'none';
      }

    } catch (error) {
      console.error(`Error loading columns for ${tableName}:`, error);
      columnsList.innerHTML = `<tr><td colspan="4" class="error">Error loading columns: ${error.message}</td></tr>`;
    }
  } catch (error) {
    console.error(`Error in loadColumns for ${tableName}:`, error);
    const columnsList = document.getElementById('columns-list');
    if (columnsList) {
      columnsList.innerHTML = `<tr><td colspan="4" class="error">Error: ${error.message}</td></tr>`;
    }
  }
}

// Filter columns based on search term
function filterColumns(searchTerm) {
  if (!currentColumns) return;

  let filtered = currentColumns;

  if (searchTerm) {
    filtered = currentColumns.filter(column =>
      column.name.toLowerCase().includes(searchTerm) ||
      column.type.toLowerCase().includes(searchTerm)
    );
  }

  // Apply current sort to filtered results
  const sortSelect = document.getElementById('sort-columns');
  if (sortSelect) {
    sortColumnsArray(filtered, sortSelect.value);
  }

  // Render filtered columns
  renderColumnsList(filtered);

  // Show/hide empty state
  const emptyColumns = document.getElementById('empty-columns');
  if (emptyColumns) {
    emptyColumns.style.display = filtered.length === 0 ? 'flex' : 'none';
  }
}

// Sort columns based on sort option
function sortColumns(sortOption) {
  if (!currentColumns) return;

  // Create a copy to avoid modifying the original array
  const sorted = [...currentColumns];

  sortColumnsArray(sorted, sortOption);

  // Render sorted columns
  renderColumnsList(sorted);
}

// Sort columns array in place
function sortColumnsArray(columnsArray, sortOption) {
  switch (sortOption) {
    case 'name-asc':
      columnsArray.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      columnsArray.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'type':
      columnsArray.sort((a, b) => a.type.localeCompare(b.type));
      break;
    case 'position':
      columnsArray.sort((a, b) => a.position - b.position);
      break;
    default:
      columnsArray.sort((a, b) => a.position - b.position);
  }
}

// Render columns list for the selected table (improved)
function renderColumnsList(columns) {
  const columnsList = document.getElementById('columns-list');

  if (!columnsList) {
    console.error('Columns list element not found');
    return;
  }

  if (!columns || columns.length === 0) {
    columnsList.innerHTML = '<tr><td colspan="4" class="empty">No columns found in this table</td></tr>';
    return;
  }

  columnsList.innerHTML = '';

  columns.forEach(column => {
    const tr = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = column.name;
    nameCell.style.fontWeight = '500';

    const typeCell = document.createElement('td');
    typeCell.textContent = column.type;

    const nullableCell = document.createElement('td');
    const nullableValue = column.nullable ? 'Yes' : 'No';
    nullableCell.textContent = nullableValue;

    // Add a visual indicator for nullable status
    if (column.nullable) {
      nullableCell.innerHTML = `<span class="nullable-yes">✓ Yes</span>`;
    } else {
      nullableCell.innerHTML = `<span class="nullable-no">✕ No</span>`;
    }

    const defaultCell = document.createElement('td');
    defaultCell.textContent = column.default || '-';

    tr.appendChild(nameCell);
    tr.appendChild(typeCell);
    tr.appendChild(nullableCell);
    tr.appendChild(defaultCell);

    columnsList.appendChild(tr);
  });
}

// Show tables view and hide columns view
function showTablesView() {
  const columnsView = document.getElementById('columns-view');
  const tablesView = document.getElementById('tables-view');

  if (columnsView) columnsView.style.display = 'none';
  if (tablesView) tablesView.style.display = 'block';
}

// Show columns view and hide tables view
function showColumnsView() {
  const tablesView = document.getElementById('tables-view');
  const columnsView = document.getElementById('columns-view');

  if (tablesView) tablesView.style.display = 'none';
  if (columnsView) columnsView.style.display = 'block';
}

// Make loadColumns function available globally for HTML onclick handlers
window.loadColumns = loadColumns;