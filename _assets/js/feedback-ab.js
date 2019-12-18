$(document).ready(function () {
    var vote;

    var localStorageFeedbackKey = function() {
        return 'T_DOCUMENTATION_FEEDBACK_SUBMIT' + window.location.href;
    } ;

    var saveVote = function () {
        var currentVote = {
            date: new Date(),
            vote: vote,
            url: window.location.href
        };
        localStorage.setItem(localStorageFeedbackKey(), JSON.stringify(currentVote));
    };

    var getVote = function () {
        return localStorage.getItem(localStorageFeedbackKey());
    };

    var canVote = function () {
        var previousVote = getVote();
        if (previousVote) {
            var previousVoteData = JSON.parse(previousVote);
            if (previousVoteData.url === window.location.href) {
                // You can vote once per week for an article.
                return Math.abs(new Date() - new Date(previousVoteData.date)) / 1000 / 600 >= 168;
            }
        }

        return true;
    };

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
        $('.feedback-ab').html("<div class='side-title uppercase-clear'>Thank you for your feedback!</div>");
    };

    var getFeedbackData = function () {
        var otherFeedbackText = $('#feedback-other-text-input').val().trim();
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

    var toggleIcons = function (clickedButton) {
        $('svg.no-voted').show();
        $('svg.voted').hide();
        $(clickedButton).find('svg.voted').toggle();
        $(clickedButton).find('svg.no-voted').toggle();
    };

    $('.feedback-ab .feedback-ab-button').on('click', function (e) {
        if (!canVote()) {
            e.preventDefault();
            return;
        }

        toggleIcons(this);

        var moreContent = $('.feedback-ab .feedback-ab-more-content');
        if ($(this).hasClass('feedback-ab-no-button')) {
            moreContent.show();
            vote = false;
        } else {
            showMessage();
            moreContent.hide();
            vote = true;
        }

        saveVote();
    });

    $('.feedback-ab .feedback-ab-send-data-button').on('click', function () {
        var uuid = getCookieByName("uuid");

        if (!uuid) {
            uuid = generateUUID();
            document.cookie = "uuid=" + uuid + ";";
        }

        setCookieByName("submittingFeedback");

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

        setCookieByName("feedbackSubmitted", true);
        showMessage();
    });

    init = function () {
        if (!canVote()) {
            vote = JSON.parse(getVote()).vote;
            var voteAsString = vote ? 'yes' : 'no';
            $('.feedback-ab-' + voteAsString + '-button svg.no-voted').hide();
            $('.feedback-ab-' + voteAsString + '-button svg.voted').show();

            $('.feedabck-ab-send-buttons-container').hide();

            $('.feedback-ab-yes-button').attr("disabled", true);
            $('.feedback-ab-no-button').attr("disabled", true);
        }
    }();
});
