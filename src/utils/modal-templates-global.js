/**
 * Modal Templates
 * Provides templates for different modal dialogs
 */

window.modalTemplates = {
  /**
   * Get modal template for cloning a database
   * @param {string} dbName - Original database name
   * @returns {string} HTML template for clone database modal
   */

  getCloneDatabaseTemplate: function (dbName) {
    const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suggestedName = `${dbName}_clone_${currentDate}`;

    return `
      <div class="modal-header">
        <h3 class="modal-title">Clone Database</h3>
        <button class="modal-close-btn">✕</button>
      </div>
      <form id="clone-db-form">
        <div class="modal-body">
          <div class="modal-form-group">
            <label for="source-db">Source Database</label>
            <input type="text" id="source-db" name="sourceDb" value="${dbName}" readonly />
          </div>
          <div class="modal-form-group">
            <label for="target-db">New Database Name</label>
            <input type="text" id="target-db" name="targetDb" value="${suggestedName}" required />
            <div class="name-suggestions">
              <button type="button" class="suggestion-btn" data-name="${dbName}_clone" onclick="document.getElementById('target-db').value=this.getAttribute('data-name')">Basic Clone</button>
              <button type="button" class="suggestion-btn" data-name="${dbName}_dev" onclick="document.getElementById('target-db').value=this.getAttribute('data-name')">Dev</button>
              <button type="button" class="suggestion-btn" data-name="${dbName}_test" onclick="document.getElementById('target-db').value=this.getAttribute('data-name')">Test</button>
              <button type="button" class="suggestion-btn" data-name="${suggestedName}" onclick="document.getElementById('target-db').value=this.getAttribute('data-name')">Dated</button>
            </div>
          </div>
          <div class="modal-form-group">
            <label for="clone-with-data">Include Data</label>
            <select id="clone-with-data" name="withData">
              <option value="true" selected>Yes - Clone schema and data</option>
              <option value="false">No - Clone schema only</option>
            </select>
          </div>
          <div class="modal-note">
            <p><strong>Note:</strong> Creating a clone with data can take some time for larger databases.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="modal-btn modal-cancel-btn" onclick="document.querySelector('.modal-close-btn').click()">Cancel</button>
          <button type="submit" class="modal-btn modal-submit-btn">Clone Database</button>
        </div>
      </form>
    `;
  },
  /**
   * Get modal template for backing up a database
   * @param {string} dbName - Database name
   * @returns {string} HTML template for backup database modal
   */
  getBackupDatabaseTemplate: function (dbName) {
    return `
      <div class="modal-header">
        <h3 class="modal-title">Backup Database</h3>
        <button class="modal-close-btn">✕</button>
      </div>
      <form id="backup-db-form">
        <div class="modal-body">
          <div class="modal-form-group">
            <label for="backup-db">Database</label>
            <input type="text" id="backup-db" name="database" value="${dbName}" readonly />
          </div>
          <div class="modal-form-group">
            <label for="backup-format">Format</label>
            <select id="backup-format" name="format">
              <option value="custom" selected>Custom (Recommended)</option>
              <option value="plain">Plain</option>
              <option value="directory">Directory</option>
              <option value="tar">Tar</option>
            </select>
          </div>
          <div class="modal-form-group">
            <label for="backup-compression">Compression Level</label>
            <select id="backup-compression" name="compression">
              <option value="0">None</option>
              <option value="1">Fast</option>
              <option value="5" selected>Normal</option>
              <option value="9">Maximum</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="modal-btn modal-cancel-btn" onclick="document.querySelector('.modal-close-btn').click()">Cancel</button>
          <button type="submit" class="modal-btn modal-submit-btn">Backup Database</button>
        </div>
      </form>
    `;
  },

  /**
   * Get modal template for renaming a database
   * @param {string} dbName - Current database name
   * @returns {string} HTML template for rename database modal
   */
  getRenameDatabaseTemplate: function (dbName) {
    return `
      <div class="modal-header">
        <h3 class="modal-title">Rename Database</h3>
        <button class="modal-close-btn">✕</button>
      </div>
      <form id="rename-db-form">
        <div class="modal-body">
          <div class="modal-form-group">
            <label for="current-db-name">Current Name</label>
            <input type="text" id="current-db-name" name="currentName" value="${dbName}" readonly />
          </div>
          <div class="modal-form-group">
            <label for="new-db-name">New Name</label>
            <input type="text" id="new-db-name" name="newName" value="" placeholder="Enter new database name" required />
          </div>
          <p class="modal-note">
            <b>Note:</b> Renaming a database requires disconnecting all active connections to it. 
            Make sure no applications are currently using this database before proceeding.
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="modal-btn modal-cancel-btn" onclick="document.querySelector('.modal-close-btn').click()">Cancel</button>
          <button type="submit" class="modal-btn modal-submit-btn">Rename Database</button>
        </div>
      </form>
    `;
  },

  /**
   * Get modal template for deleting a database
   * @param {string} dbName - Database name to delete
   * @returns {string} HTML template for delete database modal
   */
  getDeleteDatabaseTemplate: function (dbName) {
    return `
      <div class="modal-header">
        <h3 class="modal-title">Delete Database</h3>
        <button class="modal-close-btn">✕</button>
      </div>
      <form id="delete-db-form">
        <div class="modal-body">
          <p>Are you sure you want to delete the database <strong>${dbName}</strong>?</p>
          <p class="modal-warning">
            <strong>Warning:</strong> This action cannot be undone. All data in this database will be permanently deleted.
          </p>
          <div class="modal-form-group">
            <label for="confirm-db-name">Type the database name to confirm</label>
            <input type="text" id="confirm-db-name" name="confirmName" placeholder="Enter database name" required />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="modal-btn modal-cancel-btn" onclick="document.querySelector('.modal-close-btn').click()">Cancel</button>
          <button type="submit" class="modal-btn modal-danger-btn">Delete Database</button>
        </div>
      </form>
    `;
  },

  /**
   * Get modal template for SQL query execution
   * @param {string} dbName - Database name
   * @returns {string} HTML template for SQL query modal
   */
  getSqlQueryTemplate: function (dbName) {
    return `
      <div class="modal-header">
        <h3 class="modal-title">Execute SQL Query on "${dbName}"</h3>
        <button class="modal-close-btn">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-form-group">
          <label for="sql-query">SQL Query</label>
          <textarea id="sql-query" name="query" rows="6" placeholder="SELECT * FROM your_table LIMIT 10;" class="sql-editor"></textarea>
        </div>
        <div class="query-actions">
          <button type="button" id="execute-query-btn" class="modal-btn modal-submit-btn">Execute Query</button>
        </div>
        <div class="query-results-container">
          <div class="query-results-header">
            <h4>Results</h4>
            <span id="query-results-count"></span>
          </div>
          <div id="query-results" class="query-results">
            <div class="query-placeholder">Execute a query to see results</div>
          </div>
        </div>
      </div>
    `;
  }
};