module Jekyll
    class Page
      alias_method :old_url, :url
    
      def url
        old_url.downcase.gsub(/\.html(?![^?#])/, '')
      end
    end
end
