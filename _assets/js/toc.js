// floating nav
$(function() {
    function setScrollPosition() {
        var body = $(document.body);
        var scrollTop = body.scrollTop() || $('html').scrollTop();
        body
            .toggleClass("scroll", scrollTop > 0)
            .toggleClass("scroll-page", scrollTop > 630);
    }

    $(window).scroll(setScrollPosition);
    setScrollPosition();
});

// article-toc
$(function() {
    // do not use affix if there is no vertical space for the whole TOC
    var windowHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
    var FOOTER_DISTANCE = 20;

    // .side-nav affix
    var componentNav = $(".side-nav");

    if (componentNav.outerHeight(true) > windowHeight) {
        componentNav.addClass("affix-top");
    } else {
        componentNav.affix({
            offset: {
                top: 0,
                bottom: function() {
                    var verticalPadding = componentNav.innerHeight() - componentNav.height();
                    var footerHeight = $('#footer').outerHeight(true);
                    return (this.bottom = footerHeight + verticalPadding + FOOTER_DISTANCE);
                }
            }
        });
    }

    // populate article TOC
    var articleToc = $('.article-toc');
    var toc = $("#toc")
    toc.empty();

    var headings = $("#content article > h2, #content article > h3")
    var empty = headings.length < 2;

    articleToc.toggleClass("empty", empty);

    if (empty) {
        return;
    }


    toc.parent().show();

    var HEADER_HEIGHT = 100;

    var lastId;

    headings.each(function() {
        if (!this.firstElementChild) {
            return;
        }

        $("<li><a></a></li>")
            .appendTo(toc)
            .find("a")
            .text(this.firstElementChild.textContent.trim())
            .attr("href", "#" + this.id )
            .addClass("anchor-" + this.tagName.toLowerCase())
    });

    var NAVBAR_HEIGHT = 70;

    $("body").scrollspy({ target: ".article-toc", offset: NAVBAR_HEIGHT });

    window.animateScrollTo = function(e) {
        e.preventDefault()

        var hash = this.hash;
        var offset = $(this.hash).offset() || { top: $(document.body).scrollTop() };

        $('html, body').animate({
            scrollTop: offset.top - NAVBAR_HEIGHT + 5
        }, 500, function(){
            if (history.pushState) {
                history.pushState(null, null, hash);
            } else {
                window.location.hash = hash;
            }
        })
    };

    // animated scroll
    // Exclude the app inside the div.theme-preview since it's not in an <iframe/>,
    // leading to unwanted scrollTop when clicking on links inside the app.
    $("body a[href^='#']:not(.theme-preview a, .components-tabstrip a)").on('click', window.animateScrollTo);

    // article-toc affix
    if (articleToc.outerHeight(true) > windowHeight) {
        articleToc.addClass("affix-top");
    } else {
        articleToc.affix({
            offset: {
                top: function() {
                    var offset = $("p.lead,h1+p").offset() || { top: 0 };
                    return (this.top = offset.top - NAVBAR_HEIGHT - 25);
                },
                bottom: function() {
                    var footerHeight = $('#footer').outerHeight(true);
                    // used in getting-started
                    var bgExtensionHeight = $(".article-cta").outerHeight(false);

                    return (this.bottom = footerHeight + bgExtensionHeight + FOOTER_DISTANCE);
                }
            }
        });
    }
});
