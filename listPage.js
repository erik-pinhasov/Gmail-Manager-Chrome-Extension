const rowsPerPage = 100;
let dataItems = [];
let currentPage = 1;
let columns = [];

// Function to display a specific page of data
function displayPage(page) {
  const tableBody = document.getElementById("tableBody");
  tableBody.innerHTML = ""; // Clear previous rows

  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = dataItems.slice(start, end);

  pageData.forEach((item, index) => {
    const row = tableBody.insertRow();
    row.insertCell(0).textContent = start + index + 1; // Row number
    columns.forEach((column, colIndex) => {
      row.insertCell(colIndex + 1).textContent = item[column.key];
    });
  });

  updatePagination(page);
}

// Function to create pagination controls
function updatePagination(page) {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = ""; // Clear previous buttons

  const totalPages = Math.ceil(dataItems.length / rowsPerPage);
  for (let i = 1; i <= totalPages; i++) {
    const button = document.createElement("button");
    button.textContent = i;
    button.disabled = i === page;
    button.addEventListener("click", () => {
      currentPage = i;
      displayPage(currentPage);
    });
    pagination.appendChild(button);
  }
}

// Function to set the table headers
function setTableHeaders(headers) {
  const tableHeaders = document.getElementById("tableHeaders");
  tableHeaders.innerHTML = ""; // Clear any existing headers

  const numberHeader = document.createElement("th");
  numberHeader.textContent = "Number";
  tableHeaders.appendChild(numberHeader);

  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header.label;
    tableHeaders.appendChild(th);
  });
}

// Event listener for receiving data and configuring table
window.addEventListener("message", (event) => {
  const { title, columns: receivedColumns, items } = event.data;

  // Set the table title
  document.getElementById("tableTitle").textContent = title;
  console.log("HERE");
  // Set table headers and data
  columns = receivedColumns;
  dataItems = items;
  setTableHeaders(columns);
  displayPage(currentPage);
});
