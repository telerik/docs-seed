module Reading
    class CtaPanelGenerator < Jekyll::Generator
          def generate(site)	
              @site = site
              @converter = site.find_converter_instance(Jekyll::Converters::Markdown)	
              site.pages.each do |p|			
                  createCtaPanel(p.content, p)
              end
          end
      
          def createCtaPanel(content, page)
            #content.scan(/(^\# )(.*)/)  {|w| print "<<#{w}>> " }
            slug = page.data["slug"]
            # if there is slug, there is 0 or 1 slashes and ends with overview
            if !slug.nil? && slug.scan(/(\/)/).count < 2  && (slug.end_with?("overview") || slug.end_with?("introduction"))    
                # sub_string = content.scan(/(^\#\s+)(.*)/)
                sub_string = content.scan(/(^\#\s+.*\n+.*\n+.*\n)/)
                sub_string.take(1).each do |s|
                    str = s.join
                    block = str +"\n{% include cta-panel.html %}"
                    #   print block
                    print page.data
                    # throw
                    content.sub!(str, block)
                    print content
                 end
                else  
                    page.data["isRestOfPages"] = true
               end
          end
          
      end
  end
  