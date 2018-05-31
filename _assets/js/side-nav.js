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

        if (location.pathname.indexOf("/api/") < 0) {
            li.addClass("current-topic");
        }

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
