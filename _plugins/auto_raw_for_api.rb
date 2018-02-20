require 'cgi'

Jekyll::Hooks.register :pages, :pre_render do |page|
  page.content.gsub!(/```([a-z\-]*)\s*\n(\s*)(.+?)\n\s*```/m) {
    language = Regexp.last_match[1]
    indent = Regexp.last_match[2].length
    snippet = Regexp.last_match[3]

    # trim leading indent of snippet within list
    snippet.gsub!(/\n([ ]{#{indent}})/, "\n" + " " * (indent-1)) if indent > 1

    previewClass = '';
    previewClass = ' class="preview"' if language =~ /-preview/

    "{% raw %}" +
    "<pre#{previewClass}><code class=\"language-#{language}\">" +
    "#{CGI.escapeHTML(snippet)}" +
    "</code></pre>" +
    "{% endraw %}"
  }
end
