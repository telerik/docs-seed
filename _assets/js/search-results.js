var PAGE_FILTER = " more:pagemap:metatags-restype:";
var GCSE_ELEMENT_NAME = "google-search";
var GCSE_API_URL = "https://www.googleapis.com/customsearch/v1";
var searchTerms = "";
var searchItemsStorageKey = "searchItemsStorageKey";
var siteHasKbPortal, isKbPage;

var searchViewModel = kendo.observable({
    kb: false,
    documentation: false,
    api: false,
    label: "",
    filterValues: [],
    getFilter: function () {
        var filterExpression = '';
        for (var i = 0; i < this.filterValues.length; i++) {
            if (filterExpression !== '') {
                filterExpression += ',';
            }

            filterExpression += this.filterValues[i];
        }

        return filterExpression;
    },
    getFilterExpression: function() {
        var filter = this.getFilter();
        return filter !== '' ? PAGE_FILTER + filter : '';
    },
    updateLabel: function() {
        var label = "";
        this.filterValues = [];

        if ((this.kb && this.documentation && this.api) || (!this.kb && !this.documentation && !this.api)) {
            label = "Search all";
        } else {
            if (this.documentation) {
                label += "DOCS";
                this.filterValues.push('documentation');
            }

            if (this.kb) {
                label += (label ? " / " : "") + "KB";
                this.filterValues.push('kb');
            }

            if (this.api) {
                label += (label ? " / " : "") + "API";
                this.filterValues.push('api');
            }

            label = "Search in " + label;
        }

        this.set("label", label);
    },
    update: function () {
        this.updateLabel();
        localStorage.setItem(searchItemsStorageKey, JSON.stringify(this.filterValues));
        updateSearchLayout();
        
    },
    init: function () {
        var propertyNames = JSON.parse(localStorage.getItem(searchItemsStorageKey));
        if (!propertyNames) {
            propertyNames = [];

            if (isKbPage) {
                propertyNames.push('kb');
            } else {
                propertyNames.push('documentation', 'api');
                if (siteHasKbPortal === 'true') {
                    propertyNames.push('kb');
                }
            }

            localStorage.setItem(searchItemsStorageKey, JSON.stringify(propertyNames));
        }

        for (var i = 0; i < propertyNames.length; i++) {
            searchViewModel.set(propertyNames[i], true);
        }

        searchViewModel.updateLabel();
    }
});

function init() {
    var popup = $("#refine-search-popup").kendoPopup({
        anchor: $("#refine-search-container"),
        origin: "bottom right",
        position: "top right",
    }).data("kendoPopup");

    $("#refine-search-button").on("click", function () {
        popup.toggle();
    });

    searchViewModel.init();

    kendo.bind($(".search-input-container"), searchViewModel);
    kendo.bind($("#refine-search-popup"), searchViewModel);

    $(".custom-checkbox input[type='checkbox']").change(function () {
        searchViewModel.update();
    });

    attachToEvents();
    updateSearchLayout();
}

function search(input) {
    searchTerms = input.val();
    trackSearchQuery(searchViewModel.getFilterExpression(), searchTerms);
}

function closePopup() {
    var popup = $("#refine-search-popup").data("kendoPopup");
    popup.close();
}

function searchInternal(input) {
    closePopup();
    search(input);
}

function attachToEvents() {
    $('form input[name="q"]').keydown(function (e) {
        if (e.keyCode == 13) { // Enter
            var $this = $(this);
            searchInternal($this);
            $this.parents('form').submit();
            return false;
        }
    });

    $("div#results").on("click", "a", function (e) {
        trackSearchResult($(this).attr("href"));
    });
}

function trackSearchQuery(filter, query) {
    trackItem("docs-search-terms", filter, query);
}

function trackSearchResult(link) {
    trackItem("docs-search-results", searchTerms, link);
}

function updateSearchLayout() {
    $('#local-search').css('padding-right', $('#refine-search-button').outerWidth());
}

$(function () {
    init();

    function toKV(n) {
        n = n.split("=");
        this[n[0]] = n[1];
        return this;
    }

    var params = location.search.replace(/(^\?)/, '').split("&").map(toKV.bind({}))[0];
    searchTerms = decodeURIComponent(params.q ? params.q.replace(/\+/g,' ') : '');
    $("[name=q]").val(searchTerms);

    var ds = new kendo.data.DataSource({
        transport: {
            parameterMap: function (data) {
                return {
                    start: 1 + data.skip,
                    num: data.pageSize,
                    cx: gcsInstance,
                    key: gcsKey,
                    q: params.q + searchViewModel.getFilterExpression(),
                };
            },
            read: {
                url: GCSE_API_URL
            }
        },
        change: function () {
            var resultsPresent = this.data().length > 0;
            $("#search-container").toggle(resultsPresent);
            $("#no-results").toggle(!resultsPresent);

            setSideNavPosition();
        },
        serverPaging: true,
        pageSize: 10,
        schema: {
            type: "json",
            data: function (data) {
                if (parseInt(data.searchInformation.totalResults) === 0) {
                    return [];
                }

                return data.items.map(function (item) {
                    return {
                        title: item.htmlTitle,
                        url: item.link,
                        excerpt: item.htmlSnippet
                    };
                });
            },
            total: function (data) {
                return data.searchInformation.totalResults;
            }
        }
    });

    $("#results").kendoListView({
        dataSource: ds,
        template: $("#results-template").html(),
        dataBound: function () {
            window.scrollTo(0, 0);
            setSideNavPosition();
        }
    });

    $(".site-pager").kendoPager({
        dataSource: ds,
        buttonCount: 5,
        messages: {
            previous: "Previous",
            next: "Next",
            display: "",
            empty: ""
        }
    });

    $(".results-message").kendoPager({
        dataSource: ds,
        numeric: false,
        previousNext: false,
        messages: {
            display: "{0}-{1} of {2} results",
            empty: "Sorry, there were no results found. Maybe try a broader search."
        }
    });

    setSideNavPosition();
});
