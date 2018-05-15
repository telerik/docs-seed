Jekyll::Hooks.register :site, :after_init do |site|
  puts('Copying site content...')

  # The 'config.json' represents the configuration, necessary for every documentation build.
  # It should be copied under the '.tmp/' folder, along with the rest ot the documentation content - MD, images, etc.
  config = JSON.parse(File.read(File.join(Dir.pwd, ".tmp/config.json")))
  
  # TODO: read the configuration for the corresponding documentation...
throw
end
