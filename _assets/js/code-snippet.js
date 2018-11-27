const selectedLanguageKey = "Selected_TabStrip_Language_Key";
// Necessary for the offline docs.
const localStorageMock = {
    getItem: function() {
        return null;
    },
    setItem: function() {
    }
};

$(function () {
    $("pre").addClass("prettyprint");
    
    function getStorage() {
        return localStorage !== undefined ? localStorage : localStorageMock;
    }
    
    function saveLanguage(language) {
        getStorage().setItem(selectedLanguageKey, language);
    }

    /* START TabStrip logic */

    var selectedLanguage = getStorage().getItem(selectedLanguageKey);

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
            // console.log("Cannot find any languages")
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
        'C++' : 'cpp',
        'C' : 'c',
        'Objective-C' : 'm',
        'Java' : 'java'
    };
    
    $("pre").each(function (index) {
        var langExtension = codeSampleMapper[$(this).attr('lang')];
        $(this).addClass('lang-' + langExtension).addClass("prettyprint");
    });

    prettyPrint();

    /* END TabStrip logic */
});
