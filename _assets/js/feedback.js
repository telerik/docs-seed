window.initFeedbackForm = function (options) {
    var sheetIds = {
      angular: "1nh7t7gAThgrMcBUN7WYPfMmk72NFYjb-A90n4J7AazE",
      react: "d50298ea-45d1-492c-b08f-50daef313311",
      vue: "95a5cfba-ca2a-4db5-8392-3e70b2445986"
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
  
    var container = options.container;
    var dialog = options.dialog;
    var formIsProcessing = false;
  
    var defaultFormValues = {
      email: "",
      inaccurateContent: false,
      inaccurateOutdatedContentText: "",
      otherMoreInformation: false,
      otherMoreInformationText: "",
      textErrors: false,
      typosLinksElementsText: "",
      outdatedSample: false,
      inaccurateOutdatedCodeSamplesText: "",
      otherFeedback: false,
      textFeedback: "",
      acceptFeedbackContact: false
    };
    var feedbackForm = $('#feedback-form');
    var formModel = kendo.observable(defaultFormValues);
  
    var isFormModelEmpty = function () {
      var isModelDefault = true;
      for (var key in defaultFormValues) {
        if (key === 'email') {
          continue;
        }
        var isValueEqual = formModel[key] === defaultFormValues[key];
        if (!isValueEqual) {
          isModelDefault = false;
          break;
        }
      }
      return isModelDefault;
    };
  
    var isFormModelSatisfied = function (key, formValue) {
      var value = formModel[key];
      if (value) {
        return formValue && formValue.length > 0;
      } else {
        return true;
      }
    }
  
    //Bind model to form
    kendo.bind($("div.feedback-dialog"), formModel);
    //Attach to form submit to adjust variables and send request
    var emptyFormValidator = $("#feedback-checkbox-area").kendoValidator({
      validateOnBlur: false,
      messages: {
        // defines a message for the custom validation rule
        emptyForm: "You need to provide some feedback before submitting the form."
      },
      rules: {
        emptyForm: function (input) {
          return !isFormModelEmpty();
        }
      }
  
    }).data("kendoValidator");
  
    var emailValidator = $("#feedback-email-input").kendoValidator({
      validateOnBlur: false,
      messages: {
        email: "Invalid email address."
      },
      rules: {
        email: function (input) {
          if (input.val().length > 0) {
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return re.test(input.val());
          }
          return true;
        }
      }
    }).data("kendoValidator");
  
    var textAreaValidator = function (selector, formModelKey) {
      return $(selector).kendoValidator({
        validateOnBlur: false,
        messages: {
          emptyValidation: "Please provide some additional information.",
          htmlValidation: "HTML tags are not allowed in this field.",
          messageLength: "The message length must not exceed 2500 characters.",
          whiteSpaces: "Using only white spaces is not allowed in this field.",
          feedbackValidation: "Please select a category and provide some additional information."
        },
        rules: {
          emptyValidation: function (input) {
            var text = input.val();
            return isFormModelSatisfied(formModelKey, text);
          },
          htmlValidation: function (input) {
            var text = input.val();
            var matches = text.match(/(<([^>]+)>)/ig);
            if (matches != null) {
              return false;
            }
            return true;
          },
          messageLength: function (input) {
            var text = input.val();
            if (text.length > 2500) {
              return false;
            }
            return true;
          },
          whiteSpaces: function (input) {
            var text = input.val();
            if (text.length > 0) {
              return $.trim(text) !== "";
            }
            return true;
          },
          feedbackValidation: function (input) {
            var text = input.val();
            if (text.length > 0) {
              return formModel[formModelKey];
            }
            return true;
          }
        }
      }).data("kendoValidator");
    };
  
  
    var canSubmitFeedback = function () {
      return textAreaValidator("#feedback-code-sample-text-input", "outdatedSample").validate() &&
        textAreaValidator("#feedback-more-information-text-input", "otherMoreInformation").validate() &&
        textAreaValidator("#feedback-text-errors-text-input", "textErrors").validate() &&
        textAreaValidator("#feedback-inaccurate-content-text-input", "inaccurateContent").validate() &&
        textAreaValidator("#feedback-other-text-input", "otherFeedback").validate() &&
        emptyFormValidator.validate() &&
        emailValidator.validate();
    };
  
    var vote = function() {
        setCookieByName("feedbackSubmitted", true);
        $(container).html("<div class='col-xs-12'><h4>Your feedback was saved. Thank you!</h4></div>");
    };
 
    var closeDialog = function() {
        $(dialog).hide()
        .find(".dialog").addClass("dialog-enter");
    };
 
    $(container)
      .on("click", "[data-value]", function (e) {
        e.preventDefault();
 
        var status = $(e.target).attr("data-value");
 
        if (status == "yes") {
          $(container).html("<div class='col-xs-12'><h4>Thank you for your feedback!</h4></div>");
        } else {
          $(dialog).show();
 
          kendo.animationFrame(function () {
            $(dialog).find(".dialog-enter").removeClass("dialog-enter");
          });
        }
      });
  
    $(dialog).on("click", options.closeButtons, function(e) {
        e.preventDefault();
        
        if ($(e.target).attr("type") == "submit") {
            if (formIsProcessing) {
                return;
            }

            formIsProcessing = true;
            var uuid = getCookieByName("uuid");
        
            if (!uuid) {
                uuid = generateUUID();
                document.cookie = "uuid=" + uuid + ";";
            }
        
            if (canSubmitFeedback()) {
                setCookieByName("submittingFeedback")
                formModel.yesNoFeedback = getCookieByName("yesNoFeedback") || "Not submitted";
                formModel.uuid = getCookieByName("uuid");
                formModel.path = window.location.href;
                formModel.hasPreviousFeedback = getCookieByName("feedbackSubmitted") || "false";
                formModel.sheetId = $("#hidden-sheet-id").val();
                formModel.email = formModel.acceptFeedbackContact ? formModel.email : '';
                $.ajax({
                    url: "https://baas.kinvey.com/rpc/kid_Hk57KwIFf/custom/saveFeedback",
                    method: "POST",
                    dataType: "json",
                    contentType: "application/json; charset=utf-8",
                    data: JSON.stringify(formModel),
                    crossDomain: true,
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("Authorization", "Basic " + btoa("feedback:feedback"));
                    },
                success: function () {
                    vote();
                    formIsProcessing = false;
                }
                });

                closeDialog();
            } else {
                formIsProcessing = false;
            }
        } else {
            vote();
            closeDialog();
        }
    });
};
