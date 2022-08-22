$(document).ready(function () {
    var banner = $("#announcement-banner");
    var fallbackContent = $("#announcement-fallback").html();
    var content = $("#announcement-content");
    var button = $("#announcement-banner .close-button-container");
    var url = content.data("url");
    var storageKey = "T_DOCUMENTATION_announcement".toUpperCase();

    // detect any user interaction
    $("body").one("mousemove scroll touchstart", onUserInteraction);

    function onUserInteraction () {
        fetchAnnouncement();
    }

    function fetchAnnouncement () {
        $.get(url).done(onSuccess).fail(onFail);
    }

    function onSuccess (data) {
        tryRenderAnnouncement(data);
    }

    function onFail () {
        if (fallbackContent) {
            tryRenderAnnouncement(fallbackContent);
        }
    }

    function tryRenderAnnouncement (html) {
        if (!checkStorage(hash($(html).text()))) {
            content.append(html);
            banner.show();
        }
    }

    function checkStorage (hash) {
        var item = localStorage.getItem(storageKey);

        return hash === item;
    }

    function saveStorage (hash) {
        localStorage.setItem(storageKey, hash);
    }

    function hash (content) {return  "announcement-" + content.trim().split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0) };
});


