function scrollNodeIntoView(li) {
    var top = li.offset().top;
    var bottom = top + li.find(">div").outerHeight();

    var container = $(".side-nav")[0];
    var containerTop = container.scrollTop;
    var containerHeight = container.clientHeight + parseInt(container.style.bottom, 10);

    if (top < containerTop || bottom > containerHeight + containerTop) {
        container.scrollTop = top - containerHeight / 2;
    }
}

function expandNavigation(url) {
    return function expand(e) {
        if (e.node) {
            return;
        }

        var segments = url.split("/");
        var treeview = this;

        var dataSource = this.dataSource;
        var node;

        var isInNavigation = true;
        for (var i = 0; i < segments.length; i++) {
            node = dataSource.get(segments[i]);
            if (!node) {
                isInNavigation = false;
                break;
            }
            node.set("expanded", true);
            dataSource = node.children;
        }

        if (isInNavigation) {
            var li = this.element.find("li[data-uid='" + node.uid + "']");
            scrollNodeIntoView(li);
            this.select(li);

            $('.side-nav > #page-tree > .k-group > .k-item > div > span.k-i-collapse').closest('li').addClass('expanded');

            this.unbind("dataBound", expand);
        }
    };
}

function navigationTemplate(root) {
    return function (data) {
        var item = data.item;
        var text = item.text;

        if (item.hasChildren) {
            return text;
        }

        var url = item.path;

        if (location.pathname.indexOf(".html") < 0) {
            url = url.replace(".html", "");
        }

        if (url.indexOf("#") < 0) {
            while (item = item.parentNode()) {
                url = item.path + "/" + url;
            }
            return '<a href="' + root + url + '">' + text + "</a>";
        } else {
            return '<a href="' + url + '">' + text + "</a>";
        }
    };
}

function preventParentSelection(e) {
    var node = this.dataItem(e.node);

    if (node.path.indexOf("#") < 0 && node.hasChildren) {
        e.preventDefault();
        this.toggle(e.node);
    }
}

function setSideNavPosition() {
    var $window = $(window);
    var windowHeight = $window.height();
    var scrollFold = $window.scrollTop() + windowHeight;

    var top = Math.min($('.navbar').height(), $('aside.TK-Hat').height());
    var footerHeight = $('div#footer').outerHeight(true);
    var feedbackOffsetTop = document.body.scrollHeight - footerHeight;
    var bottom = Math.max(0, Math.min(footerHeight, scrollFold - feedbackOffsetTop));

    if (window.screen.availWidth < 768) {
        bottom = 0;
        if (!$('body.scroll').length) {
            top = HEADER_HEIGHT;
        }
    }

    var sideNavigation = $(".side-nav");
    sideNavigation.css('top', top);
    sideNavigation.css('bottom', bottom);
}

$(function () {
    $(window).scroll(setSideNavPosition)
        .resize(setSideNavPosition);
    setSideNavPosition();
});
