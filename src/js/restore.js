// Global variables
let selectedBackupFile = null;
let selectedDatabase = null;
let availableDatabases = [];

// Wait for DOM to be fully loaded before executing code
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize theme toggle
  initTheme();

  // Setup logout button
  setupLogout();

  // Setup template checkbox
  setupTemplateCheckbox();

  // Setup create database form
  setupCreateDatabaseForm();

  // Setup restore form
  setupRestoreForm();

  // Load available databases
  await loadDatabases();
});

// Setup logout button
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

// Setup template checkbox toggle
function setupTemplateCheckbox() {
  const templateCheckbox = document.getElementById('template-db');
  const templateSelection = document.querySelector('.template-db-selection');
  
  if (templateCheckbox && templateSelection) {
    templateCheckbox.addEventListener('change', () => {
      templateSelection.style.display = templateCheckbox.checked ? 'block' : 'none';
    });
  }
}

// Setup create database form
function setupCreateDatabaseForm() {
  const createForm = document.getElementById('create-db-form');
  const createError = document.getElementById('create-db-error');
  const createSuccess = document.getElementById('create-db-success');
  
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear previous messages
      setElementHTML(createError, '');
      setElementHTML(createSuccess, '');
      hideElement(createError);
      hideElement(createSuccess);
      
      // Get form values
      const dbName = document.getElementById('db-name').value.trim();
      const owner = document.getElementById('owner').value.trim() || null;
      const encoding = document.getElementById('encoding').value;
      const useTemplate = document.getElementById('template-db').checked;
      const templateName = useTemplate ? document.getElementById('template-select').value : null;
      
      // Validate database name
      if (!dbName) {
        setElementHTML(createError, 'Database name is required');
        showElement(createError);
        return;
      }
      
      // Check if database name already exists
      if (availableDatabases.some(db => db.name.toLowerCase() === dbName.toLowerCase())) {
        setElementHTML(createError, `Database "${dbName}" already exists`);
        showElement(createError);
        return;
      }
      
      // Create database
      try {
        const createButton = createForm.querySelector('button[type="submit"]');
        createButton.disabled = true;
        createButton.textContent = 'Creating...';
        
        await createDatabase({
          name: dbName,
          owner: owner,
          encoding: encoding,
          template: templateName
        });
        
        // Reset form
        createForm.reset();
        document.querySelector('.template-db-selection').style.display = 'none';
        
        // Show success message
        setElementHTML(createSuccess, `Database "${dbName}" created successfully`);
        showElement(createSuccess);
        
        // Refresh database list
        await loadDatabases();
      } catch (error) {
        console.error('Error creating database:', error);
        setElementHTML(createError, `Error creating database: ${error.message}`);
        showElement(createError);
      } finally {
        const createButton = createForm.querySelector('button[type="submit"]');
        createButton.disabled = false;
        createButton.textContent = 'Create Database';
      }
    });
  }
}

// Setup restore form
function setupRestoreForm() {
  const restoreForm = document.getElementById('restore-form');
  const targetDbSelect = document.getElementById('target-db');
  const selectFileBtn = document.getElementById('select-file');
  const backupFilePath = document.getElementById('backup-file-path');
  const refreshDbListBtn = document.getElementById('refresh-db-list');
  const restoreButton = document.querySelector('.restore-button');
  const restoreError = document.getElementById('restore-error');
  const restoreSuccess = document.getElementById('restore-success');
  const progressContainer = document.getElementById('restore-progress-container');
  const progressBar = document.getElementById('restore-progress-bar');
  const restoreStatus = document.getElementById('restore-status');
  
  // Setup file selection
  if (selectFileBtn && backupFilePath) {
    selectFileBtn.addEventListener('click', async () => {
      try {
        const result = await window.api.selectBackupFile();
        
        if (result.canceled) {
          return;
        }
        
        selectedBackupFile = result.filePath;
        backupFilePath.value = selectedBackupFile;
        
        // Enable restore button if database is selected
        if (selectedDatabase) {
          restoreButton.disabled = false;
        }
      } catch (error) {
        console.error('Error selecting backup file:', error);
        setElementHTML(restoreError, `Error selecting file: ${error.message}`);
        showElement(restoreError);
      }
    });
  }
  
  // Setup database selection
  if (targetDbSelect) {
    targetDbSelect.addEventListener('change', () => {
      selectedDatabase = targetDbSelect.value;
      
      // Enable restore button if file is selected
      if (selectedBackupFile && selectedDatabase) {
        restoreButton.disabled = false;
      } else {
        restoreButton.disabled = true;
      }
    });
  }
  
  // Setup refresh button
  if (refreshDbListBtn) {
    refreshDbListBtn.addEventListener('click', async () => {
      await loadDatabases();
    });
  }
  
  // Setup restore form submission
  if (restoreForm) {
    restoreForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear previous messages
      setElementHTML(restoreError, '');
      setElementHTML(restoreSuccess, '');
      setElementText(restoreStatus, '');
      hideElement(restoreError);
      hideElement(restoreSuccess);
      
      // Get form values
      const cleanBeforeRestore = document.getElementById('clean').checked;
      const singleTransaction = document.getElementById('single-transaction').checked;
      
      // Validate selections
      if (!selectedDatabase) {
        setElementHTML(restoreError, 'Please select a target database');
        showElement(restoreError);
        return;
      }
      
      if (!selectedBackupFile) {
        setElementHTML(restoreError, 'Please select a backup file');
        showElement(restoreError);
        return;
      }
      
      // Start restore process
      try {
        restoreButton.disabled = true;
        restoreButton.textContent = 'Restoring...';
        
        // Show progress
        showElement(progressContainer);
        progressBar.style.width = '0%';
        setElementText(restoreStatus, 'Preparing to restore...');
        
        // Listen for progress updates
        window.api.receive('restoreProgress', (progress) => {
          progressBar.style.width = `${progress.percent}%`;
          setElementText(restoreStatus, progress.message);
        });
        
        // Start restore
        const result = await restoreDatabase({
          database: selectedDatabase,
          backupFile: selectedBackupFile,
          clean: cleanBeforeRestore,
          singleTransaction: singleTransaction
        });
        
        // Show success message based on whether there were warnings
        hideElement(progressContainer);
        
        if (result.warnings && result.warningCount) {
          setElementHTML(restoreSuccess, 
            `Database "${selectedDatabase}" restored with ${result.warningCount} warning(s). ` +
            `This is normal and usually doesn't affect the database functionality.`
          );
        } else {
          setElementHTML(restoreSuccess, `Database "${selectedDatabase}" restored successfully!`);
        }
        
        showElement(restoreSuccess);
        
        // Reset form fields
        backupFilePath.value = '';
        selectedBackupFile = null;
        
      } catch (error) {
        console.error('Error restoring database:', error);
        hideElement(progressContainer);
        
        // Provide more helpful error message
        let errorMessage = `Error restoring database: ${error.message}`;
        
        // Check for common issues
        if (error.message.includes('pg_restore')) {
          errorMessage += '<br><br>Possible causes:' +
            '<br>- PostgreSQL command-line tools may not be installed or in your PATH' +
            '<br>- The backup file may be corrupted or in an unsupported format' +
            '<br>- Insufficient permissions to access the backup file';
        }
        
        setElementHTML(restoreError, errorMessage);
        showElement(restoreError);
      } finally {
        restoreButton.disabled = true;
        restoreButton.textContent = 'Restore Database';
      }
    });
  }
}

// Load available databases
async function loadDatabases() {
  const targetDbSelect = document.getElementById('target-db');
  
  if (!targetDbSelect) {
    console.error('Target database select element not found');
    return;
  }
  
  try {
    // Show loading state
    const currentValue = targetDbSelect.value;
    targetDbSelect.innerHTML = '<option value="">Loading databases...</option>';
    targetDbSelect.disabled = true;
    
    // Get all databases
    availableDatabases = await getDatabases();
    
    // Populate select
    targetDbSelect.innerHTML = '<option value="">Select a database</option>';
    
    availableDatabases.forEach(db => {
      // Skip template databases
      if (db.name.startsWith('template')) {
        return;
      }
      
      const option = document.createElement('option');
      option.value = db.name;
      option.textContent = db.name;
      
      if (db.name === currentValue) {
        option.selected = true;
      }
      
      targetDbSelect.appendChild(option);
    });
    
    targetDbSelect.disabled = false;
    
    // Update selected database
    selectedDatabase = targetDbSelect.value;
    
    // Enable or disable restore button
    const restoreButton = document.querySelector('.restore-button');
    if (restoreButton) {
      restoreButton.disabled = !(selectedBackupFile && selectedDatabase);
    }
    
  } catch (error) {
    console.error('Error loading databases:', error);
    targetDbSelect.innerHTML = '<option value="">Error loading databases</option>';
    targetDbSelect.disabled = true;
  }
}