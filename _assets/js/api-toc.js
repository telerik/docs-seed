//= require jquery.min

$(function () {
    window.animateScrollTo = function (e) {
        e.preventDefault();

        var hash = this.hash;
        var offset = $(this.hash).offset() || { top: $(document.body).scrollTop() };

        $('html, body').animate({
            scrollTop: offset.top - NAVBAR_HEIGHT + 5
        }, 500, function () {
            if (history.pushState) {
                history.pushState(null, null, hash);
            } else {
                window.location.hash = hash;
            }
        });
    };

    $("#markdown-toc")
        .on("click", "a", function () {
            $(".section > ul").hide();
        })
        .each(function () {
            var ul = $("<ul>");
            $("article.api-reference h2").each(function () {
                var h2 = $(this);

                if (!/fields|configuration|properties|events|class methods|constructor parameters|methods/i.test(h2.text())) {
                    return;
                }

                $("<li>")
                    .addClass("section")
                    .append(h2.children().clone())
                    .appendTo(ul)
                    .mouseenter(function () {
                        var children = $(this).children("ul");

                        if (!children.length) {
                            children = $("<ul>");

                            h2.nextUntil("h2").filter("h3").each(function () {
                                $("<li>").append($(this).children().clone()).appendTo(children);
                            });

                            if (children.children().length) {
                                children.appendTo(this);
                            }

                            $(children).find("a[href^='#']").on('click', window.animateScrollTo);
                        }

                        children.show();
                    })
                    .mouseleave(function () {
                        $(this).children("ul").hide();
                    });
            });

            ul.appendTo(this);
        });
});
