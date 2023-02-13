## Hacker News: Mark All Read

This is the source code for [my fork of the Chrome extension Hacker News: Mark All Read](https://chrome.google.com/webstore/detail/hacker-news-mark-all-read/fghfahcbhpdeeaaofcefaoodmfejieok). The original extension was developed by Daniele Mazzini in 2012, but the code hasn't been updated in several years, so I cloned the code to make it work with the current version of HN site, and upgraded to Manifest v3. All the credit goes to the [original author](https://github.com/danmaz74/HNMarkAllRead).

**Changelog:**
- 2023-02 - Upgraded Manifest from v2 to v3
- 2016-06 - Fixed post HN changes on June 1, 2016
- 2015-04 - Forked the original extension, and updated images, icons and color scheme


### Features

This extension improves the usability of the Hacker News website with the following six key features:

- **Mark Stories as Read** - No need to scan the whole list of news to find new entries! Simply press the button to mark all entries as read and gray them out.
- **Mark Comments as Read** - Same as Mark Stories as Read, but for comments.
- **Hide Read Comments** - When used in combination with Mark Comments as Read, you can easily see only new comments since you've last marked them as read.
- **Follow Comments** - Allows you to follow comments for a particular story. Followed stories are shown in a different color in the index whenever there's a new comment posted.
- **Show Parent Comment** - Hover over the "Show parent" next to each comment to quickly see the parent comment. This is incredibly helpful for deeply nested threads, so you can easily understand the parent context of the current reply.
- **Collapse / Expand All Comments** - You can collapse all comments so you can more quickly scan only the topline ones, and drill down when desired.

These features make it easier and faster to navigate and consume content on Hacker News, saving you time and improving your experience.

![Screenshot #1](https://user-images.githubusercontent.com/205000/218369624-1e1d063f-c499-4452-af2e-b0f927cafa7c.png)

![Screenshot #2](https://user-images.githubusercontent.com/205000/218369634-6f7da19c-6ef5-4430-a8e3-828712f39d77.png)


### Original license

The MIT License (MIT) Copyright (c) 2012 Daniele Mazzini

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
