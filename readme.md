# Hacker News: Mark All Read

This is a maintained fork of the original extension by Dan Mazzini (danmaz74), updated to restore compatibility with the current Hacker News layout and modern Chrome extension standards. Full credit for the original concept and implementation goes to the original author [1][2].

## Installation:

[Chrome Webstore: Hacker News: Mark All Read](https://chrome.google.com/webstore/detail/hacker-news-mark-all-read/fghfahcbhpdeeaaofcefaoodmfejieok)

## Features

This extension improves the usability of the Hacker News website with the following seven key features:

- **Mark Stories as Read**: Easily distinguish new stories from previously viewed items. A single click grays out all read entries, so you don't need to keep scanning the HN front page.

- **Mark Comments as Read**: Prevent re-reading the same discussions in active threads. Mark all comments as read, allowing for faster navigation of long, ongoing discussions.

- **Hide Read Comments**: Hide all read comments, so you can focus attention only on comments added since the last visit.

- **Follow Comments**: Stay updated on interesting threads without constantly checking the page.

- **Show Parent Comment**: Understand context immediately in deeply nested threads. Hovering over the "Show parent" link displays the immediate parent comment inline, so you don't have to scroll up to understand the context.

- **Collapse / Expand Comments**: Easily collapse or expand comment threads.

- **(NEW) Cloud Synchronization**: Opt-in to sync read status across devices. Data remains securely stored within your Chrome profile and is not shared with anyone. You can enable it in the extension settings.

We hope this extension will make your experience reading Hacker News much more convenient. Please [open an issue](https://github.com/guiambros/HNMarkAllRead/issues) for any bugs or feature requests.

![Screenshot #1](https://user-images.githubusercontent.com/205000/218369624-1e1d063f-c499-4452-af2e-b0f927cafa7c.png)

![Screenshot #2](https://user-images.githubusercontent.com/205000/218369634-6f7da19c-6ef5-4430-a8e3-828712f39d77.png)


### Changelog:
- 2026-03-07 - Added opt-in cloud synchronization for read status and settings
- 2026-02-24 - Fix Hide Read functionality, broken due to new page formatting
- 2026-02-23 - Fix bug on last page with fewer than 30 entries (thanks @ib0ndar)
- 2023-11-24 - Published extension to Chrome Webstore
- 2023-02-13 - Upgraded Manifest from v2 to v3
- 2016-06-08 - Fixed post HN changes on June 1, 2016
- 2015-04-14 - Forked the original extension, and updated images, icons and color scheme


## License

The MIT License (MIT) Copyright (c) 2012 Daniele Mazzini

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


[1] http://danmaz74.me/2012/10/15/save-even-more-time-on-hacker-news/

[2] https://github.com/danmaz74/HNMarkAllRead
