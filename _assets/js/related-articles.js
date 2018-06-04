$(function () {
    var relatedArticlesMarker = $('h2#toc-see-also');
    if (relatedArticlesMarker.length) {
        var relatedArticlesList = relatedArticlesMarker.next('ul');
        $('#related-articles').append(relatedArticlesList.html());
        
        relatedArticlesMarker.remove();
        relatedArticlesList.remove();
    } else {
        $('.related-articles').toggleClass('empty', true);
    }
});
