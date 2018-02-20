var apiURL = '/account/api/v1/users/current/logged';
var xhr = new XMLHttpRequest();

$(function() {
    $('body').css('opacity', 0);
    xhr.open('GET', apiURL);
    xhr.onload = function() {
        if (xhr.status === 200 && xhr.response.indexOf('true') >= 0) {
            // The user is logged in so we don't have to do anything.
            // Show the page content
            $('body').css('opacity', 1);
        } else {
            //The user is not logged in so we redirect him/her.
            window.location.href = loginURL;
        }
    };
    xhr.send();
});
