require 'yaml'

Jekyll::Hooks.register :site, :after_reset do |site|
  puts('Installing npm packages...')
  channel = "latest";
  npm_modules_dir = File.join(Dir.pwd, "./npm/")
  npm_modules = [
        "cldr-data@latest",
        "core-js@^2.2.2",
        "raven-js@3.13.1",
        "@telerik/kendo-intl",
        "@progress/kendo-theme-default@latest",
        "@progress/kendo-theme-bootstrap@latest",
        "@progress/kendo-theme-material@latest"
    ]

    system "bash ./install-npm.sh \"#{npm_modules_dir}\" \"#{npm_modules.join(' ')}\""
end
