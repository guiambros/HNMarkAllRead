// initial setup for read comments
var item_init_perf = perfStart("item-init");
var marked_read_comments;
var marked_read_comments_updated = false;

if (localStorage['marked_read_comments']) {
    // cleanup
    marked_read_comments = JSON.parse(localStorage['marked_read_comments']);
    var now = (new Date()).getTime();

    // delete data older than 4 days
    for (var comment in marked_read_comments) {
        if (now - marked_read_comments[comment] > FOUR_DAYS_MS) {
            delete marked_read_comments[comment];
            marked_read_comments_updated = true;
        }
    }
} else {
    marked_read_comments = {};
    marked_read_comments_updated = true;
}

if (marked_read_comments_updated) {
    localStorage['marked_read_comments'] = JSON.stringify(marked_read_comments);
}

// comments traversing
var parents = [];
var last_depth = 0;
var last_node = null;
var first_child = false;
var comments_unread = 0;
var comments_total = 0;
var collapsible_parents = Object.create(null);
var parent_comment_nodes = Object.create(null);
var comment_rows_by_id = Object.create(null);
var comment_cells_by_id = Object.create(null);
var collapse_buttons_by_id = Object.create(null);
var collapsible_ids = [];

var icon_url = chrome.runtime.getURL("/images/HNMarkAllRead-18.png");
var post_subtext = qs(".subtext");
var comments_counter = null;

if (post_subtext) {
    var post_links = qsa("a", post_subtext);
    comments_counter = post_links[2] || null;

    post_subtext.insertAdjacentHTML("beforeend",
        "&nbsp; <span class='mark_all_read' title='Mark all comments read'><img src='" + icon_url + "'></img></span>" +
        "<span id='hide_span' class='hide_comments_span'><input type='checkbox' id='hide_read_items' /><label for='hide_read_items'>Hide read comments</label></span>"
    );
}

// Add the secondary "mark all read" button near the comments.
var post_comments_tr = document.createElement("tr");
post_comments_tr.innerHTML = "<td id='post_comments_tr'></td>";

var table0 = document.getElementsByTagName("table")[0];
var table0_rows = table0 ? qsa("tr", table0) : [];
var insert_after = table0_rows.length > 2
    ? table0_rows[2]
    : null;

if (insert_after && insert_after.parentNode) {
    insert_after.insertAdjacentElement("afterend", post_comments_tr);
}

var mark_all_for_post = qs(".mark_all_read");
var post_comments_td = document.getElementById("post_comments_tr");
if (mark_all_for_post && post_comments_td) {
    post_comments_td.appendChild(mark_all_for_post.cloneNode(true));
}

// Replace stock "XX comments" row with extension controls.
var table2 = document.getElementsByTagName("table")[2];
var controls = document.createElement("div");
controls.id = "expand_collapse_top";
controls.innerHTML =
    "<span id='collapse_all' class='clickable' title='collapse all comments'>--</span>" +
    "&nbsp;&nbsp;" +
    "<span id='expand_all' class='clickable' title='expand all comments'>++</span>" +
    "&nbsp;&nbsp;" +
    "<span id='follow_span'><input type='checkbox' id='follow_item' title='Follow the comments for this item from the first page' />Follow comments</span>";

if (table2 && table2.nextElementSibling && table2.nextElementSibling.parentNode) {
    table2.nextElementSibling.parentNode.replaceChild(controls, table2.nextElementSibling);
} else if (post_subtext) {
    post_subtext.insertAdjacentElement("afterend", controls);
}

document.body.insertAdjacentHTML("beforeend", "<div id='parent_div'><table><tr id='parent_tr'></tr></table></div>");
var parent_div = document.getElementById("parent_div");
var parent_tr = document.getElementById("parent_tr");

// create an accessible stylesheet
var style = document.createElement("style");
document.body.appendChild(style);
var sheet = style.sheet;
var active_css_rules = Object.create(null);

// iterate over each comment entry
qsa("tr.athing").forEach(function(tr) {
    if (!qs("span.age", tr)) return;

    try {
        var indentation_img = qs("td.ind img", tr);
        var age_link = qs("span.age a", tr);
        var node = tr.firstElementChild; // "node" is the sole td child of the tr.

        if (!indentation_img || !age_link || !node) return;

        var indentation = indentation_img.width;
        var comment_id_match = age_link.href.match(/[0-9]+/);
        if (!comment_id_match) return;
        var comment_id = comment_id_match[0];

        comments_total++;

        // read/unread comments management
        tr.dataset.commentId = comment_id;
        tr.classList.add("comment_tr_" + comment_id);
        node.dataset.commentId = comment_id;
        node.classList.add("comment_td_" + comment_id);
        comment_rows_by_id[comment_id] = tr;
        comment_cells_by_id[comment_id] = node;

        // check if marked, and give the read color if it was marked
        if (marked_read_comments[comment_id]) {
            tr.classList.add("read_comment_tr");
            node.classList.add("read_comment_td");
        } else {
            tr.classList.add("unread_comment_tr");
            node.classList.add("unread_comment_td");
            comments_unread++;
        }

        // nesting management
        var depth = indentation / 40;
        if (depth > last_depth) {
            if (last_node) {
                parents.push(last_node);
                first_child = true;
            } else {
                first_child = false;
            }
        } else {
            first_child = false;

            if (depth < last_depth) {
                for (var j = 0; j < last_depth - depth; j++) parents.pop();
            }
        }

        if (parents.length > 0) {
            var parent = parents[parents.length - 1];
            if (parent) {
                parent_comment_nodes[comment_id] = parent;

                var comhead = qs("span.comhead", node);
                if (comhead) {
                    var show_parent_container = document.createElement("span");
                    if (first_child) show_parent_container.className = "showparent_firstchild";
                    show_parent_container.innerHTML = " | <span class='showparent'>show parent</span>";
                    comhead.appendChild(show_parent_container);
                }
            }
        }

        // for collapsing
        for (var k = 0; k < parents.length; k++) {
            var parent_node = parents[k];
            if (!parent_node || !parent_node.dataset.commentId) continue;

            var parent_id = parent_node.dataset.commentId;
            tr.classList.add("descends_from_" + parent_id);
            collapsible_parents[parent_id] = parent_node;
        }

        last_node = node;
        last_depth = depth;
    } catch(e) {
        console.log(e);
    }
});

function handleShowParentHover(event) {
    var showparent = closest(event.target, ".showparent");
    if (!showparent) return;

    if (event.relatedTarget && showparent.contains(event.relatedTarget)) return;

    var node = closest(showparent, "td");
    if (!node) return;

    var comment_id = node.dataset.commentId;
    var parent = parent_comment_nodes[comment_id];
    if (!parent || !parent_tr || !parent_div) return;

    parent_tr.innerHTML = "";
    parent_tr.appendChild(parent.cloneNode(true));
    node.style.position = "relative";
    node.appendChild(parent_div);
    show(parent_div);
}

function handleShowParentOut(event) {
    var showparent = closest(event.target, ".showparent");
    if (!showparent) return;

    if (event.relatedTarget && showparent.contains(event.relatedTarget)) return;

    if (!parent_tr || !parent_div) return;
    parent_tr.innerHTML = "";
    hide(parent_div);
}

document.addEventListener("mouseover", handleShowParentHover);
document.addEventListener("mouseout", handleShowParentOut);

function markAllCommentsRead() {
    var read_comments_at = (new Date()).getTime();

    qsa(".unread_comment_td").forEach(function(sel) {
        var comment_id = sel.dataset.commentId;
        if (!comment_id) return;

        marked_read_comments[comment_id] = read_comments_at;

        sel.classList.remove("unread_comment_td");
        sel.classList.add("read_comment_td");

        var tr = comment_rows_by_id[comment_id];
        if (tr) {
            tr.classList.remove("unread_comment_tr");
            tr.classList.add("read_comment_tr");
        }
    });

    comments_unread = 0;
    if (item_id && followed_items[item_id]) {
        followed_items[item_id].read_comments = comments_total;
        localStorage['followed_items'] = JSON.stringify(followed_items);
    }

    localStorage['marked_read_comments'] = JSON.stringify(marked_read_comments);

    if (comments_counter) {
        comments_counter.textContent = "unread comments: 0/" + comments_total;
    }
}

document.addEventListener("click", function(event) {
    var mark_all = closest(event.target, ".mark_all_read");
    if (!mark_all) return;

    event.preventDefault();
    markAllCommentsRead();
});

/////////////////////////////////
// following this item

var item_id_match = window.location.href.match(/[0-9]+/);
var item_id = item_id_match ? item_id_match[0] : null;
var follow_item = document.getElementById("follow_item");

if (item_id && follow_item && followed_items[item_id]) {
    follow_item.checked = true;
}

if (item_id && follow_item) {
    follow_item.addEventListener("change", function() {
        if (follow_item.checked) {
            followed_items[item_id] = {
                time: (new Date()).getTime(),
                read_comments: comments_total - comments_unread
            };
        } else {
            delete followed_items[item_id];
        }

        localStorage['followed_items'] = JSON.stringify(followed_items);
    });
}

/////////////////////////////////
// hiding marked comments

function hideMarkedComments(val) {
    if (val) {
        addCssRule(".read_comment_tr {display: none;}");
        deleteCssRule(".showparent_firstchild");
    } else {
        addCssRule(".showparent_firstchild {display: none;}");
        deleteCssRule(".read_comment_tr");
    }
}

var hide_read_items = document.getElementById("hide_read_items");
if (hide_read_items) {
    if (localStorage["hide_marked_comments"] == 'true') {
        hide_read_items.checked = true;
        hideMarkedComments(true);
    } else {
        hideMarkedComments(false);
    }

    hide_read_items.addEventListener("change", function() {
        localStorage["hide_marked_comments"] = hide_read_items.checked;
        hideMarkedComments(hide_read_items.checked);
    });
}

if (comments_counter) {
    comments_counter.textContent = "unread comments: " + comments_unread + "/" + comments_total;
}

//////////////////////////////////
// comments collapsing

// set collapsible comments up
for (var id in collapsible_parents) {
    if (!collapsible_parents[id]) continue;

    var parent = collapsible_parents[id];
    parent.classList.add("collapsible_comment");

    var collapse_button = document.createElement("div");
    collapse_button.className = "comment_collapse";
    collapse_button.title = "expand/collapse";
    collapse_button.setAttribute("data-comment-id", id);
    collapse_button.textContent = "-";
    parent.appendChild(collapse_button);
    collapse_buttons_by_id[id] = collapse_button;
    collapsible_ids.push(id);
}

function setCollapsed(id, collapse) {
    var tr = comment_rows_by_id[id];
    var td = comment_cells_by_id[id];
    var collapse_button = collapse_buttons_by_id[id];
    if (!tr || !td) return;

    if (collapse) {
        addCssRule(".descends_from_" + id + " {display: none;}");

        tr.dataset.collapsed = "true";
        td.classList.add("collapsible_collapsed");
        if (collapse_button) collapse_button.textContent = "+";
    } else {
        deleteCssRule(".descends_from_" + id);

        tr.dataset.collapsed = "false";
        td.classList.remove("collapsible_collapsed");
        if (collapse_button) collapse_button.textContent = "-";
    }
}

document.addEventListener("click", function(event) {
    var collapse_btn = closest(event.target, ".comment_collapse");
    if (collapse_btn) {
        var comment_id = collapse_btn.getAttribute("data-comment-id");
        var tr = comment_id ? comment_rows_by_id[comment_id] : null;
        var collapsed = tr ? tr.dataset.collapsed == "true" : false;
        setCollapsed(comment_id, !collapsed);
        return;
    }

    var collapse_all = closest(event.target, "#collapse_all");
    if (collapse_all) {
        collapsible_ids.forEach(function(id) {
            setCollapsed(id, true);
        });
        return;
    }

    var expand_all = closest(event.target, "#expand_all");
    if (expand_all) {
        collapsible_ids.forEach(function(id) {
            setCollapsed(id, false);
        });
    }
});

/////////////////////////////
// utilities

function addCssRule(rule) {
    var selector = getSelectorFromRule(rule);
    if (selector && active_css_rules[selector]) return;

    sheet.insertRule(rule, sheet.cssRules.length);
    if (selector) active_css_rules[selector] = true;
}

function deleteCssRule(selector) {
    for (var i = sheet.cssRules.length - 1; i >= 0; i--) {
        if (sheet.cssRules[i].selectorText == selector) {
            sheet.deleteRule(i);
        }
    }

    delete active_css_rules[selector];
}

function getSelectorFromRule(rule) {
    var start = rule.indexOf("{");
    if (start == -1) return null;

    return rule.slice(0, start).trim();
}

perfEnd(item_init_perf, "comments=" + comments_total + ", unread=" + comments_unread);
