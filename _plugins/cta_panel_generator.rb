module Reading
    class CtaPanelGenerator < Jekyll::Generator
        def initialize(config)
            @config = config
        end
        
        def generate(site)	
            return if @config["has_cta_panels"] != true
            
            product =  @config['product']
            
            cta_panels_data = site.data["cta_panels_data"][product]
            overview_regex = !cta_panels_data["overview_regex"].nil? ? cta_panels_data["overview_regex"] : 'controls\/[^\/]*\/overview\.md'
            introduction_regex = !cta_panels_data["introduction_regex"].nil? ? cta_panels_data["introduction_regex"] : 'introduction\.md'
            
            overview_articles = cta_panels_data["overview_articles"].nil? ? [] : cta_panels_data["overview_articles"]
            introduction_articles = cta_panels_data["introduction_articles"].nil? ? [] : cta_panels_data["introduction_articles"]
            overview_paths = overview_articles.keys

            Navigation.load(YAML.load(File.read('_config.yml'))['navigation'])
            
            site.pages.each do |p|	
                shouldCreateCTA = false
                if p.path.match(Regexp.new(introduction_regex)) || introduction_articles.include?(p.path)
                    p.data["isIntroduction"] = true
                    shouldCreateCTA = true
                elsif p.path.match(Regexp.new(overview_regex)) || overview_paths.include?(p.path)
                    p.data["isControlOverview"] = true
                    
                    if overview_paths.include?(p.path)
                        p.data["CTAControlName"] = overview_articles[p.path]
                    else
                        filename = p.path.split("/").pop()
                        controlName = Navigation.get_entry(p.path.sub("/"+filename,""))["title"]
                        if controlName.nil? || controlName.empty?
                            puts "cannot find ControlName for ", p.path
                            p.data["isIntroduction"] = true
                        else
                            p.data["CTAControlName"] = controlName
                        end
                    end
                    shouldCreateCTA = true
                else
                    p.data["isRestOfPages"] = true
                end
                if shouldCreateCTA	&& p.content.scan(/\{%.*include.*cta-panel-.*%\}/).count == 0
                    createCtaPanel(p.content, p, site)
                end
            end
        end

        def createCtaPanel(content, page, site)
            panel = "\n{% include cta-panel-overview.html %}\n"

            if page.data["isIntroduction"]
                panel = "\n{% include cta-panel-introduction.html %}\n"
            end
           
            sub_string = content.scan(/(^\#.*?)(\n\#)/m)
            if sub_string.count == 0 
                heading = content.scan(/^\#.*/).to_a()[0]
                content.sub!(heading, heading+panel)
                # print "\nno match in scan\n"
                # print content
                return
            end
            sub_string.take(1).each do |s|
                first_heading_content = s[0]
                
                block = first_heading_content + panel
                content.sub!(first_heading_content, block)

                # print "\nhas match\n"
                # print content
            end
        end  
        def format_title(title)
            title.split('-').map { |w| w.upcase[0] + w[1,w.size - 1] }.join(' ')
          end
      end
end

# module Jekyll
#     class ControlNameTag < Liquid::Tag
#         def render(context)
#             node = context['page']['node']
#             node.format_title(node.parent.title)
#         end
#     end
# end

# Liquid::Template.register_tag('render_control_name', Jekyll::ControlNameTag)
