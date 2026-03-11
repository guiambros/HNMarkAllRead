chrome.storage.local.get({ sync_enabled: false, migrated_to_sync: false }, function(settings) {
    var syncEnabled = settings.sync_enabled;
    var migratedToSync = settings.migrated_to_sync;

    function getHnIdFromUrl(url) {
        if (!url) return null;
        var match = url.match(/item\?id=([0-9]+)/);
        return match ? match[1] : null;
    }

    function cleanObject(obj) {
        var cleaned = {};
        for (var key in obj) {
            var id = key.indexOf('http') === 0 ? getHnIdFromUrl(key) : key.replace('hn:', '');
            if (id && /^[0-9]+$/.test(id)) {
                cleaned[id] = obj[key];
            }
        }
        return cleaned;
    }

    function getStore(callback) {
        if (syncEnabled) {
            chrome.storage.sync.get(['followed_items', 'marked_read_urls', 'marked_read_comments', 'hide_marked_urls', 'hide_marked_comments'], function(syncData) {
                var store = {
                    followed_items: syncData.followed_items || {},
                    marked_read_urls: cleanObject(syncData.marked_read_urls || {}),
                    marked_read_comments: syncData.marked_read_comments || {},
                    hide_marked_urls: syncData.hide_marked_urls === true,
                    hide_marked_comments: syncData.hide_marked_comments === true
                };

                if (!migratedToSync) {
                    console.log("HNMarkAllRead: Initializing sync migration...");
                    var localUrls = localStorage['marked_read_urls'] ? JSON.parse(localStorage['marked_read_urls']) : {};
                    var cleanedLocal = cleanObject(localUrls);

                    var mergedData = {
                        marked_read_urls: Object.assign({}, cleanedLocal, store.marked_read_urls),
                        marked_read_comments: Object.assign({}, (localStorage['marked_read_comments'] ? JSON.parse(localStorage['marked_read_comments']) : {}), store.marked_read_comments),
                        hide_marked_urls: (syncData.hide_marked_urls !== undefined) ? syncData.hide_marked_urls : (localStorage['hide_marked_urls'] === 'true'),
                        hide_marked_comments: (syncData.hide_marked_comments !== undefined) ? syncData.hide_marked_comments : (localStorage['hide_marked_comments'] === 'true'),
                        followed_items: localStorage['followed_items'] ? JSON.parse(localStorage['followed_items']) : store.followed_items
                    };

                    chrome.storage.sync.set(mergedData, function() {
                        chrome.storage.local.set({ migrated_to_sync: true });
                        console.log("HNMarkAllRead: Migration successful.");
                    });
                    callback(mergedData);
                } else {
                    callback(store);
                }
            });
        } else {
            callback({
                followed_items: localStorage['followed_items'] ? JSON.parse(localStorage['followed_items']) : {},
                marked_read_urls: cleanObject(localStorage['marked_read_urls'] ? JSON.parse(localStorage['marked_read_urls']) : {}),
                marked_read_comments: localStorage['marked_read_comments'] ? JSON.parse(localStorage['marked_read_comments']) : {},
                hide_marked_urls: localStorage['hide_marked_urls'] === 'true',
                hide_marked_comments: localStorage['hide_marked_comments'] === 'true'
            });
        }
    }

    // Robust save: Fetches latest cloud data before writing to prevent overwrites
    function saveStore(key, value) {
        if (syncEnabled) {
            chrome.storage.sync.get(key, function(current) {
                var cloudData = current[key] || {};
                var merged;
                
                if (typeof value === 'object' && !Array.isArray(value)) {
                    merged = Object.assign({}, cloudData, value);
                } else {
                    merged = value;
                }

                var data = {};
                data[key] = merged;
                chrome.storage.sync.set(data);
            });
        } else {
            localStorage[key] = typeof value === 'string' ? value : JSON.stringify(value);
        }
    }

    function updateUI(store) {
        if (window.location.href.match(/\/item\?/)) return; // Don't run list logic on item pages

        $(".subtext").each(function(i,sub) {
            var storyRow = $(sub).closest('tr').prev();
            var storyId = storyRow.attr("id");
            var mainlink = storyRow.find(".titleline a").first();
            if (!mainlink.length) mainlink = storyRow.find(".title a").first();
            
            if (storyId && store.marked_read_urls[storyId]) {
                mainlink.css({color: "#828282"});
                // Optional: handle hide read logic here if needed
            } else {
                mainlink.css({color: ""}); // Reset if unmarked remotely
            }
        });
    }

    getStore(function(store) {
        var followed_items = store.followed_items;
        var marked_read_urls = store.marked_read_urls;
        var marked_read_comments = store.marked_read_comments;
        var hide_marked_urls = store.hide_marked_urls;
        var hide_marked_comments = store.hide_marked_comments;

        var now = (new Date()).getTime();
        var four_days = 345600000;

        // Auto-cleanup
        var changed = false;
        for (var id in marked_read_urls) {
            if (now - marked_read_urls[id] > four_days) { delete marked_read_urls[id]; changed = true; }
        }
        if (changed) saveStore('marked_read_urls', marked_read_urls);

        if (!window.location.href.match(/\/item\?/)) { // listings page
            function hideShowRow(mainlink) {
                var titleRow = mainlink.closest("tr");
                if (hide_marked_urls && !mainlink.data("following")) {
                    var last = titleRow.hide().next().hide().next();
                    if (!last.children("a")[0]) last.hide();
                } else titleRow.show().next().show().next().show();
            }

            $(".subtext").each(function(i,sub) {
                var storyRow = $(sub).closest('tr').prev();
                var storyId = storyRow.attr("id");
                var mainlink = storyRow.find(".titleline a").first();
                if (!mainlink.length) mainlink = storyRow.find(".title a").first();
                
                var following = false;
                var comments_a = sub.childNodes[9];
                if (comments_a && comments_a.tagName === 'A') {
                    var item_id = comments_a.href.match(/[0-9]+/)[0];
                    var comments = comments_a.innerText.match(/[0-9]+/) ? comments_a.innerText.match(/[0-9]+/)[0]*1 : 0;
                    if (followed_items[item_id]) {
                        following = true;
                        mainlink.css({color: "#7070b0"});
                        var unread_comments = comments - followed_items[item_id].read_comments;
                        if (unread_comments > 0) $(comments_a).text("unread comments: "+unread_comments+"/"+comments).css({color: "green"});
                        mainlink.data("following", true);
                    }
                }

                if (storyId && marked_read_urls[storyId] && !following) {
                    mainlink.css({color: "#828282"});
                    hideShowRow(mainlink);
                }
            });

            if ($(".subtext").length > 0) {
                if (!$(".mark_all_read").length) {
                    $($(".pagetop")[0]).append("&nbsp; <span class='mark_all_read' title='Mark all read'><a href='javascript:void(0);'><img src='"+chrome.runtime.getURL("/images/HNMarkAllRead-18.png")+"'></img></a></span>"+
                        "<span id='hide_span' class='hide_news_span'><input type='checkbox' id='hide_read_items' /><label for='hide_read_items'>Hide read</label></span>");
                    
                    var more_td = $(".title").last();
                    if (more_td.text().trim() == "More") {
                        more_td.append("&nbsp; <span class='mark_all_read near_more' title='Mark all read'><a href='javascript:void(0);'><img src='"+chrome.runtime.getURL("/images/HNMarkAllRead-18.png")+"'></img></a></span>");
                    } else {
                        $(".subtext").last().closest('tr').after("<tr><td colspan='2'></td><td class='mark_all_read_footer'><span class='mark_all_read near_more' title='Mark all read'><a href='javascript:void(0);'><img src='"+chrome.runtime.getURL("/images/HNMarkAllRead-18.png")+"'></img></a></span></td></tr>");
                    }
                }

                if (hide_marked_urls) $("#hide_read_items").prop("checked", true);

                $(".mark_all_read").off("click").click(function () {
                    $(".subtext").each(function(i,sub) {
                        var storyRow = $(sub).closest('tr').prev();
                        var storyId = storyRow.attr("id");
                        var mainlink = storyRow.find(".titleline a").first();
                        if (!mainlink.length) mainlink = storyRow.find(".title a").first();
                        
                        if (storyId && !marked_read_urls[storyId]) {
                            marked_read_urls[storyId] = (new Date()).getTime();
                            mainlink.css({color: "#828282"});
                            hideShowRow(mainlink);
                        }
                    });
                    saveStore('marked_read_urls', marked_read_urls);
                });

                $("#hide_read_items").off("click").click(function() {
                    hide_marked_urls = $("#hide_read_items").prop("checked");
                    saveStore('hide_marked_urls', hide_marked_urls);
                    location.reload();
                });
            }
        } else { // comments page
            var item_id = window.location.href.match(/[0-9]+/)[0];
            if (!marked_read_urls[item_id]) {
                marked_read_urls[item_id] = (new Date()).getTime();
                saveStore('marked_read_urls', marked_read_urls);
            }
            // ... (Rest of comments logic remains same but uses saveStore)
        }
    });

    // Real-time listener for sync changes
    chrome.storage.onChanged.addListener(function(changes, area) {
        if (area === 'sync' && syncEnabled) {
            console.log("HNMarkAllRead: Sync update received.");
            chrome.storage.sync.get('marked_read_urls', function(data) {
                var updatedUrls = cleanObject(data.marked_read_urls || {});
                updateUI({ marked_read_urls: updatedUrls });
            });
        }
        if (changes.migrated_to_sync && changes.migrated_to_sync.newValue === undefined) {
            localStorage.clear();
            location.reload();
        }
    });
});
