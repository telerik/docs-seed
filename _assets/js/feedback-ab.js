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
    
    var showMessage = function () {
        $('.feedback').html("<div class='side-title uppercase-clear'>Thank you for your feedback!</div>");
    };

    var getFeedbackData = function () {
        var otherFeedbackText = $('#feedback-other-text-input').val().trim();
        return {
            email: "",
            inaccurateContent: false,
            inaccurateOutdatedContentText: "",
            otherMoreInformation: false,
            otherMoreInformationText: "",
            textErrors: false,
            typosLinksElementsText: "",
            outdatedSample: false,
            inaccurateOutdatedCodeSamplesText: "",
            acceptFeedbackContact: false,
            otherFeedback: otherFeedbackText !== "",
            textFeedback: otherFeedbackText,
            yesNoFeedback: getCookieByName("yesNoFeedback") || "Not submitted",
            uuid: getCookieByName("uuid"),
            path: window.location.href,
            hasPreviousFeedback: getCookieByName("feedbackSubmitted") || "false",
            sheetId: $("#hidden-sheet-id").val()
        };
    };

    $('.feedback .feedback-vote-button').on('click', function (e) {
        var moreContent = $('.feedback-more-info');
        if ($(this).hasClass('feedback-no-button')) {
            moreContent.show();
            $('.feedback .feedback-question').hide();
        } else {
            showMessage();
            moreContent.hide();
        }
    });

    $('.feedback .feedback-send-data-button').on('click', function () {
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

        showMessage();
    });
});
