// Global cache object to store subscription data
const subscriptionCache = {
  emails: [], // To store unique email addresses and unsubscribe links
  emailCount: 0, // To count unique email addresses
};

// Function to fetch all subscription emails using the filter, handling pagination and removing duplicates
function fetchAllSubscriptions(token, callback, pageToken = null) {
  // Use the filter you found to work well
  const query = '("unsubscribe")';
  let url = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
    query
  )}`;
  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }

  fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.messages && data.messages.length > 0) {
        return processSubscriptionEmails(token, data.messages).then(() => {
          if (data.nextPageToken) {
            // Fetch the next page if nextPageToken exists
            fetchAllSubscriptions(token, callback, data.nextPageToken);
          } else {
            // No more pages, remove duplicates, count unique emails, and display results
            removeDuplicateEmails();
            subscriptionCache.emailCount = subscriptionCache.emails.length; // Update unique email count
            displaySubscriptions();
            callback();
          }
        });
      } else {
        // No more messages to process, count unique emails, and display results
        removeDuplicateEmails();
        subscriptionCache.emailCount = subscriptionCache.emails.length; // Update unique email count
        displaySubscriptions();
        callback();
      }
    })
    .catch((error) => {
      console.error("Error fetching subscriptions:", error);
      callback();
    });
}

// Function to process the fetched subscription emails
function processSubscriptionEmails(token, messages) {
  const fetchPromises = messages.map((message) =>
    fetchMessageDetails(token, message.id)
      .then((details) => {
        // Check if payload and headers exist
        if (details && details.payload && details.payload.headers) {
          const unsubscribeLink = extractUnsubscribeLink(details);
          const emailAddress = details.payload.headers.find(
            (header) => header.name === "From"
          )?.value;
          if (unsubscribeLink && emailAddress) {
            subscriptionCache.emails.push({
              messageId: message.id,
              emailAddress: emailAddress.trim(), // Trim whitespace
              unsubscribeLink,
            });
          }
        }
      })
      .catch((error) => {
        console.error(`Error processing message ${message.id}:`, error);
      })
  );

  return Promise.all(fetchPromises);
}

// Function to fetch message details by ID
function fetchMessageDetails(token, messageId) {
  const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`;

  return fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
    .then((response) => response.json())
    .catch((error) => {
      console.error(`Error fetching message details for ${messageId}:`, error);
    });
}

// Extract unsubscribe link from email headers
function extractUnsubscribeLink(details) {
  const unsubscribeHeader = details.payload.headers.find(
    (header) => header.name === "List-Unsubscribe"
  );
  if (unsubscribeHeader) {
    // Extract the actual URL (it might be a mailto link or a web URL)
    const matches = unsubscribeHeader.value.match(/<(.*?)>/);
    return matches ? matches[1] : null;
  }
  return null;
}

// Remove duplicate emails from the cache
function removeDuplicateEmails() {
  const uniqueEmails = new Map(); // Map to store unique emails and their corresponding unsubscribe links

  subscriptionCache.emails.forEach(({ emailAddress, unsubscribeLink }) => {
    if (!uniqueEmails.has(emailAddress)) {
      uniqueEmails.set(emailAddress, unsubscribeLink); // Store the first occurrence
    }
  });

  // Update the cache with unique emails only
  subscriptionCache.emails = Array.from(
    uniqueEmails,
    ([emailAddress, unsubscribeLink]) => ({
      emailAddress,
      unsubscribeLink,
    })
  );
}

// Display fetched subscriptions in the select dropdown
function displaySubscriptions() {
  const subSelect = document.getElementById("subSelect");
  subSelect.innerHTML = ""; // Clear any existing options

  subscriptionCache.emails.forEach(({ emailAddress }) => {
    const option = document.createElement("option");
    option.value = emailAddress;
    option.textContent = emailAddress;
    subSelect.appendChild(option);
  });

  subSelect.style.display = "block";
}

// Handle the unsubscription process
function unsubscribeFromEmail(token, email) {
  const subscription = subscriptionCache.emails.find(
    (entry) => entry.emailAddress === email
  );
  if (subscription && subscription.unsubscribeLink) {
    confirmUnsubscription(subscription.unsubscribeLink); // Perform the unsubscribe action
  } else {
    showCustomModal(`Unsubscribe link not found for "${email}".`); // Show error if no link is found
  }
}

// Open the unsubscribe link in a new tab
function confirmUnsubscription(unsubscribeLink) {
  window.open(unsubscribeLink, "_blank"); // Open the link in a new tab
}

// Show the appropriate window (for navigation)
function showWindow(windowId) {
  const windows = document.querySelectorAll(".window"); // Assuming each window has a 'window' class
  windows.forEach((window) => window.classList.add("hidden"));
  document.getElementById(windowId).classList.remove("hidden");
}
