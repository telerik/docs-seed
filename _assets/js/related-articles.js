$(function () {
    var relatedArticlesMarker = $('h2#see-also');
    if (relatedArticlesMarker.length) {
        var relatedArticlesList = relatedArticlesMarker.next('ul');
        $('#related-articles').append(relatedArticlesList.html());
        
        relatedArticlesMarker.remove();
        relatedArticlesList.remove();
    } else {
        $('.related-articles').toggleClass('empty', true);
    }
});
