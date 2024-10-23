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
  windowWidth: 800,
  windowHeight: 600,
};

function displayPage(config, page) {
  const tableBody = document.getElementById(config.tableBodyId);
  tableBody.innerHTML = "";

  const start = (page - 1) * config.rowsPerPage;
  const pageData = config.dataItems.slice(start, start + config.rowsPerPage);

  pageData.forEach((item, index) => {
    const row = tableBody.insertRow();
    row.insertCell(0).textContent = start + index + 1;

    config.columns.forEach((column, colIndex) => {
      const cell = row.insertCell(colIndex + 1);
      cell[column.key === "actions" ? "innerHTML" : "textContent"] =
        item[column.key];
    });
  });

  updatePagination(config, page);
}

function updatePagination(config, page) {
  const pagination = document.getElementById(config.paginationId);
  pagination.innerHTML = "";

  const totalPages = Math.ceil(config.dataItems.length / config.rowsPerPage);

  for (let i = 1; i <= totalPages; i++) {
    const button = document.createElement("button");
    button.textContent = i;
    button.disabled = i === page;
    button.onclick = () => {
      config.currentPage = i;
      displayPage(config, i);
    };
    pagination.appendChild(button);
  }
}

function setTableHeaders(config) {
  const tableHeaders = document.getElementById(config.tableHeadersId);
  tableHeaders.innerHTML = "";

  const headers = [{ label: "Number" }, ...config.columns];
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header.label;
    tableHeaders.appendChild(th);
  });
}

function initializeTable(config) {
  const mergedConfig = { ...defaultConfig, ...config };
  const titleElement = document.getElementById(mergedConfig.tableTitleId);

  const tableBody = document.getElementById(mergedConfig.tableBodyId);
  tableBody.innerHTML = "";

  setTableHeaders(mergedConfig);
  displayPage(mergedConfig, mergedConfig.currentPage);
}

export function openDataWindow(url, dataPayload) {
  const listWindow = window.open(
    url,
    dataPayload.tableTitle,
    `width=${defaultConfig.windowWidth},height=${defaultConfig.windowHeight}`
  );

  const sendData = () => {
    if (listWindow && !listWindow.closed) {
      listWindow.postMessage(dataPayload, "*");
      clearInterval(checkInterval);
    }
  };

  listWindow.addEventListener("load", sendData);
  const checkInterval = setInterval(sendData, 100);
}

function handleUnsubscribe(event) {
  const button = event.target;
  const email = decodeURIComponent(button.getAttribute("data-email"));
  const unsubscribeLink = decodeURIComponent(
    button.getAttribute("data-unsubscribe")
  );

  if (unsubscribeLink) {
    window.open(unsubscribeLink, "_blank");
    button.style.backgroundColor = "green";
    button.disabled = false;
  }
}

function addUnsubscribeListeners() {
  document.querySelectorAll(".unsubscribe-btn").forEach((button) => {
    button.addEventListener("click", handleUnsubscribe);
  });
}

window.addEventListener("message", (event) => {
  const config = event.data;
  initializeTable(config);
  addUnsubscribeListeners();
});
