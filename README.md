# Gmail Manager Chrome Extension

Chrome extension for bulk deleting Gmail emails and fast unsubscribing with real-time emails count updates.
Watch Extension use video: https://www.youtube.com/watch?v=44Pl08BqP10

## Features

### 1. Delete by Label/Category

- View all Gmail labels and categories
- See email count for each label
- Bulk delete emails from selected labels

### 2. Delete by Email Address

- Search emails by sender address or free text term
- View all matching email addresses
- See email count for each sender
- View email details (subject, date, time)
- Bulk delete emails from selected senders

### 3. Subscription Management

- Smart detection of newsletter subscriptions
- Multi-language support for better subscription detection
- One-click unsubscribe functionality
- View all emails from each subscription
- Bulk delete subscription emails

## Key Technologies

- **Chrome Extensions Manifest V3**: Latest extension architecture ensuring security and performance
- **Gmail API**: Direct access to Gmail functions with official Google API
- **OAuth2 Authentication**: Secure Google account login with proper scopes
- **Chrome Identity API**: Secure token management and authentication flow

## Security and Privacy

- All operations are performed locally
- No data is stored on external servers
- Uses secure OAuth2 authentication
- Requires minimal permissions
- Email content is not accessed, only metadata
- No password storage
- Chrome-managed token handling

## Installation

### Prerequisites

- Google Chrome browser
- Google Cloud Console account

### Steps

1. **Clone the Repository**

   ```bash
   git clone https://github.com/erik-pinhasov/gmail-manager.git
   cd gmail-manager
   ```

2. **Set Up Google OAuth2**

   1. Go to [Google Cloud Console](https://console.cloud.google.com/)
   2. Create a new project or select an existing one
   3. Enable the Gmail API:
      - Go to "APIs & Services" > "Library"
      - Search for "Gmail API"
      - Click "Enable"
   4. Create OAuth 2.0 credentials:
      - Go to "APIs & Services" > "Credentials"
      - Click "Create Credentials" > "OAuth client ID"
      - Choose "Chrome Extension" as application type
      - Add your extension ID (see next step for getting this)
      - Download the client ID

3. **Load Extension in Chrome**

   1. Open Chrome and go to `chrome://extensions/`
   2. Enable "Developer mode" in the top right
   3. Click "Load unpacked"
   4. Select the cloned repository folder
   5. Copy the generated Extension ID

4. **Configure OAuth2**

   1. Open `manifest.json`
   2. Replace `YOUR_CLIENT_ID` in the `oauth2` section with your Google OAuth client ID:
      ```json
      "oauth2": {
        "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
        "scopes": ["https://mail.google.com/"]
      }
      ```

5. **Reload Extension**
   - Go back to `chrome://extensions/`
   - Click the reload icon on your extension
   - The extension is now ready to use

# Privacy Policy for Gmail Manager Extension

Last Updated: 1/11/2024

## Introduction

Gmail Manager is a Chrome extension that helps users manage their Gmail accounts. We take your privacy seriously and are committed to protecting your data.

## Data Collection and Usage

### What we collect:

- Email metadata (subject lines, dates, sender information)
- Email labels and categories
- Subscription and newsletter information
- Unsubscribe link data

### What we DON'T collect:

- Email content/body
- Attachments
- Personal information beyond email addresses
- Contact lists
- Passwords or security credentials

### How we use the data:

1. Email Management

   - Display email counts per label/sender
   - Process bulk deletion requests
   - Handle unsubscribe operations

2. Authentication
   - Google OAuth2 for secure login
   - No passwords are stored

### Data Storage

- All data is processed locally in your browser
- No data is stored on external servers
- Cache is temporarily stored in Chrome's local storage
- All data is automatically cleared upon logout

## Data Sharing

We do not:

- Share any user data
- Store data externally
- Use data for advertising
- Transfer data to third parties

## Security Measures

- OAuth2 secure authentication
- Local-only data processing
- Automatic token expiration
- Secure API communications
- Chrome's built-in security features

## User Rights

You can:

- Remove the extension at any time
- Revoke access through Google Account settings
- Request data deletion (though we store nothing permanently)

## Updates to Privacy Policy

- Users will be notified of any changes
- Continued use implies acceptance of updates

## Contact

https://github.com/erik-pinhasov
