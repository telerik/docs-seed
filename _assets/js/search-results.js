$(function() {
    function toKV(n) {
        n = n.split("=");
        this[n[0]] = n[1];
        return this;
    }

    var params = location.search.replace(/(^\?)/,'').split("&").map(toKV.bind({}))[0];

    $("[name=q]").val(params.q);
});
