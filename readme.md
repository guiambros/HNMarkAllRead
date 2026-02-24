## Hacker News: Mark All Read

This repository contains the current source code for the Chrome extension **Hacker News: Mark All Read**.

### Upstream Attribution

- Original extension project: [danmaz74/HNMarkAllRead](https://github.com/danmaz74/HNMarkAllRead)
- Original author: [Daniele Mazzini](https://github.com/danmaz74/)
- Original announcement: [Save even more time on Hacker News](http://danmaz74.me/2012/10/15/save-even-more-time-on-hacker-news/)

This project is a maintained fork of the original work, with compatibility and performance updates while keeping the original concept and behavior.

### Changelog

- 2026-02-24 - Performance modernization release:
  - Split content script by page type (`list.js`, `item.js`, `common.js`)
  - Removed jQuery dependency and migrated to native DOM APIs
  - Added delegated event handlers for large comment threads
  - Reduced synchronous storage and selector overhead
  - Added optional init timing instrumentation (`localStorage["hnmar_perf"] = "true"`)
- 2023-11 - Published extension to Chrome Web Store
- 2023-02 - Upgraded Manifest from v2 to v3
- 2016-06 - Fixed post-HN changes on June 1, 2016
- 2015-04 - Forked the original extension and updated images, icons, and color scheme

### Features

- **Mark Stories as Read** - Mark all entries as read and gray them out.
- **Mark Comments as Read** - Same as mark stories, but for comments.
- **Hide Read Comments** - See only new comments after your last read mark.
- **Follow Comments** - Track comment count changes for selected stories.
- **Show Parent Comment** - Hover to preview the parent comment for context.
- **Collapse / Expand All Comments** - Collapse long threads and expand when needed.

### License

This project is licensed under the MIT License.

- See [LICENSE](./LICENSE) for the full text.
- See [NOTICE](./NOTICE) for upstream attribution details.
