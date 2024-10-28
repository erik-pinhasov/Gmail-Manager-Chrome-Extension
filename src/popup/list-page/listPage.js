// Default configuration for table display
const defaultConfig = {
  rowsPerPage: 100,
  columns: [],
  dataItems: [],
  currentPage: 1,
  tableTitle: "",
  tableBodyId: "tableBody",
  tableHeadersId: "tableHeaders",
  paginationId: "pagination",
  tableTitleId: "tableTitle",
};

class TableManager {
  // Initialize table with configuration
  constructor(config) {
    this.config = { ...defaultConfig, ...config };
    this.currentPage = 1;
  }

  // Set up initial table state
  init() {
    this.setTableHeaders();
    this.displayPage(this.currentPage);
    this.addEventListeners();
  }

  // Create table headers with numbering
  setTableHeaders() {
    const headers = document.getElementById(this.config.tableHeadersId);
    if (!headers) return;

    headers.innerHTML = [{ label: "Number" }, ...this.config.columns]
      .map((header) => `<th>${header.label}</th>`)
      .join("");
  }

  // Display table data for current page
  displayPage(page) {
    const tableBody = document.getElementById(this.config.tableBodyId);
    if (!tableBody) return;

    // Calculate page slice
    const start = (page - 1) * this.config.rowsPerPage;
    const pageData = this.config.dataItems.slice(
      start,
      start + this.config.rowsPerPage
    );

    // Render table rows
    tableBody.innerHTML = pageData
      .map(
        (item, index) => `
      <tr>
        <td>${start + index + 1}</td>
        ${this.config.columns
          .map(
            (column) => `
          <td ${column.key === "actions" ? 'class="actions"' : ""}>
            ${item[column.key]}
          </td>
        `
          )
          .join("")}
      </tr>
    `
      )
      .join("");

    this.updatePagination(page);
  }

  // Update pagination buttons
  updatePagination(currentPage) {
    const pagination = document.getElementById(this.config.paginationId);
    if (!pagination) return;

    const totalPages = Math.ceil(
      this.config.dataItems.length / this.config.rowsPerPage
    );

    pagination.innerHTML = "";

    // Create page buttons
    for (let i = 1; i <= totalPages; i++) {
      const button = document.createElement("button");
      button.textContent = i;
      button.disabled = i === currentPage;
      button.addEventListener("click", () => this.goToPage(i));
      pagination.appendChild(button);
    }
  }

  // Navigate to specific page
  goToPage(page) {
    this.currentPage = page;
    this.displayPage(page);
  }

  // Set up event handlers
  addEventListeners() {
    document.querySelectorAll(".unsubscribe-btn").forEach((button) => {
      button.addEventListener("click", this.handleUnsubscribe);
    });
  }

  // Handle unsubscribe button clicks
  handleUnsubscribe(event) {
    const button = event.target;
    const unsubscribeLink = decodeURIComponent(button.dataset.unsubscribe);

    if (unsubscribeLink) {
      chrome.windows.create({
        url: unsubscribeLink,
        type: "popup",
        width: 800,
        height: 600,
      });
      button.style.backgroundColor = "green";
      button.disabled = true;
    }
  }
}

// Initialize table manager when data is received
let tableManager;
window.addEventListener("message", (event) => {
  tableManager = new TableManager(event.data);
  tableManager.init();
});
