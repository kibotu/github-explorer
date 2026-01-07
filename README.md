# GitHub Repository Explorer

A modern, responsive web application to explore and filter GitHub repositories for a specific user profile.

## Features

- 🔍 **Search**: Real-time search across repository names and descriptions
- 🎯 **Smart Filters**: Filter by forks, sources, public/private repositories (with combinations)
- 📄 **Infinite Scroll**: Browse through repositories with automatic loading
- 🏷️ **Language Badges**: Visual badges showing the primary programming language
- 📊 **Repository Stats**: Stars, forks, issues, watchers, and size at a glance
- 🔄 **Flexible Sorting**: Sort by last updated, last commit, created date, name, stars, or forks
- 📋 **Collapsible Details**: Expandable metadata sections with comprehensive repository information
- 🔗 **Direct Links**: Quick access to repositories, issues, wikis, and homepages
- 🌓 **Dark Mode**: Automatic dark mode support based on system preferences
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- ⚡ **Progressive Loading**: Shows results immediately while loading more in background

## Quick Start

### 1. Start a Local Web Server

**Important**: You must run this through a web server (not by opening the HTML file directly) due to browser CORS restrictions.

**Easy way** - Use the provided script:
```bash
./serve.sh
```

**Or manually** - Choose one:
```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# PHP
php -S localhost:8000

# Node.js
npx http-server -p 8000
```

Then open: **http://localhost:8000**

### 2. Configure Your GitHub Token (Optional but Recommended)

1. Copy the config template:
   ```bash
   cp config.local.template.js config.local.js
   ```

2. Get a GitHub token from: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scope: `repo` (for private repositories)
   - Copy the token

3. Edit `config.local.js`:
   ```javascript
   window.LOCAL_CONFIG = {
       GITHUB_TOKEN: 'ghp_YourActualTokenHere',
       GITHUB_USERNAME: 'your-username'
   };
   ```

4. Refresh the page

### Without Authentication

You can skip the token setup for public repositories only:
- Just start the server and open the page
- Rate limit: 60 requests per hour
- Public repositories only

## Usage

### Search
Type in the search box to filter repositories by name or description in real-time.

### Filters
Use the checkboxes to filter repositories:
- **Forks**: Show forked repositories
- **Sources**: Show original repositories (not forks)
- **Public**: Show public repositories
- **Private**: Show private repositories (requires authentication)

You can combine filters to narrow down results (e.g., show only public sources).

### Sorting
Choose how to sort your repositories:
- **Last Updated**: Most recently updated repositories first (default)
- **Last Commit**: Most recently committed repositories first
- **Created Date**: Newest or oldest repositories
- **Name**: Alphabetically
- **Stars**: Most or least starred
- **Forks**: Most or least forked

Toggle between ascending and descending order.

### Repository Details
Click "Show Details" on any repository card to expand and view:
- Homepage URL
- Creation, update, and last push dates
- Default branch
- License information
- Topics/tags
- Links to issues and wiki
- Parent repository (for forks)

### Infinite Scroll
Just scroll down! More repositories automatically load as you reach the bottom of the page.

## GitHub API

This application uses the GitHub REST API v3:

- **With authentication**: Access private repositories, rate limit: 5000 requests/hour
- **Without authentication**: Public repositories only, rate limit: 60 requests/hour

The app automatically uses the token from your `config.local.js` file if available. You'll see a console message indicating whether the token was loaded successfully.

## Why Do I Need a Web Server?

Modern browsers block API requests from `file://` URLs due to CORS (Cross-Origin Resource Sharing) security policies. Running a local web server serves the files via `http://localhost`, which allows the GitHub API requests to work properly.

## Customization

### Colors
Edit the CSS variables in `styles.css` to customize the color scheme:

```css
:root {
    --primary-color: #0969da;
    --secondary-color: #1f2328;
    /* ... more variables */
}
```

### Language Colors
Add or modify language colors in `script.js`:

```javascript
const languageColors = {
    'JavaScript': '#f1e05a',
    'Python': '#3572A5',
    // Add more languages...
};
```

### Items Per Page
Change the `PER_PAGE` constant in `script.js` to adjust how many repositories are shown per scroll batch.

## Browser Compatibility

Works in all modern browsers that support:
- ES6+ JavaScript
- CSS Grid
- CSS Custom Properties
- Fetch API

## Troubleshooting

### CORS Errors
If you see CORS errors in the console, make sure you're accessing the page through a web server (`http://localhost:8000`) and not opening the HTML file directly (`file://`).

### No Private Repositories
Make sure:
1. You have a valid GitHub token in `config.local.js`
2. The token has the `repo` scope
3. You're running through a web server

### Rate Limit Errors
Add a GitHub token to increase the rate limit from 60 to 5000 requests per hour.

## License

MIT License - feel free to use this project however you'd like!
