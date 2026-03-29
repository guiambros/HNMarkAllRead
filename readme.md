# Hacker News: Mark All Read

A Chrome extension that makes browsing Hacker News faster and more efficient. Mark stories and comments as read, follow discussions, and optionally sync your data across devices.

[Install from Chrome Web Store](https://chrome.google.com/webstore/detail/hacker-news-mark-all-read/fghfahcbhpdeeaaofcefaoodmfejieok)

## Features

* **Mark Stories as Read**: No more scanning the entire front page to find new stories. Click the button to mark all visible stories as read - they'll turn gray so you can instantly spot what's new on your next visit.
* **Mark Comments as Read**: Same idea, but for comments. Mark all comments as read, then easily identify new replies when returning to a discussion.
* **Hide Read Items**: Toggle visibility of read stories / comments. Lets you see only new content since your last visit.
* **Follow Comments**: Keep track of active discussions. Followed stories appear in a different color on the front page, showing how many new comments have been posted since you last checked.
* **Show Parent Comment**: Hover over "show parent" next to any comment to preview its parent. Essential for understanding context in deeply nested threads without scrolling up.
* **Collapse / Expand All**: Quickly collapse all comments to scan top-level replies, then expand threads that interest you.

## Optional: Cross-Device Sync

Sync your read status across multiple devices using your own Google Drive account.

### Privacy First

- **Your data stays yours.** All data is stored locally on your device and, if you enable sync, in a private app folder in your own Google Drive account.
- **No external servers.** We don't run any servers. There's no analytics, no tracking, no data collection.
- **We can't see your data.** The sync uses Google Drive's App Data folder, which is private and inaccessible to anyone except you.
- **Open source.** Review the code yourself - what you see is what runs.

### How to Enable Sync

1. Right-click the extension icon and select **Options** (or go to `chrome://extensions`, find the extension, and click **Details > Extension options**)
2. Click **Connect to Google Drive**
3. Authorize the extension to access its private app folder
4. Your data will automatically sync every 5 minutes

You can disconnect at any time. Your local data remains intact.

## Screenshots

![Screenshot #1](https://user-images.githubusercontent.com/205000/218369624-1e1d063f-c499-4452-af2e-b0f927cafa7c.png)

![Screenshot #2](https://user-images.githubusercontent.com/205000/218369634-6f7da19c-6ef5-4430-a8e3-828712f39d77.png)

## Changelog

- **2026-03-29** - Add optional Google Drive sync for cross-device support
- **2026-02-24** - Fix Hide Read functionality broken by new page formatting
- **2026-02-23** - Fix bug on last page with fewer than 30 entries (thanks @ib0ndar)
- **2023-11-24** - Published extension to Chrome Web Store
- **2023-02-13** - Upgraded from Manifest v2 to v3
- **2016-06-08** - Fixed issues after HN site changes on June 1, 2016
- **2015-04-14** - Forked original extension; updated images, icons, and color scheme

## Credits

This is a fork and expansion of the [original extension](https://github.com/danmaz74/HNMarkAllRead) by [Daniele Mazzini](https://github.com/danmaz74/) (2012). The original project is no longer maintained, so this fork keeps it working with current HN and Chrome requirements.

## License

MIT License - Copyright (c) 2012 Daniele Mazzini

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
