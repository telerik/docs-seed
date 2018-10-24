module Jekyll

    require 'html/pipeline'

    class HeaderLinkFilter < HTML::Pipeline::Filter

        PUNCTUATION_REGEXP = /[^\p{Word}\- ]/u

        def call()

            doc.css('h1, h2, h3').each do |heading|

                desc_node = heading.children.first()
                if desc_node
                    id = desc_node.text
                else
                    id = heading.text
                end

                id = id.downcase.strip
                id.gsub!(PUNCTUATION_REGEXP, '') # remove punctuation
                id.gsub!(' ', '-') # replace spaces with dash

                heading['id'] = id

                a = Nokogiri::XML::Node.new('a', doc)
                a['href'] = "##{id}"

                if desc_node
                    a.children = desc_node
                end

                if next_child = heading.children.first()
                    next_child.before(a)
                else
                    heading.add_child a
                end

            end

            doc
        end
    end

    class Converters::Markdown::MarkdownProcessor
        def initialize(config)
            @config = config

            @pipeline = HTML::Pipeline.new [
                HTML::Pipeline::MarkdownFilter,
                HeaderLinkFilter
            ]

        end

        def convert(content)
            @pipeline.call(content)[:output].to_s
        end
    end

end
