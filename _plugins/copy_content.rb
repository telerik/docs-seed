Jekyll::Hooks.register :site, :after_init do |site|
  puts('Copying site content...')

  tmp_folder = File.join(Dir.pwd, '.tmp');
  documentation_folder = File.join(Dir.pwd, 'documentation')
  # The 'config.json' represents the configuration, necessary for every documentation build.
  # It should be copied under the '.tmp/' folder, along with the rest ot the documentation content - MD, images, etc.
  config = JSON.parse(File.read("#{tmp_folder}/config.json"))
  
  # Copy site's content
  system "bash ./copy_content.sh \"#{tmp_folder}/documentation\" \"#{documentation_folder}\""
 
  # TODO: read the configuration for the corresponding documentation...
#throw
end
