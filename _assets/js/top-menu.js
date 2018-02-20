$(function() {
  $(".TK-Hat")
    .on("mouseenter", ".TK-Hat-Menu-Item", function(e) {
      $(e.currentTarget).children(".TK-Dropdown").addClass("TK-Dropdown--Active");
    })
    .on("mouseleave", ".TK-Hat-Menu-Item", function(e) {
      $(e.currentTarget).children(".TK-Dropdown").removeClass("TK-Dropdown--Active");
    });
});
