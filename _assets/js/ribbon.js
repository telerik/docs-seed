var ribbon = $('.SiteRibbon');
var x = $(".SiteRibbon-x");
var createCookie = function(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toGMTString();
    }
    else { expires = ""; }
    document.cookie = name + "=" + value + expires + "; path=/";
};
var readCookie = function(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
};
var cookieName = 'ribbonClosed-' + btoa(encodeURI($('.SiteRibbon-text').text().replace(/\s+/g, ""))).replace(/\=|\//g, "").slice(0, 30);
var hasCookie = readCookie(cookieName);

if (!hasCookie) {
    ribbon.removeClass('is-hidden');
    x.on("click", function() {
        ribbon.slideUp();
        createCookie(cookieName, true, 1);
    });
}