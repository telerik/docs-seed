# docs-seed repo
Contains the documentation site implementation.

- [Local Setup :computer:](#local-setup)
  * [Prerequisites](#prerequisites)
  * [Instructions without Docker](#instructions-without-docker)
  * [Instructions with Docker](#instructions-with-docker)
- [Troubleshooting :hankey:](#troubleshooting)
- [Extra Features :moneybag:](#extra-features)
  * [Additional config File](#additional-config-file)
  * [Live Sync](#livesync)
  * [Build without Serve](#only-build)
  * [Build Site Partially](#build-site-partially)
  * [Exclude Articles from Navigation Tree](#exclude-articles-from-navigation-tree)
  * [Webinar Banner](#webinar-banner)
- [Build API Reference](#build-api-reference)
- [Documentation Best Practices](#documentation-best-practices)
- [docs-seed Syntax Gudelines](#docs-seed-syntax-guidelines)

## Local Setup
This section describes the best practices about what and how needs to be done to run the documentation locally.

### Prerequisites
1. Clone the current `docs-seed` repo, for example in `"D:\Work\docs-seed\"`. We will refer to this folder later on as **'DOCS-SEED-PATH'**.
    ```bash
    git clone git@github.com:telerik/docs-seed.git
    ```
1. Choose a repo you want to contribute to (for example, [https://github.com/telerik/xaml-docs.git](https://github.com/telerik/xaml-docs.git). We will refer to that repo later on as **'MY-REPO'**.
1. Clone the documentation repo (for example, in `"D:\Work\xaml-docs"`). We will refer to the local path, where the documentation repo is cloned, as **'DOCS-PATH'**.
    > For products such as Kendo UI for jQuery, UI for ASP.NET MVC, and UI for ASP.NET Core, the documentation is part of source code repo. For these products, **'DOCS-PATH' is actually a nested folder** in the cloned repo, for example, `"D:\Work\kendo-ui-core\docs"`.
1. Open a terminal of your choice (for example, `Git Bash`).
1. Go to **DOCS-SEED-PATH** in the terminal.
1. Run the following command by passing the **DOCS-PATH** path (the **quotes** are mandatory):
    ```bash
    sh copy_local.sh "D:\Work\xaml-docs"
    ```

    > If you are running the documentation on a MacOS or another OS where the `robocopy` command is unavailable, pass a second parameter to the `copy_local.sh` script: `sh copy_local.sh "D:\Work\xaml-docs" true`.

### Instructions Without Docker

1. Install Ruby 2.7.8
  * On Windows, use the [Ruby 2.7.8 and the Ruby DevKit installer](https://rubyinstaller.org/downloads/) for [x64](https://github.com/oneclick/rubyinstaller2/releases/download/RubyInstaller-2.7.8-1/rubyinstaller-devkit-2.7.8-1-x64.exe) or [x86](https://github.com/oneclick/rubyinstaller2/releases/download/RubyInstaller-2.7.8-1/rubyinstaller-devkit-2.7.8-1-x86.exe) machines. Ensure that everything is correctly installed especially if you have previous versions installed on the machine (for example, check whether the `config.yml` file in the DevKit root folder contains the correct path to the ruby folder and check whether the system environmnet variables are correctly set). For more information, refer to [this article](http://jekyll-windows.juthilo.com/1-ruby-and-devkit/).
  * On Mac, follow the [tutorial by Moncef Belyamani](https://www.moncefbelyamani.com/how-to-install-xcode-homebrew-git-rvm-ruby-on-mac/). Consider making Ruby 2.7.8 the default one for the Terminal.
1. Open a terminal of your choice (for example, `gitBash`).
1. Go to the **DOCS-PATH** directory.
1. Install bundler if you don't have it, by executing `gem install bundler`.
    > If you encounter SSL errors with Bundler, similar to the one described in [RubyGems SSL Certificate Update](https://guides.rubygems.org/ssl-certificate-update/), then follow the solution steps shared in [Bundler.io - Installing new RubyGems certificates](https://bundler.io/v2.0/guides/rubygems_tls_ssl_troubleshooting_guide.html#installing-new-rubygems-certificates).
1. Install gems by executing `bundle install`.
1. Execute the following bash command in the root folder:
    ```bash
    bundle exec jekyll serve
    ```
1. Open the documentation site on the server address which is written in the terminal: `http://0.0.0.0:4000/`. If you can't open the URL, replace the `0.0.0.0` with `localhost`: `http://localhost:4000`. For example, for the WPF documentation, this will be `http://0.0.0.0:4000/devtools/wpf/`.

1. To change the host or port, pass the `--host` or `--port` arguments to the command above as an addition (for example, `bundle exec jekyll serve --host=0.0.0.0 --port=1234`).

### Instructions With Docker

Building docs sites with this `docs-seed` branch doesn't work with Docker. The purpose of this branch is to work with Macs with Apple silicon and users who prefer not to use Docker.

## Troubleshooting

### Get More Detailed Error Message

To get more information and a full stacktrace of the error, add `--trace` after your jekyll command. For example, `bundle exec jekyll build --trace`.

### Ctrl+C Does Not Work

When you want to stop serving the docs, you may have to repeat the `Ctrl+C` command or press `Enter` after it.

### .gitignore Is always Modified

The scripts that copy the seed repo to the content repo (**MY-REPO**) also update the `.gitignore` file to avoid creating unstanged changestogether with the work files that must not be commited. If you keep getting the `.gitignore` checked out, identify the changes as compared to the original and commit the version that matches what the tool generates to your repo.

### Performance

Docker is a resource-intensive tool. If you are not using it on a daily basis, consider preventing it from running on startup. Right-click its **Tray** icon and navigate to **Settings** > **General**. Uncheck **Start Docker when you log in**. This can save you time when booting up/logging in, but you will need to explicitly start Docker before working on any docs-seed documentation.

Also, it tends to require a lot of HDD space, which may be an issue if you are running it on an SSD drive with a limited capacity. You can reduce its quota by navigating to the **Settings** dialog > **Advanced** and either change the image location, and/or reduce its max size. This also lets you limit its RAM consumption.

### Encoding Problems while Building

When you try to build the documentation site, you may see an error including the following `incomplete "\n" on UTF-16LE` message. It might be caused because of different things. Use the following steps to try to fix or workaround it:

1. Ensure [Node.js](https://nodejs.org/en/) is installed by typing `node -v` in a command prompt. The machine must be restarted after a `Node.js` installation.
1. Allow [files with long paths](https://confluence.atlassian.com/bamkb/git-checkouts-fail-on-windows-with-filename-too-long-error-unable-to-create-file-errors-867363792.html) using the following command:
  ```bash
  git config --system core.longpaths true
  ```

1. Add the following [System Environment Variables](https://www.linkedin.com/pulse/how-resolve-utf-8-encoding-issue-jenkins-ajuram-salim/)
  * `JAVA_TOOL_OPTIONS: -Dfile.encoding=UTF-8`
  * `LANG: en_GB.UTF-8`
1. Modify the `runtimes.rb` file in the `execJs` gem by changing the `UTF-16LE` with the `UTF-8` value. For details, [see the instructions here](https://stackoverflow.com/questions/25830561/incomplete-n-on-utf-16le-error) or [here](https://stackoverflow.com/questions/12520456/execjsruntimeerror-on-windows-trying-to-follow-rubytutorial). The `runtimes.rb` file is located in `[Ruby Installation folder]\lib\ruby\gems\2.3.0\gems\execjs-2.7.0\lib\execjs`.


### Known Error Messages

* `jekyll 3.3.1 | Error:  [prev_next plugin] Comparing the pages notes.md and sitemap.xml failed`
  * Usually happens when a new article does not have `position` property in the front-matter. To solve this issue, add a number to the `position` property. If you want some articles to sort alphabetically, they need to have the same `position` value.
  * It might also happen if a folder or a file is magically added to the docs repo folder. To solve this issue, clean the folder and make a fresh clone of the docs repo.

* `jekyll 3.3.1 | Error: 404 Not Found`&mdash;This is often observed when you create a new documentations and when no entry for the product in the Top Navigation list exists. To solve this issue, add an entry for your documentation as in the [feat: add MAUI to top navigation](https://github.com/telerik/docs-seed/commit/454d3178dbe65caa1e84b248206a514e4227d995#diff-96a33d63722834501d92ed56323571da7dd726397623401a2a25f4ac6610a553) commit for the `/_plugins/top_navigation.rb` file. If the Telerik Web Team do not have the Top Navigation ready yet, you can temporarily reuse the top navigation value property from another product to make the build successful. 

## Extra Features

You can benefit from the following features:
* [Additional config File](#additional-config-file)
* [Live Sync](#livesync)
* [Build without Serve](#only-build)
* [Build Site Partially](#build-site-partially)
* [Exclude Articles from Navigation Tree](#exclude-articles-from-navigation-tree)
* [Webinar Banner](#webinar-banner)

### Additional Config File

To add an additional `config.yml` file, pass it to the above command as follows:
```bash
sh start-docs.sh _silverlight.yml
```
### LiveSync
To be able to monitor the changes you are making on the built documentation, execute the following command in a new terminal in the root directory of the site:
```bash
sh watch.sh
```

> You need to have [Node.js](https://nodejs.org/en/) installed.

### Only Build

To only run `jekyll build` and not `jekyll serve`, execute the following bash command:
```bash
sh build-docs.sh
```

This can be useful if you want to (or already have) set up a local IIS to point to the `_site` folder in your documentation repo. This allows you to also test redirects that `jekyll serve` does not support.


### Build Site Partially

To speed up the building time of the web site, you can pass **only** specific parts of it&mdash;the folders you want to include in the site. 

To acieve this, execute the `sh modify-config.sh` script with passing the corresponding arguments which are:

- `-i,--include`&mdash;The folders you want to include in the final build. Multiple folders are separated with a comma. No spaces are allowed.
- `-c,--config`&mdash;The path to an additional config file which will be used for the build (more about [additional config file](#additional-config-file)).
- `-s,--serve`&mdash;Accepts `true`/`false`. Indicates whether the Jekyll will only build or build and serve.
- `-d,--docker`&mdash;Accepts `true`/`false`. Indicates whether the site will be run in Docker (set `--docker=true` if you're using Docker).


For example, let's say that you want to build only the documentation for two controls, the Barcode and the Chart, you are using Docker, and you have an extra config YAML file. Then you have to open a terminal and execute the following command:

`sh modify-config.sh --include=controls/barcode,controls/Chart --docker=true --config=_extra.yml`


### Exclude Articles from Navigation Tree

If you have some obsolete articles or whole folders that you need to hide from the navigation tree, use the `exclude_navigation` array in the settings of the `config.yml` file in your repository. The example below shows how to exclude listing all articles in `knowledge-base` folder as well as `sharepoint` folder.

For example, from `https://github.com/telerik/ajax-docs/blob/master/_config.yml#L6`, `exclude_navigation: ["sharepoint/2007/*" ,"knowledge-base/*"]`

### Webinar Banner

Moved in wiki under the [Announcements banner](https://github.com/telerik/docs-seed/wiki/Yellow-ribbon-banner-for-announcements#announcements-banner) article.


## Build API Reference

There is an infrastructure that uses [DocFx](https://dotnet.github.io/docfx/) to generate an API reference portion of the site for you. To use it, you need the following:

* The docs-seed repo on your build machine. This should already be set up.

* An API ref link in your table of contents on the left. To enable it, add the following line in your `_config.yml` file: 

    `_config.yml`
    
        `api_reference_url: "api/"`
        
* A folder on a shared network location that the build can access, and that contains the `.dll` and `.xml` files you want generated.

* The assets for building the API reference in your repo. You can start by copying existing assets, for example, [from Winforms](https://github.com/telerik/winforms-docs/tree/master/_assetsApi). Note that the templates are plain HTML for the time being, so you must keep them in sync with your actual repo code manually: update the footer template with the generated HTML of your own docs, make sure the search template can reach the scripts it needs (can be an issue mostly if you have cache busting enabled in your own repo). Also, update the `index.md` file to have the contents suitable for your case. Keep them updated if you change your own repo as well.

* An `MSBuild` step in your content repo builds that will take the binaries, xml files and content repo, build the HTML files for the API ref, and copy them to the `_site/api` folder in your content repo.

    This build is executed through the [`_buildApi/BuildApiReference.proj`](https://github.com/telerik/docs-seed/blob/master/_buildApi/BuildApiReference.proj) file. For example, in the VS command prompt: `msbuild.exe BuildApiReference.proj /p:LatestBinariesPath=\\\\someNetworkServer\MySourceFiles;DocsRepoName=blazor-docs;DocumentationBaseUrl=https://docs.telerik.com/blazor-ui;DocsRepoApiAssetsFolder=_assetsApi;HasApiFilter=true`.
     
     >note Depending on the machine culture, you might need to use a comma `,` instead of a semi-colon `;` otherwise you will get a _DocsRepoName is not defined_ error
           ```
           (CheckRequiredProperties target) ->
              D:\DocsSeed\_buildApi\BuildApiReference.proj(26,5): error : DocsRepoName is not defined (Ex. winforms-docs)
           ```
           
    Here is a list of the build parameters and their purpose:
    
    * `LatestBinariesPath`&mdash;The path to where you have the `.dll`+`.xml` pairs of code you want documented. The format is usually something like `\\\\someNetworkServer\MySourceFiles` or `C:\work\myFolder`. The escaping of the backslashes is an example for using this as a build parameter.
    
    * `DocsRepoName`&mdash;The name of the repo with your actual contents. The build assumes the docs-seed repo and the content repo are in adjacent folders. So, it is, for example just `blazor-docs` or `winforms-docs`, or `teststudio/docs` (when the docs are nested further down in a folder inside your repo).
    
    * `DocumentationBaseUrl`&mdash;The base URL of your docs when on the live server. Used for the `sitemap.xml` file. For example, `https://docs.telerik.com/blazor-ui/`.
    
    * `DocsRepoApiAssetsFolder`&mdash;This is where the build assets specific to your repo reside (at the time of writing, search, footer templates, feedback form, plus a little of bit of styles). If you copy from an existing repo, this would always be `_assetsApi`.
    
    * `HasApiFilter`&mdash;An `optional` parameter in case you want to avoid generating API reference docs for certain classes or their members. See the [DocFx docs on the matter](https://dotnet.github.io/docfx/tutorial/howto_filter_out_unwanted_apis_attributes.html) for syntax and examples. To use this filter, you must add a file in your repo with the desired filter contents, and put it in `<DocsRepoApiAssetsFolder>\filterConfig.yml`. The file is always at the root of the API assets folder, and is always called `filterConfig.yml`. Here's what docfx generate at the time of writing (10 Jul 2019, docfx version 2.40.5):
    
      **C#**

          //GENERATED
          public string publicTest;
          protected string protectedTest;
          protected internal string protectedInternalTest;

          //NOT GENERATED
          private string privateTest;
          internal string internalTest;
          private protected string privateProtectedTest;


## Documentation Best Practices

If you need to create new documentation (for example, for a new product), use [`docs-content-seed`](https://github.com/telerik/docs-content-seed) repository as an auxiliary part to this one. 

For best practices and industry standards on creating and maintaining documentation, go to the public [Progress DevTools Style Guide](https://docs.telerik.com/style-guide/introduction).   

## docs-seed Syntax Guidelines  

To ensure the syntax you use when you add or edit the documentation will properly render the content, read the [syntax guidelines in the docs-seed Wiki](https://github.com/telerik/docs-seed/wiki/Handling-Redirects). 
