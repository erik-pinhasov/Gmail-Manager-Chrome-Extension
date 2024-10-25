// utils/emailManager.js
import {
  showCustomModal,
  getHeaderValue,
  formatDate,
  formatTime,
  openDataWindow,
  logError,
} from "./utils.js";
import { fetchEmailDetails } from "./api.js";

export class EmailManager {
  constructor(config) {
    this.elements = {
      select: config.selectId,
      viewButton: config.viewButtonId,
      deleteButton: config.deleteButtonId,
      extraButton: config.extraButtonId,
    };
  }

  toggleElements(showElements) {
    Object.values(this.elements)
      .filter((id) => id)
      .forEach((elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
          element.style.display = showElements ? "block" : "none";
        }
      });
  }

  displayList(items, formatOption = (id, count) => `${id} (${count} emails)`) {
    this.toggleElements(false);

    if (!items?.length) {
      showCustomModal("No items found.");
      return;
    }

    const select = document.getElementById(this.elements.select);
    if (!select) return;

    select.innerHTML = "";
    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id || item.sender; // support both formats
      option.textContent = formatOption(item.id || item.sender, item.count);
      select.appendChild(option);
    });

    this.toggleElements(true);
  }

  async getEmailDetails(token, messageId) {
    try {
      const emailData = await fetchEmailDetails(token, messageId);
      if (!emailData?.headers) return null;

      return {
        subject: getHeaderValue(emailData.headers, "Subject") || "(No Subject)",
        date: formatDate(
          new Date(getHeaderValue(emailData.headers, "Date") || Date.now())
        ),
        time: formatTime(
          new Date(getHeaderValue(emailData.headers, "Date") || Date.now())
        ),
      };
    } catch (error) {
      logError(error, messageId);
      return null;
    }
  }

  async displayEmailSubjects(token, messageIds, title = "Email Subjects") {
    const subjectPromises = messageIds.map((messageId) =>
      this.getEmailDetails(token, messageId)
    );

    const subjects = await Promise.all(subjectPromises);
    const validSubjects = subjects.filter((subject) => subject !== null);

    if (validSubjects.length === 0) {
      showCustomModal("No email subjects could be retrieved.");
      return null;
    }

    const dataPayload = {
      tableTitle: title,
      columns: [
        { label: "Subject", key: "subject" },
        { label: "Date", key: "date" },
        { label: "Time", key: "time" },
      ],
      dataItems: validSubjects,
    };

    openDataWindow("../popup/list-page/listPage.html", dataPayload);
  }
}
