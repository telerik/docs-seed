$(function() {
    function toKV(n) {
        n = n.split("=");
        this[n[0]] = n[1];
        return this;
    }

    var params = location.search.replace(/(^\?)/,'').split("&").map(toKV.bind({}))[0];

    $("[name=q]").val(params.q);

    var ds = new kendo.data.DataSource({
        transport: {
            parameterMap: function(data) {
                return {
                    num: data.pageSize,
                    start: data.skip,
                    site: gsaCollection,
                    q: params.q,
                    filter: 0
                }
            },
            read: {
                url: window.searchApplianceUrl // ?q=test&site=documentation_progress_openedge&num=130
            }
        },
        change: function() {
            var resultsPresent = this.data().length > 0;
            $("#search-container").toggle(resultsPresent)
            $("#no-results").toggle(!resultsPresent)
        },
        serverPaging: true,
        pageSize: 10,
        schema: {
            type: "xml",
            data: function(data) {
                var results = (data.GSP.RES && data.GSP.RES.R) || [];

                if (!$.isArray(results)) {
                    results = [results];
                }

                return results.map(function(item) {
                    return {
                        title: item.T["#text"],
                        url: item.U["#text"],
                        excerpt: item.S["#text"]
                    }
                });
            },
            total: "/GSP/RES/M/text()"
        }
    })

    $("#results").kendoListView({
        dataSource: ds,
        template: $("#results-template").html(),
        dataBound: function() {
            window.scrollTo(0, 0)
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
});
