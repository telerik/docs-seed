const selectedLanguageKey = "Selected_TabStrip_Language_Key";

function saveLanguage(language) {
    localStorage.setItem(selectedLanguageKey, language);
}

$(function () {
    $("pre").addClass("prettyprint");

    prettyPrint();

    /* START TabStrip logic */

    var selectedLanguage = localStorage.getItem(selectedLanguageKey);

    var onTabActivated = function (e) {
        var language = e.item.innerText;
        if (selectedLanguage !== language) {
            saveLanguage(language);
        }
    };

    $("div.tabbedCode").each(function () {
        var container = $(this);
        var langs = container.find("pre");
        if (langs.length === 0) {
            //console.log("Cannot find any languages")
            return;
        }

        var tabs = $.map(langs, function (item) {
            return $("<li>").text($(item).attr("lang"));
        });

        var hasActive = false;
        if (!selectedLanguage) {
            saveLanguage(tabs[0].innerText);
        } else {
            $(tabs).each(function (index) {
                if ($(this).text() === selectedLanguage) {
                    $(this).addClass('k-state-active');
                    hasActive = true;
                }
            });
        }

        if (!hasActive) {
            tabs[0].addClass("k-state-active");
        }

        var tabstrip = $("<div>")
            .append($("<ul>").append(tabs))
            .append(langs);

        container.replaceWith(tabstrip);
        langs.wrap("<div>");
        tabstrip.kendoTabStrip(
            {
                animation: false,
                activate: onTabActivated
            });
    });

    var codeSampleMapper = {
        'C#': 'cs',
        'VB.NET': 'vb',
        'VB': 'vb',
        'JavaScript': 'js',
        'ASPNET': 'html',
        'XML': 'xml',
        'TypeScript': 'commonjs',
    }

    $("pre").each(function (index) {
        var langExtension = codeSampleMapper[$(this).attr('lang')];
        $(this).addClass('lang-' + langExtension).addClass("prettyprint");
    });

    /* END TabStrip logic */
});
