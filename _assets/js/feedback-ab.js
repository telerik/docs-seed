$(document).ready(function () {
    var generateUUID = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    var setCookieByName = function (name, value) {
        document.cookie = name + "=" + value + ";";
    };

    var getCookieByName = function (name) {
        var match = document.cookie.match(new RegExp(name + '=([^;]+)'));
        if (match) return match[1];
    };

    var onAfterVote = function () {
        $('.feedback-ab').html("<div class='side-title uppercase-clear'>Thank you!</div>");
    };

    var getFeedbackData = function () {
        setCookieByName("submittingFeedback");

        var otherFeedbackText = $('#feedback-other-text-input').text().trim();
        return {
            otherFeedback: otherFeedbackText !== "",
            textFeedback: otherFeedbackText,
            yesNoFeedback: getCookieByName("yesNoFeedback") || "Not submitted",
            uuid: getCookieByName("uuid"),
            path: window.location.href,
            hasPreviousFeedback: getCookieByName("feedbackSubmitted") || "false",
            sheetId: $("#hidden-sheet-id").val()
        };
    };

    $('.feedback-ab .feedback-ab-button').on('click', function () {
        $('.feedback-ab .feedback-ab-more-content').toggle();
    });

    $('.feedback-ab .feedback-ab-send-data-button').on('click', function () {
        $.ajax({
            url: "https://baas.kinvey.com/rpc/kid_Hk57KwIFf/custom/saveFeedback",
            method: "POST",
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(getFeedbackData()),
            crossDomain: true,
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", "Basic " + btoa("feedback:feedback"));
            }
        });

        onAfterVote();
    });
});
