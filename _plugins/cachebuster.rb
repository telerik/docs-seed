Jekyll::Hooks.register :site, :after_init do |site, payload|
  if !site.config['assets']
    site.config['assets'] = Hash.new
  end

  site.config['assets']['digest'] = true
  site.config['assets']['compress'] = { 'js' => true }
end
