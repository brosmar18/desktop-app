// Global variables to track state
let currentDb = null;
let currentTable = null;
let allDatabases = [];

// Wait for DOM to be fully loaded before executing code
document.addEventListener('DOMContentLoaded', async () => {
  setupThemeToggle();
  setupLogout();
  setupSearch();
  setupBackButton();
  
  // Load databases on page load
  await loadDatabases();
});

// Set up theme toggle functionality
function setupThemeToggle() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const body = document.body;
  
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
}

// Set up logout button
function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  
  logoutBtn.addEventListener('click', () => {
    if (window.api) {
      window.api.send('logout');
    }
  });
}

// Set up database search functionality
function setupSearch() {
  const searchInput = document.getElementById('database-search');
  
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    filterDatabases(searchTerm);
  });
}

// Set up back button for columns view
function setupBackButton() {
  const backButton = document.getElementById('back-to-tables');
  
  backButton.addEventListener('click', () => {
    showTablesView();
  });
}

// Load databases from PostgreSQL
async function loadDatabases() {
  try {
    // Show loading state
    const databaseList = document.getElementById('database-list');
    databaseList.innerHTML = '<li class="list-item loading">Loading databases...</li>';
    
    console.log('Fetching databases...');
    
    // Call API to get databases
    if (!window.api) {
      throw new Error('API not available');
    }
    
    const databases = await window.api.getDatabases();
    console.log('Databases loaded:', databases);
    
    // Store all databases for filtering
    allDatabases = databases;
    
    // Render the list
    renderDatabaseList(databases);
  } catch (error) {
    console.error('Error loading databases:', error);
    const databaseList = document.getElementById('database-list');
    databaseList.innerHTML = `<li class="list-item error">Error loading databases: ${error.message}</li>`;
  }
}

// Render database list in the sidebar
function renderDatabaseList(databases) {
  const databaseList = document.getElementById('database-list');
  
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
    
    // Add title attribute to show full name on hover
    li.setAttribute('title', db.name);
    
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
}

// Load tables for a selected database
async function loadTables(dbName) {
  try {
    currentDb = dbName;
    
    // Update UI to show tables view
    document.getElementById('no-selection').style.display = 'none';
    document.getElementById('columns-view').style.display = 'none';
    document.getElementById('tables-view').style.display = 'block';
    document.getElementById('selected-db-name').textContent = dbName;
    
    // Show loading state
    const tablesList = document.getElementById('tables-list');
    tablesList.innerHTML = '<li class="loading">Loading tables...</li>';
    
    console.log('Loading tables for database:', dbName);
    
    // Call API to get tables
    const tables = await window.api.getTables(dbName);
    console.log('Tables loaded:', tables);
    
    // Render tables
    renderTablesList(tables);
  } catch (error) {
    console.error(`Error loading tables for ${dbName}:`, error);
    const tablesList = document.getElementById('tables-list');
    tablesList.innerHTML = `<li class="error">Error loading tables: ${error.message}</li>`;
  }
}

// Render tables list in the main panel
function renderTablesList(tables) {
  const tablesList = document.getElementById('tables-list');
  
  if (!tables || tables.length === 0) {
    tablesList.innerHTML = '<li class="empty">No tables found in this database</li>';
    return;
  }
  
  tablesList.innerHTML = '';
  
  tables.forEach(table => {
    const li = document.createElement('li');
    li.className = 'table-item';
    
    const tableIcon = document.createElement('span');
    tableIcon.className = 'table-icon';
    tableIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2z"/><path d="M14 3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V1a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2zm-1 7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4z"/></svg>';
    
    const tableName = document.createElement('span');
    tableName.textContent = table.name;
    tableName.setAttribute('title', table.name);
    
    li.appendChild(tableIcon);
    li.appendChild(tableName);
    
    li.addEventListener('click', () => {
      loadColumns(table.name);
    });
    
    tablesList.appendChild(li);
  });
}

// Load columns for a selected table
async function loadColumns(tableName) {
  try {
    currentTable = tableName;
    
    // Update UI to show columns view
    showColumnsView();
    
    document.getElementById('selected-table-name').textContent = tableName;
    document.getElementById('db-breadcrumb').textContent = currentDb;
    document.getElementById('table-breadcrumb').textContent = tableName;
    
    // Show loading state
    const columnsList = document.getElementById('columns-list');
    columnsList.innerHTML = '<tr><td colspan="4" class="loading">Loading columns...</td></tr>';
    
    console.log('Loading columns for table:', tableName);
    
    // Call API to get columns
    const columns = await window.api.getColumns(currentDb, tableName);
    console.log('Columns loaded:', columns);
    
    // Render columns
    renderColumnsList(columns);
  } catch (error) {
    console.error(`Error loading columns for ${tableName}:`, error);
    const columnsList = document.getElementById('columns-list');
    columnsList.innerHTML = `<tr><td colspan="4" class="error">Error loading columns: ${error.message}</td></tr>`;
  }
}

// Render columns list for the selected table
function renderColumnsList(columns) {
  const columnsList = document.getElementById('columns-list');
  
  if (!columns || columns.length === 0) {
    columnsList.innerHTML = '<tr><td colspan="4" class="empty">No columns found in this table</td></tr>';
    return;
  }
  
  columnsList.innerHTML = '';
  
  columns.forEach(column => {
    const tr = document.createElement('tr');
    
    const nameCell = document.createElement('td');
    nameCell.textContent = column.name;
    
    const typeCell = document.createElement('td');
    typeCell.textContent = column.type;
    
    const nullableCell = document.createElement('td');
    nullableCell.textContent = column.nullable ? 'Yes' : 'No';
    
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
  document.getElementById('columns-view').style.display = 'none';
  document.getElementById('tables-view').style.display = 'block';
}

// Show columns view and hide tables view
function showColumnsView() {
  document.getElementById('tables-view').style.display = 'none';
  document.getElementById('columns-view').style.display = 'block';
}