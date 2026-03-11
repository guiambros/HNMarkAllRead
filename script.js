chrome.storage.local.get({ sync_enabled: false, migrated_to_sync: false }, function(settings) {
    var syncEnabled = settings.sync_enabled;
    var migratedToSync = settings.migrated_to_sync;

    function getStore(callback) {
        if (syncEnabled) {
            chrome.storage.sync.get(['followed_items', 'marked_read_urls', 'marked_read_comments', 'hide_marked_urls', 'hide_marked_comments'], function(syncData) {
                if (chrome.runtime.lastError) {
                    console.error("HNMarkAllRead: Error fetching from sync storage:", chrome.runtime.lastError.message);
                }

                if (!migratedToSync) {
                    console.log("HNMarkAllRead: First time sync enabled. Merging local data with cloud...");
                    
                    // Get local data
                    var localData = {
                        followed_items: localStorage['followed_items'] ? JSON.parse(localStorage['followed_items']) : {},
                        marked_read_urls: localStorage['marked_read_urls'] ? JSON.parse(localStorage['marked_read_urls']) : {},
                        marked_read_comments: localStorage['marked_read_comments'] ? JSON.parse(localStorage['marked_read_comments']) : {},
                        hide_marked_urls: localStorage['hide_marked_urls'] === 'true',
                        hide_marked_comments: localStorage['hide_marked_comments'] === 'true'
                    };

                    // MERGE LOGIC
                    var mergedData = {
                        // URLs and Comments: Simple Union (latest timestamp wins for same key)
                        marked_read_urls: Object.assign({}, localData.marked_read_urls, syncData.marked_read_urls || {}),
                        marked_read_comments: Object.assign({}, localData.marked_read_comments, syncData.marked_read_comments || {}),
                        
                        // Settings: Sync wins if it exists, otherwise local
                        hide_marked_urls: (syncData.hide_marked_urls !== undefined) ? syncData.hide_marked_urls : localData.hide_marked_urls,
                        hide_marked_comments: (syncData.hide_marked_comments !== undefined) ? syncData.hide_marked_comments : localData.hide_marked_comments,
                        
                        // Followed items: Merge by ID, take latest timestamp or most comments
                        followed_items: Object.assign({}, localData.followed_items)
                    };

                    var cloudFollowed = syncData.followed_items || {};
                    for (var id in cloudFollowed) {
                        if (!mergedData.followed_items[id] || cloudFollowed[id].time > mergedData.followed_items[id].time) {
                            mergedData.followed_items[id] = cloudFollowed[id];
                        }
                    }

                    // Save unified data to cloud
                    chrome.storage.sync.set(mergedData, function() {
                        if (!chrome.runtime.lastError) {
                            chrome.storage.local.set({ migrated_to_sync: true });
                            console.log("HNMarkAllRead: Migration successful.");
                        } else {
                            console.error("HNMarkAllRead: Migration failed:", chrome.runtime.lastError.message);
                        }
                    });

                    callback(mergedData);
                } else {
                    // Already migrated, just use sync data
                    callback({
                        followed_items: syncData.followed_items || {},
                        marked_read_urls: syncData.marked_read_urls || {},
                        marked_read_comments: syncData.marked_read_comments || {},
                        hide_marked_urls: syncData.hide_marked_urls === true,
                        hide_marked_comments: syncData.hide_marked_comments === true
                    });
                }
            });
        } else {
            // Sync not enabled, use local storage as before
            callback({
                followed_items: localStorage['followed_items'] ? JSON.parse(localStorage['followed_items']) : {},
                marked_read_urls: localStorage['marked_read_urls'] ? JSON.parse(localStorage['marked_read_urls']) : {},
                marked_read_comments: localStorage['marked_read_comments'] ? JSON.parse(localStorage['marked_read_comments']) : {},
                hide_marked_urls: localStorage['hide_marked_urls'] === 'true',
                hide_marked_comments: localStorage['hide_marked_comments'] === 'true'
            });
        }
    }

    function saveStore(key, value) {
        if (syncEnabled) {
            var data = {};
            data[key] = value;
            
            // Safety check for 8KB limit
            var size = JSON.stringify(value).length;
            if (size > 8000) {
                console.warn("HNMarkAllRead: Quota warning for '" + key + "': " + size + " bytes.");
            }

            chrome.storage.sync.set(data, function() {
                if (chrome.runtime.lastError) {
                    console.error("HNMarkAllRead: Sync save failed:", chrome.runtime.lastError.message);
                }
            });
        } else {
            localStorage[key] = typeof value === 'string' ? value : JSON.stringify(value);
        }
    }

    getStore(function(store) {
        var followed_items = store.followed_items;
        var marked_read_urls = store.marked_read_urls;
        var marked_read_comments = store.marked_read_comments;
        var hide_marked_urls = store.hide_marked_urls;
        var hide_marked_comments = store.hide_marked_comments;

        var now = (new Date()).getTime();
        var four_days = 345600000;

        // cleanup
        var changed = false;
        for (var item_id in followed_items) {
            if (now - followed_items[item_id].time > four_days) {
                delete followed_items[item_id];
                changed = true;
            }
        }
        if (changed) saveStore('followed_items', followed_items);

        if (!window.location.href.match(/\/item\?/)) { // listings page
            var changed_urls = false;
            for (var url in marked_read_urls) {
                if (now - marked_read_urls[url] > four_days) {
                    delete marked_read_urls[url];
                    changed_urls = true;
                }
            }
            if (changed_urls) saveStore('marked_read_urls', marked_read_urls);

            var titles = 0;
            var more_td = null;

            function hideShowRow(mainlink) {
                var titleRow = mainlink.closest("tr");
                if (hide_marked_urls && !mainlink.data("following")) {
                    var last = titleRow.hide().next().hide().next();
                    if (!last.children("a")[0]) last.hide();
                } else titleRow.show().next().show().next().show();
            }

            $(".subtext").each(function(i,sub) {
                var mainlink = $(".title a", $(sub).parent().prev()).first()
                titles++;
                var following = false;
                var comments_a = sub.childNodes[9];

                if (comments_a) {
                    var item_id = comments_a.href.match(/[0-9]+/)[0];
                    var comments = comments_a.innerText.match(/[0-9]+/) ? comments_a.innerText.match(/[0-9]+/)[0]*1 : 0;
                    if (followed_items[item_id]) {
                        following = true;
                        mainlink.css({color: "#7070b0"});
                        var unread_comments = comments - followed_items[item_id].read_comments;
                        if (unread_comments > 0) {
                            $(comments_a).text("unread comments: "+unread_comments+"/"+comments).css({color: "green"});
                        }
                        mainlink.data("following", true);
                    }
                }

                if (marked_read_urls[mainlink.attr("href")] && !following) {
                    mainlink.css({color: "#828282"});
                    hideShowRow(mainlink);
                }
            });

            more_td = $(".title").last();
            if (more_td.text().trim() != "More") more_td = null;

            if (titles > 0) {
                $($(".pagetop")[0]).append("&nbsp; <span class='mark_all_read' title='Mark all read'><a href='javascript:void(0);'><img src='"+chrome.runtime.getURL("/images/HNMarkAllRead-18.png")+"'></img></a></span>"+
                    "<span id='hide_span' class='hide_news_span'><input type='checkbox' id='hide_read_items' /><label for='hide_read_items'>Hide read</label></span>");
                if (hide_marked_urls) $("#hide_read_items").prop("checked", true);

                if (more_td) {
                    more_td.append("&nbsp; <span class='mark_all_read near_more' title='Mark all read'><a href='javascript:void(0);'><img src='"+chrome.runtime.getURL("/images/HNMarkAllRead-18.png")+"'></img></a></span>");
                } else {
                    $(".subtext").last().parent().after("<tr><td colspan='2'></td><td class='mark_all_read_footer'><span class='mark_all_read near_more' title='Mark all read'><a href='javascript:void(0);'><img src='"+chrome.runtime.getURL("/images/HNMarkAllRead-18.png")+"'></img></a></span></td></tr>");
                }

                $(".mark_all_read").click(function () {
                    $(".subtext").each(function(i,sub) {
                        var mainlink = $(".title a", $(sub).parent().prev()).first()
                        if (!marked_read_urls[mainlink.attr("href")]) {
                            marked_read_urls[mainlink.attr("href")] = (new Date()).getTime();
                            mainlink.css({color: "#828282"});
                            hideShowRow(mainlink);
                        }
                    });
                    saveStore('marked_read_urls', marked_read_urls);
                });

                $("#hide_read_items").click(function() {
                    hide_marked_urls = $("#hide_read_items").prop("checked");
                    saveStore('hide_marked_urls', syncEnabled ? hide_marked_urls : (hide_marked_urls ? 'true' : 'false'));
                    location.reload();
                });
            }
        } else { // comments page
            var item_id = window.location.href.match(/[0-9]+/)[0];
            var changed_comments = false;
            for (var comment in marked_read_comments) {
                if (now - marked_read_comments[comment] > four_days) {
                    delete marked_read_comments[comment];
                    changed_comments = true;
                }
            }
            if (changed_comments) saveStore('marked_read_comments', marked_read_comments);

            var parents = [];
            var last_depth = 0;
            var last_node = null;
            var first_child = false;
            var comments_unread = 0;
            var comments_total = 0;
            var collapsible_parents = {};
            var comments_counter = $($(".subtext").children("a")[2]);

            $($(".subtext")[0]).append("&nbsp; <span class='mark_all_read' title='Mark all comments read'><img src='"+chrome.runtime.getURL("/images/HNMarkAllRead-18.png")+"'></img></span>"+
                    "<span id='hide_span' class='hide_comments_span'><input type='checkbox' id='hide_read_items' /><label for='hide_read_items'>Hide read comments</label></span>");

            $("<tr><td id='post_comments_tr'></td></tr>").insertAfter($($("table")[0].childNodes[0].childNodes[2]));
            $(".mark_all_read").clone().appendTo($("#post_comments_tr"));

            $($("table")[2].nextSibling.nextSibling).replaceWith("<div id='expand_collapse_top'>"+
                    "<span id='collapse_all' class='clickable' title='collapse all comments'>--</span>"+
                    "&nbsp;&nbsp;"+
                    "<span id='expand_all' class='clickable' title='expand all comments'>++</span>"+
                    "&nbsp;&nbsp;"+
                    "<span id='follow_span'><input type='checkbox' id='follow_item' title='Follow the comments for this item from the first page' />Follow comments</span>"+
                "</div>"
            );

            $('body').append("<div id='parent_div'><table><tr id='parent_tr'></tr></table></div>");
            $("<style></style>").appendTo(document.body);
            var sheet = document.styleSheets[document.styleSheets.length-1];

            $("tr.athing").has('span.age').each(function(i,tr) {
                try {
                    var indentation = $('td.ind img', tr)[0].width;
                    var comment_id = $('span.age a', tr)[0].href.match(/[0-9]+/)[0];
                    var node = $('> td', tr)[0];
                    comments_total++;
                    $(tr).data("comment_id", comment_id).addClass("comment_tr_"+comment_id);
                    $(node).data("comment_id", comment_id).addClass("comment_td_"+comment_id);

                    if (marked_read_comments[comment_id]) {
                        $(tr).addClass("read_comment_tr");
                        $(node).addClass("read_comment_td");
                    } else {
                        $(tr).addClass("unread_comment_tr");
                        $(node).addClass("unread_comment_td");
                        comments_unread++;
                    }

                    var depth = indentation/40;
                    if (depth > last_depth) {
                        parents.push(last_node);
                        first_child = true;
                    } else {
                        first_child = false;
                        if (depth < last_depth) {
                            for (var j=0;j<last_depth-depth;j++) parents.pop();
                        }
                    }

                    if (parents.length > 0) {
                        var parent = parents[parents.length-1];
                        $("<span"+(first_child ? " class='showparent_firstchild'" : "")+"> | <span class='showparent'>show parent</span></span>").
                            appendTo($(node).find('span.comhead').get(0)).
                            children(".showparent").
                            hover(
                                (function(p, n){ return function() {
                                    $("#parent_tr").append($(p).clone());
                                    $(n).css({position: "relative"}).append($("#parent_div").show());
                                }})(parent, node),
                                function() {
                                    $("#parent_tr").html("");
                                    $("#parent_div").hide();
                                }
                            );
                    }

                    for (var k=0;k<parents.length;k++) {
                        var pid = $(parents[k]).data("comment_id");
                        $(tr).addClass("descends_from_"+pid);
                        collapsible_parents[pid] = parents[k];
                    }
                    last_node = node;
                    last_depth = depth;
                } catch(e) { console.log(e); }
            });

            $(".mark_all_read").click(function(){
                $(".unread_comment_td").each(function(i,el) {
                    var sel = $(el);
                    var cid = sel.data("comment_id");
                    marked_read_comments[cid] = (new Date()).getTime();
                    sel.removeClass("unread_comment_td").addClass("read_comment_td");
                    $(".comment_tr_"+cid).removeClass("unread_comment_tr").addClass("read_comment_tr");
                });
                comments_unread = 0;
                if (followed_items[item_id]) {
                    followed_items[item_id].read_comments = comments_total;
                    saveStore('followed_items', followed_items);
                }
                saveStore('marked_read_comments', marked_read_comments);
                comments_counter.text("unread comments: 0/"+comments_total);
            });

            if (followed_items[item_id]) $("#follow_item").prop("checked", true);

            $("#follow_item").click(function(){
                if ($("#follow_item").prop("checked")) {
                    followed_items[item_id] = {
                        time: (new Date()).getTime(),
                        read_comments: comments_total - comments_unread
                    };
                } else {
                    delete followed_items[item_id];
                }
                saveStore('followed_items', followed_items);
            });

            if (hide_marked_comments) {
                $("#hide_read_items").prop("checked", true);
                hideMarkedComments(true);
            } else {
                hideMarkedComments(false);
            }

            function hideMarkedComments(val) {
                if (val) {
                    addCssRule(".read_comment_tr {display: none;}");
                    deleteCssRule(".showparent_firstchild");
                } else {
                    addCssRule(".showparent_firstchild {display: none;}");
                    deleteCssRule(".read_comment_tr");
                }
            }

            $("#hide_read_items").click(function() {
                hide_marked_comments = $("#hide_read_items").prop("checked");
                saveStore('hide_marked_comments', syncEnabled ? hide_marked_comments : (hide_marked_comments ? 'true' : 'false'));
                hideMarkedComments(hide_marked_comments);
            });

            comments_counter.text("unread comments: "+comments_unread+"/"+comments_total);

            for (var id in collapsible_parents) {
                var cp = $(collapsible_parents[id]);
                cp.addClass("collapsible_comment");
                $("<div class='comment_collapse' title='expand/collapse'>-</div>").appendTo(cp).click((function(id) { return function(){
                    setCollapsed(id, !$(".comment_tr_"+id).data("collapsed"));
                }; })(id));
            }

            $("#collapse_all").click(function(){
                $(".collapsible_comment").each(function(i,el){ setCollapsed($(el).data("comment_id"), true); });
            });

            $("#expand_all").click(function(){
                $(".collapsible_comment").each(function(i,el){ setCollapsed($(el).data("comment_id"), false); });
            });

            function setCollapsed(id, collapse) {
                var tr = $(".comment_tr_"+id);
                var td = $(".comment_td_"+id);
                if (collapse){
                    addCssRule(".descends_from_"+id+" {display: none;}");
                    tr.data("collapsed", true);
                    td.addClass("collapsible_collapsed").children(".comment_collapse").text("+");
                } else {
                    deleteCssRule(".descends_from_"+id);
                    tr.data("collapsed", false);
                    td.removeClass("collapsible_collapsed").children(".comment_collapse").text("-");
                }
            }

            function addCssRule(rule) { sheet.insertRule(rule, sheet.cssRules.length); }
            function deleteCssRule(selector) {
                for (var i=0; i<sheet.cssRules.length; i++) {
                    if (sheet.cssRules[i].selectorText == selector) { sheet.deleteRule(i); }
                }
            }
        }
    });
});
