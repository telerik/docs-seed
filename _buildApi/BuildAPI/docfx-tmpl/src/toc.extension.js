// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE file in the project root for full license information.

/**
 * This method will be called at the start of exports.transform in toc.html.js
 */
exports.preTransform = function (model) {
  return model;
}

/**
 * This method will be called at the end of exports.transform in toc.html.js
 */
exports.postTransform = function (model) {

    var nodes = [model];

    while (nodes.length > 0) {
        var item = nodes.pop();

        if (item.topicHref) {
            item.topicHref = item.topicHref.replace(/\.html$/i,"");
        }

        if (!!item.items) {
            nodes.push.apply(nodes, item.items);
        }
    }

    return model;
}
