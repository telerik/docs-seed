require 'jekyll-assets'

Jekyll::Hooks.register :site, :after_reset do |site, payload|
    Jekyll.logger.info STYLE_GUIDE_FORMATTED_TEXT.green
end

STYLE_GUIDE_TEXT = "Need help with the docs? Go to the Style Guide (https://docs.telerik.com/style-guide/introduction)."
STYLE_GUIDE_PLACEHOLDER_LENGTH = STYLE_GUIDE_TEXT.length + 2
STYLE_GUIDE_FORMATTED_TEXT = "\n" + "=" * (STYLE_GUIDE_PLACEHOLDER_LENGTH + 2) + "\n"\
"|" + " " * STYLE_GUIDE_PLACEHOLDER_LENGTH + "|\n"\
"| " + STYLE_GUIDE_TEXT + " |"\
"\n|" + " " * STYLE_GUIDE_PLACEHOLDER_LENGTH  + "|"\
"\n" + "=" * (STYLE_GUIDE_PLACEHOLDER_LENGTH + 2)  + "\n"
