const feedbackProps = {
    feedbackFixedClassName: 'feedback-fixed',
    feedbackDisabledClassName: 'vote-disabled',
    feedbackFormSelector: '.feedback-row',
    feedbackMoreInfoSelector: '.feedback-more-info',
    isVoting: false,
    isClosed: false
};

$(document).ready(function () {

    const localStorageFeedbackKey = function () {
        return 'T_DOCUMENTATION_FEEDBACK_SUBMIT' + window.location.href;
    };

    const getFeedbackInfo = function () {
        return localStorage.getItem(localStorageFeedbackKey());
    };

    const setFeedbackInfo = function (vote, closed) {
        let feedbackInfo = getFeedbackInfo();

        if (feedbackInfo) {
            const currentFeedbackInfo = JSON.parse(feedbackInfo);
            if (!vote) {
                vote = currentFeedbackInfo.vote;
            }
            if (closed === undefined || closed === null) {
                closed = currentFeedbackInfo.closed;
            }

        }

        feedbackInfo = {
            date: new Date(),
            vote: vote,
            closed: closed,
            url: window.location.href
        };

        localStorage.setItem(localStorageFeedbackKey(), JSON.stringify(feedbackInfo));
    };

    const canVote = () => {
        const previousVote = getFeedbackInfo();
        if (previousVote) {
            const previousVoteData = JSON.parse(previousVote);
            if (previousVoteData.url === window.location.href) {
                // You can vote once per week for an article.
                return Math.abs(new Date() - new Date(previousVoteData.date)) / 1000 / 60 / 60 >= 168;
            }
        }

        return true;
    };

    const getCookieByName = function (name) {
        var match = document.cookie.match(new RegExp(name + '=([^;]+)'));
        if (match) return match[1];
    };

    const onAfterVote = function () {
        setTimeout(() => {
            $('.feedback').html("<div class='side-title uppercase-clear'>Thank you for your feedback!</div>");
        }, 200);
        
        setTimeout(() => {
            $(feedbackProps.feedbackFormSelector).removeClass(feedbackProps.feedbackFixedClassName);
            $(feedbackProps.feedbackFormSelector).addClass('vote-hide');
        }, 2000)
    };

    const getFeedbackData = function () {
        const otherFeedbackText = $('#feedback-other-text-input').val().trim();
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
        const moreContent = $(feedbackProps.feedbackMoreInfoSelector);
        let vote = '';
        if ($(this).hasClass('feedback-no-button')) {
            moreContent.show();
            moreContent.addClass('show');
            $('.feedback .feedback-question').hide();
            vote = 'no';
        } else {
            onAfterVote();
            moreContent.hide();
            vote = 'yes';
        }

        setFeedbackInfo(vote);
    });

    $('.feedback .feedback-send-data-button').on('click', function () {
        $(feedbackProps.feedbackMoreInfoSelector).addClass('hide');
       
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

    $('.close-button-container').on('click', function () {
        feedbackProps.isClosed = true;
        toggleFeedbackSticky(false);
        setFeedbackInfo(null, feedbackProps.isClosed)
    });

    const hasVoted = () => {
        let feedbackInfo = getFeedbackInfo();
        if (feedbackInfo) {
            const vote = JSON.parse(feedbackInfo).vote;
            return vote && (vote.toLowerCase() === 'yes' || vote.toLowerCase() === 'no');
        }

        return false;
    }

    const hasClosed = () => {
        let feedbackInfo = getFeedbackInfo();
        if (feedbackInfo) {
            return JSON.parse(feedbackInfo).closed;
        }

        return false;
    }

    const shouldRunFeedbackTimer = () => {
        return !(hasVoted() || hasClosed());
    }

    const getElementTopOffset = (selector) => {
        return $(selector)[0].getBoundingClientRect().top;
    }

    const isFeedbackBarInViewPort = () => {
        return getElementTopOffset(feedbackProps.feedbackFormSelector) < window.innerHeight;
    }

    const shouldShowFeedbackPopup = () => {
        return !feedbackProps.isVoting && !isFeedbackBarInViewPort();
    }

    const toggleFeedbackSticky = (isSticky) => {
        if (isSticky) {
            $(feedbackProps.feedbackFormSelector).addClass(feedbackProps.feedbackFixedClassName);
        } else {
            $(feedbackProps.feedbackFormSelector).removeClass(feedbackProps.feedbackFixedClassName);
        }

        feedbackProps.isSticky = isSticky;
    }

    const onWindowScrollOrResize = () => {
        if (!feedbackProps.isClosed) {
            const $window = $(window);
            const scrollOffset = $window.height() + $window.scrollTop();
            const footerHeight = $(feedbackProps.feedbackFormSelector).outerHeight() + $('#footer').outerHeight();
            const feedbackOffsetTop = document.body.scrollHeight - footerHeight;

            // Double the feedback form height in order to have sticky scroll when it is scrolled down to footer
            toggleFeedbackSticky(scrollOffset - $(feedbackProps.feedbackFormSelector).outerHeight() * 2 < feedbackOffsetTop);
        }
        else {
            window.removeEventListener('scroll', onWindowScrollOrResize);
            window.removeEventListener('resize', onWindowScrollOrResize);
        }
    }

    const init = () => {
        if (!canVote()) {
            $(feedbackProps.feedbackFormSelector).addClass(feedbackProps.feedbackDisabledClassName);
        }
        else {
            if (shouldRunFeedbackTimer()) {
                setTimeout(() => {
                    if (shouldShowFeedbackPopup()) {
                        $(feedbackProps.feedbackFormSelector).addClass(feedbackProps.feedbackFixedClassName);

                        window.addEventListener('scroll', onWindowScrollOrResize);
                        window.addEventListener('resize', onWindowScrollOrResize);
                    }
                }, 30000) // 30 sec
            }
        }
    };

    init();
});
