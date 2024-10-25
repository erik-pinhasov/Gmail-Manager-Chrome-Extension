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
  constructor(config) {
    this.config = { ...defaultConfig, ...config };
    this.currentPage = 1;
  }

  init() {
    this.setTableHeaders();
    this.displayPage(this.currentPage);
    this.addEventListeners();
  }

  setTableHeaders() {
    const headers = document.getElementById(this.config.tableHeadersId);
    if (!headers) return;

    headers.innerHTML = [{ label: "Number" }, ...this.config.columns]
      .map((header) => `<th>${header.label}</th>`)
      .join("");
  }

  displayPage(page) {
    const tableBody = document.getElementById(this.config.tableBodyId);
    if (!tableBody) return;

    const start = (page - 1) * this.config.rowsPerPage;
    const pageData = this.config.dataItems.slice(
      start,
      start + this.config.rowsPerPage
    );

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

  updatePagination(currentPage) {
    const pagination = document.getElementById(this.config.paginationId);
    if (!pagination) return;

    const totalPages = Math.ceil(
      this.config.dataItems.length / this.config.rowsPerPage
    );

    pagination.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
      const button = document.createElement("button");
      button.textContent = i;
      button.disabled = i === currentPage;
      button.addEventListener("click", () => this.goToPage(i));
      pagination.appendChild(button);
    }
  }

  goToPage(page) {
    this.currentPage = page;
    this.displayPage(page);
  }

  addEventListeners() {
    document.querySelectorAll(".unsubscribe-btn").forEach((button) => {
      button.addEventListener("click", this.handleUnsubscribe);
    });
  }

  handleUnsubscribe(event) {
    const button = event.target;
    const email = decodeURIComponent(button.dataset.email);
    const unsubscribeLink = decodeURIComponent(button.dataset.unsubscribe);

    if (unsubscribeLink) {
      window.open(unsubscribeLink, "_blank");
      button.style.backgroundColor = "green";
      button.disabled = true;
    }
  }
}

let tableManager;

window.addEventListener("message", (event) => {
  tableManager = new TableManager(event.data);
  tableManager.init();
});
