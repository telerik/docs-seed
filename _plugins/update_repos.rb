# require 'octokit'
# require 'yaml'

# Jekyll::Hooks.register :site, :after_reset do |site|
#     next if ENV['SKIP_CONTENT_UPDATE']

#     Octokit.configure do |c|
#         c.access_token =  "ab7cecc74eac90ba78c28e6df7b3bbcb1e6b6ca1"
#     end

#     channel = 'dev'
#     branch = 'develop'
#     platform = site.config['platform']
#     structure = site.config['structure']
#     assets_path = "_" + platform
#     common_repos = []

#     repos = site.config["repos"]

#     if site.config["common_repos"]
#         common_repos = YAML.load_file(site.config["common_repos"])
#     end

#     puts 'Running in platform: ' + platform

#     # copy hardcoded assets
#     system "bash ./copy-static-content.sh #{assets_path}"

#     if site.config['environment'] == 'production' then
#       channel = "latest"
#       branch = "master"
#     end

#     npm_modules_dir = File.join(Dir.pwd, "./npm/")
#     npm_modules = [
#         "cldr-data@latest",
#         "core-js@^2.2.2",
#         "raven-js@3.13.1",
#         "@telerik/kendo-intl",
#         "@progress/kendo-theme-default@#{channel}",
#         "@progress/kendo-theme-bootstrap@#{channel}",
#         "@progress/kendo-theme-material@#{channel}"
#     ]

#     if site.config['common_tasks'] then
#         # we are in development mode kendo-common-tasks is either downloaded from
#         # a remote feature branch or symlinked from local path.
#         # See common-tasks.yml cofiguration
#         ENV['TASKS_BRANCH'] = site.config['common_tasks']['branch_name'];
#     end

#     common_tasks_repo = Octokit.repository('telerik/kendo-common-tasks');
#     local_path=File.join(Dir.pwd, '.tmp', common_tasks_repo.name)
#     system "bash ./checkout-common-tasks.sh #{common_tasks_repo.ssh_url} #{local_path} #{branch}";

#     def process_package(repo, npm_modules, branch)
#         github_repo = Octokit.repository(repo["id"])

#         puts("== copying local repo: #{github_repo}")

#         if repo["local"]
#             system "bash ./copy-local-repo.sh #{github_repo.name} #{repo["local"]}"
#         else
#             path = repo['name'].downcase
#             path = 'styling/' + path if repo['type'] == "theme"
#             system "bash ./checkout-repo-tags.sh #{github_repo.name} #{github_repo.ssh_url} #{path} #{branch}"
#         end
#     end

#     common_repos.each do |repo|
#         next if repo["available"] == false
#         process_package(repo, npm_modules, branch)
#         npm_module = repo['module'] + "@#{channel}"
#         npm_modules.push(npm_module) if site.config["host_npm"]
#     end

#     if structure != 'monorepo' then
#         if platform == 'angular' then
#             npm_modules.push(*[
#                 "@angular/animations@^4.0.0",
#                 "@angular/core@^4.0.0",
#                 "@angular/common@^4.0.0",
#                 "@angular/compiler@^4.0.0",
#                 "@angular/forms@^4.0.0",
#                 "@angular/http@^4.0.0",
#                 "@angular/platform-browser@^4.0.0",
#                 "@angular/platform-browser-dynamic@^4.0.0",
#                 "@progress/kendo-angular-resize-sensor@#{channel}",
#                 "rxjs@^5.0.3", # potentially move this module to the common ones.
#                 "hammerjs@^2.0.0", # potentially move this module to the common ones.
#                 "zone.js@^0.8.4"
#             ])
#         else
#             # At platfrom specific packages
#         end
#         repos.each do |repo|
#             next if repo["available"] == false
#             process_package(repo, npm_modules, branch)
#             npm_module = repo['module'] + "@#{channel}"
#             npm_modules.push(npm_module) if site.config["host_npm"]
#         end
#     else
#         # clone the mono repo then copy all lerna packages
#         github_repo = Octokit.repository(site.config["mono_repo"])

#         system "bash ./checkout-lerna-repo.sh #{github_repo.name} #{github_repo.ssh_url} #{branch}"

#         if site.config['local'] || ENV['LOCAL_BOOTSTRAP']
#             puts "Bootstraping lerna repository in order to produce bundles only when using local packages"
#             bootstrapExitCode = system "bash ./bootstrap-lerna-repo.sh #{github_repo.name}"

#             unless bootstrapExitCode then
#                 puts "Bootstrap command failed to produce bundles, exiting!"
#                 exit(1)
#             end
#         end

#         repos.each do |repo|
#             next if repo["available"] == false

#             path = repo['name'].downcase
#             lerna_package = repo["id"]
#             system "bash ./copy-local-lerna-repo.sh #{github_repo.name} #{lerna_package} #{path}"

#             if site.config["host_npm"] then
#                 if site.config['local'] || ENV['LOCAL_BOOTSTRAP'] then
#                     npm_module = File.join(Dir.pwd, '.tmp', github_repo.name, 'packages', lerna_package)
#                 else
#                     npm_module = repo['module'] + "@#{channel}"
#                 end
#                 npm_modules.push(npm_module)
#             end
#         end
#     end

#     puts 'Installing the following modules.'
#     puts npm_modules;

# # Write a single concat file for auto-imports
#     File.open('_assets/js/module-directives.js', 'w') do |f|
#         f.write "window.moduleDirectives = [];\n";
#         site.config["repos"].concat(common_repos).each do |repo|
#             path = File.join("components", repo['name'].downcase, 'auto-imports.js')
#             next unless File.exists? path
#             f.write File.read(path)
#         end
#     end

#     npm_modules.sort!.sort! { |a,b| a =~ /-angular|-react/ ? 1 : (a <=> b) }

#     system "bash ./install-npm.sh \"#{npm_modules_dir}\" \"#{npm_modules.join(' ')}\""
# end
