require 'octokit'

module Jekyll
    class ChangelogPage < Page
        def initialize(site, dir, releases, title, id)
            @site = site
            @base = ""
            @dir  = dir
            @name = "changelog.html"

            process(name)

            self.content = File.read(site.in_source_dir("_templates", "changelog.html"))
            self.data = { "releases" => releases, "title" => "Changelog", "package_name" => title, "repo_id" => id, "position" => 100000000, "toc" => false }

            data.default_proc = proc do |_, key|
                site.frontmatter_defaults.find(File.join(dir, name), type, key)
            end

            Jekyll::Hooks.trigger :pages, :post_init, self
        end
    end

    class ComponentsContentGenerator < Generator
        safe true

        # http://stackoverflow.com/a/24810681/1009797
        def forecolor(back)
            rgbval = back.hex
            r = rgbval >> 16
            g = (rgbval & 65280) >> 8
            b = rgbval & 255
            brightness = r*0.299 + g*0.587 + b*0.114
            return (brightness > 160) ? "000" : "fff"
        end

        def remove_links(body)
            # replace semantic-release links and metadata
            # (link) / (#N) / (link, closes #N)
            body
                .gsub(/\(\[[^\]]+\]\([^\)]+\)\)/, '')
                .gsub(/\(#\d*\)/, '')
                .gsub(/\(.*closes \[#\d+\].*\)/, '')
        end

        def generate(site)
            return if ENV['SKIP_CONTENT_UPDATE']

            Octokit.auto_paginate = true

            Octokit.configure do |c|
                c.access_token =  "ab7cecc74eac90ba78c28e6df7b3bbcb1e6b6ca1"
            end

            documentation = [  ]
            structure = site.config['structure']

            if structure == 'packages'
                site.config["repos"].each do |repo|
                    next if repo["available"] == false
                    self.generate_release(site, repo['id'], repo['name'], repo['type'])
                end
            else
                # Skip release note generation until the release mechanism is cleared
                # id = site.config['umbrella_repo']
                # self.generate_release(site, id, id, '')
            end

            site.data["components_roadmap"] = documentation
        end

        def generate_release(site, repo_id, repo_name, repo_type)
            releases = Octokit.list_releases(repo_id)
            releases.select! { |r| !r.draft }

            releases.map! do |release|
                {
                    'body' => self.remove_links(
                        # skip semantic release headers
                        release.body
                            .gsub(/<a name.*/, '')
                            .gsub(/##.*\(\d{4}-\d{2}-\d{2}\)/, '')
                    ),
                    'name' => release.name,
                    'id' => release.id,
                    'date' => release.published_at
                }
            end

            path = "documentation"
            path = "documentation/styling" if repo_type == "theme"

            site.pages << ChangelogPage.new(site, "#{path}/#{repo_name.downcase}", releases, repo_name, repo_id)
        end
    end
end
