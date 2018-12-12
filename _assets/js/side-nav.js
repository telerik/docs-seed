var supportSelfLinkTreeNode = false;

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
            var li;
            var t = [];
            if (supportSelfLinkTreeNode && getDataPath(this.dataSource._pristineData, url, t)) {
                for (var currentNode, a = (t[t.length - 1], this.dataSource), index = 0; index < t.length; index++) {
                    currentNode = a.get(t[index]);
                    currentNode.set("expanded", !0);
                    a = currentNode.children;
                }
                node.set("selected", !0);

                li = this.element.find("li[data-uid='" + node.uid + "']");
                li.addClass("current-topic");

                var firstChild = $(".current-topic>ul>li:first-child");
                scrollNodeIntoView(li);
                this.select(li);

                if (location.pathname.indexOf("/api/") < 0) {
                    $("h2").each(function () {
                        li.addClass("current-topic");
                        var hash = $(this).find("a").attr("href");

                        if (typeof hash !== 'undefined' && hash !== null) {
                            var state = $(".k-state-selected");
                            if (state.length > 1) {
                                $(".k-state-selected").first().removeClass("k-state-selected");
                            }

                            var newChild = {
                                path: getBaseUri($(this)) + hash,
                                text: kendo.htmlEncode($(this).text())
                            };
                            var h2Node = (typeof firstChild[0] !== 'undefined' && firstChild[0] !== null) ?
                                treeview.insertBefore(newChild, firstChild) :
                                treeview.append(newChild, li);

                            h2Node.addClass("section");

                            if (location.hash.replace("#", "") === hash.replace("#", "")) {
                                selectNode(hash);
                            }

                            $(this).nextUntil("h2", "h3").each(function () {
                                var hash = $(this).find("a").attr("href");
                                if (typeof hash !== 'undefined' && hash !== null) {
                                    var h3Node = treeview.append({ path: getBaseUri($(this)) + hash, text: kendo.htmlEncode($(this).text()) }, h2Node);
                                    h3Node.addClass("section");

                                    if (location.hash.replace("#", "") === hash.replace("#", "")) {
                                        selectNode(hash);
                                        $("h1").css("font-weight", "bold");
                                    }
                                }
                            });
                        }
                    });
                }
            } else {
                li = this.element.find("li[data-uid='" + node.uid + "']");

                scrollNodeIntoView(li);
                this.select(li);

                $('.side-nav > #page-tree > .k-group > .k-item > div > span.k-i-collapse').closest('li').addClass('expanded');
            }

            this.unbind("dataBound", expand);
        }
    };
}

function getBaseUri(element) {
    var baseUri = element[0].baseURI;
    var start = baseUri.lastIndexOf("/") + 1;
    var end = baseUri.indexOf("#") > -1 ? baseUri.indexOf("#") : baseUri.length;

    return baseUri.substring(start, end);
}

function getDataPath(items, path, resultArray, undefined) {
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (item.path == path) {
            resultArray.push(path);
            return true;
        }
        if (item.items && getDataPath(item.items, path, resultArray, undefined)) {
            resultArray.unshift(item.path);
            return true;
        }
    }
    return false;
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

    $(document).ready(function () {
        setSideNavPosition();
    });
});


