$(document).ready(function () {

    $(".read-prev").hover(function () {
        $(".title-prev").show();
    }, function () {
        $(".title-prev").hide();
    });

    $(".read-next").hover(function () {
        $(".title-next").show();
    }, function () {
        $(".title-next").hide();
    });

    $(".all-components").click(function () {
        ensureNavigationLoaded();

        var showComponentsClassName = 'show-components';
        $(".all-components").toggleClass(showComponentsClassName);

        var sideNav = $('.side-nav');
        sideNav.toggleClass(showComponentsClassName);
        if (sideNav.hasClass(showComponentsClassName)) {
            scrollNodeIntoView($('#page-tree').data('kendoTreeView').select());
        }
    });

    $(".api-index").toggleClass(function () {
        return $.grep(
            $(this).find("ul"),
            function (ul) { return $(ul).children().length > 20; }
        ).length > 0 ? "api-columns" : "";
    });

    $(".api-columns > div").addClass("components pb-20 mb-20");

    $(".all-components").click(function () {
        var showComponentsClassName = 'show-components';
        $(".all-components").toggleClass(showComponentsClassName);

        var sideNav = $('.side-nav');
        sideNav.toggleClass(showComponentsClassName);
        if (sideNav.hasClass(showComponentsClassName)) {
            scrollNodeIntoView($('#page-tree').data('kendoTreeView').select());
        }
    });

    $(".api-index").toggleClass(function () {
        return $.grep(
            $(this).find("ul"),
            function (ul) { return $(ul).children().length > 20; }
        ).length > 0 ? "api-columns" : "";
    });

    $(".api-columns > div").addClass("components pb-20 mb-20");

    $(".read-prev").hover(function () {
        $(".title-prev").show();
    }, function () {
        $(".title-prev").hide();
    });
    $(".read-next").hover(function () {
        $(".title-next").show();
    }, function () {
        $(".title-next").hide();
    });
})
