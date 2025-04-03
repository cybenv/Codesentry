# CodeSentry

CodeSentry helps prevent code from being broken during browser translation. I created it because I was frustrated by how Deepl often broke code examples on programming blogs.

## What it does

- **Finds code blocks** on web pages automatically
- **Protects code** using multiple methods:
  - Adds `translate="no"` attributes
  - Applies `notranslate` class
  - Uses Shadow DOM when needed (this one works best!)
  - Converts elements to protected versions
- **Pattern detection** for inline code in regular text
- **Special rules** for sites like GitHub, Stack Overflow
- **Customizable** settings for power users
- **Exclude domains** you don't want it to run on

## How It Works

The extension is pretty simple under the hood:

1. It scans the page for code elements (`<pre>`, `<code>`, etc.)
2. It applies various protection techniques to prevent translation
3. It keeps watching as you browse (for single-page apps and dynamic content)
4. If enabled, it also looks for code-like patterns in regular text (this can be CPU intensive)

## Installation

1. Clone this repo or download the zip
2. Go to `chrome://extensions/` in Chrome
3. Turn on "Developer mode" (top-right)
4. Click "Load unpacked" and pick the folder
5. You should see the CodeSentry icon in your toolbar

## Usage

### Basic Usage

1. Click the CodeSentry icon in your toolbar to see the current status
2. Toggle the extension on/off as needed
3. Visit a page with code and use a translation service - the code will be preserved

### Advanced Configuration

1. Click the "Settings" button in the popup or right-click the extension icon and select "Options"
2. Configure protection methods, elements to protect, and excluded domains
3. Enable/disable advanced pattern detection
4. Save your changes
