# Gmail Manager Chrome Extension

Chrome extension for bulk deleting Gmail emails and fast unsubscribing with real-time emails count updates.

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
