require 'jekyll-assets'

Jekyll::Hooks.register :site, :after_reset do |site, payload|
    Jekyll.logger.info STYLE_GUIDE_TEXT.green
end


STYLE_GUIDE_TEXT = "\n" + "=" * 103  + "\n"\
"|" + " " * 101  + "|\n"\
"| Need help with the docs? Go to the Style Guide (https://docs.telerik.com/style-guide/introduction). |"\
"\n|" + " " * 101  + "|"\
"\n" + "=" * 103  + "\n"
