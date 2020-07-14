//= require kendo
//= require search-base

function initPopup(open) {
    var popup = $("#refine-search-popup").kendoPopup({
        anchor: $("#refine-search-container"),
        origin: "bottom right",
        position: "top right",
    }).data("kendoPopup");

    $("#refine-search-button").on("click", function () {
        popup.toggle();
    });

    kendo.bind($("#refine-search-popup"), searchViewModel);

    updateSearchLayout();

    if (open) {
        popup.open();
    }
}

function search(input) {
    searchTerms = input.val();
    trackSearchQuery(searchTerms);
}

function trackSearchQuery(query) {
    trackItem(getSearchCategory(), prd, query);
}

function getSearchCategory() { }

function searchInternal(input) {
    closePopup();
    search(input);
}

function closePopup() {
    var popup = $("#refine-search-popup").data("kendoPopup");
    popup.close();
}

function updateSearchLayout() {
    $('#local-search').css('padding-right', $('#refine-search-button').outerWidth());
}

function getDataSource() { }

$(function () {
    initPopup(true);
});
