// Global variables to track state
let currentDb = null;
let currentTable = null;
let allDatabases = [];
let currentTables = [];
let currentColumns = [];

// Wait for DOM to be fully loaded before executing code
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize theme toggle
  initTheme();

  setupLogout();
  setupSearch();
  setupTableViewInteractions();
  setupColumnViewInteractions();

  // Load databases on page load
  await loadDatabases();
});

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
  } catch (error) {
    console.error('Error loading databases:', error);
    const databaseList = document.getElementById('database-list');
    if (databaseList) {
      databaseList.innerHTML = `<li class="list-item error">Error loading databases: ${error.message}</li>`;
    }
  }
}

// Render database list in the sidebar
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