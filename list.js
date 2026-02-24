// initial setup
var list_init_perf = perfStart("list-init");
var marked_read_urls;
var marked_read_urls_updated = false;

if (localStorage['marked_read_urls']) {
    // cleanup
    marked_read_urls = JSON.parse(localStorage['marked_read_urls']);
    var now = (new Date()).getTime();

    // delete urls older than 4 days
    for (var url in marked_read_urls) {
        if (now - marked_read_urls[url] > FOUR_DAYS_MS) {
            delete marked_read_urls[url];
            marked_read_urls_updated = true;
        }
    }
} else {
    marked_read_urls = {};
    marked_read_urls_updated = true;
}

if (marked_read_urls_updated) {
    localStorage['marked_read_urls'] = JSON.stringify(marked_read_urls);
}

var titles = 0;
var titles_marked = 0;
var more_td = null;
var story_entries = [];

// hide or show the row depending on "hide read" status
function hideShowRow(mainlink) {
    var hide_marked_urls = localStorage["hide_marked_urls"] == 'true';
    var following = mainlink && mainlink.dataset.following == "true";
    var title_td = closest(mainlink, "td");
    var title_tr = title_td ? title_td.parentElement : null;
    var subtext_tr = title_tr ? title_tr.nextElementSibling : null;
    var spacer_tr = subtext_tr ? subtext_tr.nextElementSibling : null;

    if (hide_marked_urls && !following) {
        hide(title_tr);
        hide(subtext_tr);

        if (spacer_tr && !qs("a", spacer_tr)) hide(spacer_tr);
    } else {
        show(title_tr);
        show(subtext_tr);
        show(spacer_tr);
    }
}

// check which pieces of news have already been marked read and change their color
qsa(".subtext").forEach(function(sub) {
    var subtext_tr = sub.parentElement;
    var title_tr = subtext_tr ? subtext_tr.previousElementSibling : null;
    var mainlink = title_tr ? qs(".title a", title_tr) : null;
    if (!mainlink) return;

    var mainlink_href = mainlink.getAttribute("href");

    story_entries.push({
        sub: sub,
        mainlink: mainlink,
        href: mainlink_href
    });

    titles++;

    // check if following
    var following = false;
    var comment_links = qsa("a", sub);
    var comments_a = comment_links.length ? comment_links[comment_links.length - 1] : null;

    if (comments_a && comments_a.href && comments_a.href.indexOf("item?id=") != -1) {
        var item_id_match = comments_a.href.match(/[0-9]+/);
        var item_id = item_id_match ? item_id_match[0] : null;
        var comments_match = comments_a.innerText.match(/[0-9]+/);
        var comments = comments_match ? comments_match[0] * 1 : 0;

        // if following, check the number of comments and highlight
        if (item_id && followed_items[item_id]) {
            following = true;
            mainlink.style.color = "#7070b0";

            var unread_comments = comments - followed_items[item_id].read_comments;

            if (unread_comments > 0) {
                comments_a.textContent = "unread comments: " + unread_comments + "/" + comments;
                comments_a.style.color = "green";
            }

            mainlink.dataset.following = "true";
        }
    }

    // check if marked, and give the read color if it was marked
    if (mainlink_href && marked_read_urls[mainlink_href] && !following) {
        mainlink.style.color = "#828282";
        titles_marked++;
        hideShowRow(mainlink);
    }
});

var title_cells = qsa(".title");
more_td = title_cells.length ? title_cells[title_cells.length - 1] : null;
if (more_td && more_td.textContent.trim() != "More") more_td = null; // fixed after HN change April 15, 2015

function markAllRead() {
    var marked_at = (new Date()).getTime();

    story_entries.forEach(function(entry) {
        if (!entry.href) return;

        // add the link to the "read" ones
        if (!marked_read_urls[entry.href]) {
            // add the url to the read ones
            marked_read_urls[entry.href] = marked_at;

            // give the "read" color
            entry.mainlink.style.color = "#828282";

            hideShowRow(entry.mainlink);
        }
    });

    localStorage['marked_read_urls'] = JSON.stringify(marked_read_urls);
}

// add controls on any listing page that has stories (including short last pages)
if (titles > 0) {
    var icon_url = chrome.runtime.getURL("/images/HNMarkAllRead-18.png");
    var pagetop = qsa(".pagetop")[0];

    if (pagetop) {
        pagetop.insertAdjacentHTML("beforeend",
            "&nbsp; <span class='mark_all_read' title='Mark all read'><a href='javascript:void(0);'><img src='" + icon_url + "'></img></a></span>" +
            "<span id='hide_span' class='hide_news_span'><input type='checkbox' id='hide_read_items' /><label for='hide_read_items'>Hide read</label></span>"
        );
    }

    if (more_td) {
        more_td.insertAdjacentHTML("beforeend",
            "&nbsp; <span class='mark_all_read near_more' title='Mark all read'><a href='javascript:void(0);'><img src='" + icon_url + "'></img></a></span>"
        );
    }

    var hide_read_items = document.getElementById("hide_read_items");
    if (hide_read_items && localStorage["hide_marked_urls"] == 'true') {
        hide_read_items.checked = true;
    }

    qsa(".mark_all_read").forEach(function(el) {
        el.addEventListener("click", function(event) {
            event.preventDefault();
            markAllRead();
        });
    });

    if (hide_read_items) {
        hide_read_items.addEventListener("change", function() {
            localStorage["hide_marked_urls"] = hide_read_items.checked;

            story_entries.forEach(function(entry) {
                if (entry.href && marked_read_urls[entry.href]) hideShowRow(entry.mainlink);
            });
        });
    }
}

perfEnd(list_init_perf, "titles=" + titles + ", marked=" + titles_marked);
