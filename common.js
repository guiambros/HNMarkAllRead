var FOUR_DAYS_MS = 345600000;
var followed_items;
var followed_items_updated = false;
var PERF_ENABLED = localStorage["hnmar_perf"] == 'true';

function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
}

function qs(selector, root) {
    return (root || document).querySelector(selector);
}

function closest(el, selector) {
    if (!el) return null;
    if (el.closest) return el.closest(selector);

    var node = el;
    while (node) {
        if (node.matches && node.matches(selector)) return node;
        node = node.parentElement;
    }

    return null;
}

function show(el) {
    if (el) el.style.display = "";
}

function hide(el) {
    if (el) el.style.display = "none";
}

if (localStorage['followed_items']) {
    // cleanup
    followed_items = JSON.parse(localStorage['followed_items']);
    var now = (new Date()).getTime();

    // delete items older than 4 days
    for (var item_id in followed_items) {
        if (now - followed_items[item_id].time > FOUR_DAYS_MS) {
            delete followed_items[item_id];
            followed_items_updated = true;
        }
    }
} else {
    followed_items = {};
    followed_items_updated = true;
}

if (followed_items_updated) {
    localStorage['followed_items'] = JSON.stringify(followed_items);
}

function perfStart(label) {
    if (!PERF_ENABLED || !window.performance || !performance.now) return null;

    return {
        label: label,
        started_at: performance.now()
    };
}

function perfEnd(timer, details) {
    if (!timer) return;

    var duration = performance.now() - timer.started_at;
    var message = "[HNMarkAllRead] " + timer.label + " " + duration.toFixed(2) + "ms";

    if (details) message += " | " + details;

    console.info(message);
}
