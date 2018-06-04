$(function () {
    var additionalContentElement = $('.additional-content-column');
    if (additionalContentElement.outerHeight(true) > windowHeight) {
        additionalContentElement.addClass("affix-top");
    } else {
        additionalContentElement.affix({
            offset: {
                top: function () {
                    var offset = $("p.lead,h1+p").offset() || { top: 0 };
                    return (this.top = offset.top - NAVBAR_HEIGHT - 25);
                },
                bottom: function () {
                    return (this.bottom = $('#footer').outerHeight(true) + FOOTER_DISTANCE);
                }
            }
        });
    }
});
