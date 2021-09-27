require 'jekyll-assets'

Jekyll::Hooks.register :site, :after_reset do |site, payload|
    Jekyll.logger.info STYLE_GUIDE_TEXT.green
end


STYLE_GUIDE_TEXT = "\n" + "=" * 107  + "\n"\
"|" + " " * 105  + "|\n"\
"| Need help with the docs? Go to the Style Guide (https://testdocs.telerik.com/style-guide/introduction). |"\
"\n|" + " " * 105  + "|"\
"\n" + "=" * 107  + "\n"
