function scrollNodeIntoView(li) {
    var container = $(".side-nav")[0];
    var top = li[0].offsetTop;
    var bottom = top + li.find(">div").outerHeight();

    var containerTop = container.scrollTop;
    var containerHeight = container.clientHeight;

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

        for (var idx = 0; idx < segments.length; idx++) {
            node = dataSource.get(segments[idx]);
            node.set("expanded", true);
            dataSource = node.children;
        }

        var li = this.element.find("li[data-uid='" + node.uid + "']");
        scrollNodeIntoView(li);
        this.select(li);

        $('.side-nav > #page-tree > .k-group > .k-item > div > span.k-i-collapse').closest('li').addClass('expanded');

        this.unbind("dataBound", expand);
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

$(function () {
    var $window = $(window);
    var windowHeight = $window.height();

    function setSideNavPosition() {
        var scrollFold = $window.scrollTop() + windowHeight;

        var sideNavigation = $(".side-nav");
        var top= $('aside.TK-Hat').height();
         
        var bottom = 0;
        var footerHeight = $('#footer').outerHeight(true) + $('.feedback-row').outerHeight(true);
        var feedbackOffsetTop = document.body.scrollHeight - footerHeight;

        if (!window.matchMedia('(max-width: 1200px)').matches) {
            bottom = Math.min(footerHeight, scrollFold - feedbackOffsetTop);
        }

        sideNavigation.css('top', top);
        sideNavigation.css('bottom', bottom);
    }

    $window.scroll(setSideNavPosition);
    setSideNavPosition();
});
