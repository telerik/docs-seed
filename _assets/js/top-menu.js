var NAVBAR_HEIGHT = 70;
var HEADER_HEIGHT = 100;
var FOOTER_DISTANCE = 20;
var windowHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

$(function() {
  $(".TK-Hat")
    .on("mouseenter", ".TK-Hat-Menu-Item", function(e) {
      $(e.currentTarget).children(".TK-Dropdown").addClass("TK-Dropdown--Active");
    })
    .on("mouseleave", ".TK-Hat-Menu-Item", function(e) {
      $(e.currentTarget).children(".TK-Dropdown").removeClass("TK-Dropdown--Active");
    });
});
