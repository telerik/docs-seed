# docs-seed repo
Contains the documentation site implementation.

- [Local Setup :computer:](#local-setup)
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
- [docs-seed Syntax Guidelines](#docs-seed-syntax-guidelines)

## Local Setup
This section describes how to run the documentation locally.

### Prerequisites
- Install Docker (Community Edition(CE) is sufficient):
  - Use the [official Docker installation guide](https://docs.docker.com/install/). Accept the default installation instructions (use Linux containers, and so on).
- Install [Node.js](https://nodejs.org/en/) and restart the machine.
- Choose a repo you want to contribute to (for example, [https://github.com/telerik/xaml-docs.git](https://github.com/telerik/xaml-docs.git)). We will refer to that repo later on as **'MY-REPO'**.
- Pull the documentation repo onto your hard drive (for example, `"D:\Work\xaml-docs"`). We will refer to the local path, where the documentation repo is cloned, as **'DOCS-PATH'**.

> * For products such as Kendo UI for jQuery, UI for ASP.NET MVC, and UI for ASP.NET Core, the documentation is part of source code repo. For these products, **'DOCS-PATH' is a nested folder** in the cloned repo, for example, `"D:\Work\kendo-ui-core\docs"`.
> * If you are not able to install and use Docker, go to [Instructions (without Docker)](#instructions-without-docker). Otherwise, continue to the next section.

### Instructions (with Docker)
1. Clone the current (seed) repo.
  ```bash
  git clone git@github.com:telerik/docs-seed.git
  ```

1. Go to the directory in which you've pulled it (for example, `D:\Work\docs-seed`).
1. Open a terminal of your choice (for example, `gitBash`).
1. Run the following command by passing the **DOCS-PATH** path (the **quotes** are mandatory):
  ```bash
  sh copy_local.sh "D:\Work\xaml-docs"
  ```

  > If you are running the documentation on a macOS or another OS where the `robocopy` command is unavailable, pass a second parameter to the `copy_local.sh` script: `sh copy_local.sh "D:\Work\xaml-docs" true`.

1. Go to the **DOCS-PATH** directory.
2. Open the `Dockerfile` with an editor
3. Delete the following two rows:
```
ADD Gemfile ${APP_ROOT}/
ADD Gemfile.lock ${APP_ROOT}/
```
4. Add the following row:
```
ENV BUNDLER_VERSION=2.1.4
```
5. Delete the `GemFile.lock` file
6. Open a terminal of your choice (for example, `gitBash`).
7. Execute the following bash command in the root folder (where the `Dockerfile` is located).
  ```bash
  sh start-docs.sh
  ```

1. Open the documentation site on the server address shown in the terminal: `http://0.0.0.0:4000/`. If you can't open the URL, replace the `0.0.0.0` with `localhost`: `http://localhost:4000`. For example, for the WPF documentation, this will be `http://0.0.0.0:4000/devtools/wpf/`.

1. To stop the web site and the container in which it has been served, navigate to the terminal in which you've executed the previous command, and press `CTRL+C`. On passing an additional `config` file for the WPF and Silverlight documentation, refer to [this section](#additional-config-file).

### Instructions (without Docker)

1. Install ruby 2.3.3 ([64-bit](https://github.com/oneclick/rubyinstaller/releases/download/ruby-2.3.3/rubyinstaller-2.3.3-x64.exe) or [32-bit](https://github.com/oneclick/rubyinstaller/releases/download/ruby-2.3.3/rubyinstaller-2.3.3.exe)).
1. Install Ruby DevKit 4.7.2 ([64-bit](https://github.com/oneclick/rubyinstaller/releases/download/devkit-4.7.2/DevKit-mingw64-64-4.7.2-20130224-1432-sfx.exe) or [32-bit](https://github.com/oneclick/rubyinstaller/releases/download/devkit-4.7.2/DevKit-mingw64-32-4.7.2-20130224-1151-sfx.exe)). For more information, see the [Development Kit - Installation instructions](https://github.com/oneclick/rubyinstaller/wiki/Development-Kit#installation-instructions).
1. Ensure that everything is installed correctly. This is a required step if you have previous versions installed on the machine (for example, check whether the `config.yml` file in the DevKit root folder contains the correct path to the ruby folder and check whether the system environment variables are correctly set). For more information, refer to [this article](http://jekyll-windows.juthilo.com/1-ruby-and-devkit/).
1. Install bundler (if you have already installed, continue to the next step) by executing `gem install bundler`.

  > If you experience SSL errors with Bundler, similar to the one described in [RubyGems SSL Certificate Update](https://guides.rubygems.org/ssl-certificate-update/), then follow the solution steps shared in [Bundler.io - Installing new RubyGems certificates](https://bundler.io/v2.0/guides/rubygems_tls_ssl_troubleshooting_guide.html#installing-new-rubygems-certificates).

1. Clone the current (seed) repo.
  ```bash
  git clone git@github.com:telerik/docs-seed.git
  ```

1. Go to the directory in which you've pulled the current (seed) repo (for example, `D:\Work\docs-seed`).
1. Open a terminal of your choice (for example, `gitBash`).
1. Run the following command by passing the **DOCS-PATH** path (the **quotes** are mandatory):
  ```bash
  sh copy_local.sh "D:\Work\xaml-docs"
  ```

  > If you are running the documentation on a macOS or another OS where the `robocopy` command is unavailable, pass a second parameter to the `copy_local.sh script`: `sh copy_local.sh "D:\Work\xaml-docs" true`.

1. Go to the **DOCS-PATH** directory.
1. Open a terminal of your choice (for example, `gitBash`).
1. Install gems by executing `bundle install`.
1. Execute the following bash command in the root folder:
  ```bash
  bundle exec jekyll serve
  ```

1. Open the documentation site on the server address which is written in the terminal: `http://127.0.0.1:4000/`. If you can't open the URL, replace the `127.0.0.1` with `localhost`: `http://localhost:4000`. For example, for the WPF documentation, this will be `http://127.0.0.1:4000/devtools/wpf/`.

1. To change the host or port, pass the `--host` or `--port` arguments to the command above as an addition (for example, `bundle exec jekyll serve --host=0.0.0.0 --port=1234`).

## Troubleshooting

### Get More Detailed Error Message

To get more information and a full stack trace of the error, add `--trace` after your `jekyll` command. For example, `bundle exec jekyll build --trace`.

### Does Not Serve

You executed `sh start-docs.sh` but you did not see any Jekyll output. Instead, the command ended with `the input device is not a TTY. If you are using mintty, try prefixing the command with 'winpty'`.

This happens when using Git Bash with the MinTTY console. This console does not allow combinations such as `Ctrl+C` to pass to the Docker container and that's why you get such an error.

To solve this issue, prefix the command with `winpty`:

```bash
winpty sh start-docs.sh
```

Aa an alternative, re-install Git Bash and choose the default Windows terminal this time. For more details, refer to the [Docker for Windows: Interactive Sessions in MinTTY Git Bash](https://willi.am/blog/2016/08/08/docker-for-windows-interactive-sessions-in-mintty-git-bash/) post.

### Ctrl+C Does Not Work

When you want to stop serving the docs, you may have to repeat the `Ctrl+C` command or press `Enter` after it.

### .gitignore Is always Modified

The scripts that copy the seed repo to the content repo (**MY-REPO**) also update the `.gitignore` file to avoid creating unstaged changes together with the work files that must not be committed. If you keep getting the `.gitignore` checked out, identify the changes as compared to the original and commit the version that matches what the tool generates to your repo.

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

You might find the following features useful:
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

To monitor the changes you are making on the built documentation, execute the following command in a new terminal in the root directory of the site:
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

To achieve this, execute the `sh modify-config.sh` script with passing the corresponding arguments which are:

- `-i,--include`&mdash;The folders you want to include in the final build. Multiple folders are separated with a comma. No spaces are allowed.
- `-c,--config`&mdash;The path to an additional config file which will be used for the build (more about [additional config file](#additional-config-file)).
- `-s,--serve`&mdash;Accepts `true`/`false`. Indicates whether the Jekyll will only build or build and serve.
- `-d,--docker`&mdash;Accepts `true`/`false`. Indicates whether the site will run in Docker (set `--docker=true` if you're using Docker).

For example, if you want to build only the documentation for two controls, the Barcode and the Chart, you are using Docker, and you have an extra config YAML file. Then you have to open a terminal and execute the following command:

`sh modify-config.sh --include=controls/barcode,controls/Chart --docker=true --config=_extra.yml`

### Exclude Articles from Navigation Tree

If you have some obsolete articles or whole folders that you need to hide from the navigation tree, use the `exclude_navigation` array in the settings of the `config.yml` file in your repository. The example below shows how to exclude listing all articles in `knowledge-base` folder as well as `sharepoint` folder.

For example, from `https://github.com/telerik/ajax-docs/blob/master/_config.yml#L6`, `exclude_navigation: ["sharepoint/2007/*" ,"knowledge-base/*"]`

### Webinar Banner

Moved in wiki under the [Announcements banner](https://github.com/telerik/docs-seed/wiki/Yellow-ribbon-banner-for-announcements#announcements-banner) article.

## Build API Reference

A [DocFX](https://dotnet.github.io/docfx/)-based infrastructure generates the API reference portion of the site for you. To use it, you need the following:

* The docs-seed repo on your build machine.

* An API ref link in your table of contents on the left. To enable it, add the following line in your `_config.yml` file:

    `_config.yml`
    
        `api_reference_url: "api/"`
        
* A folder on a shared network location that the build can access, and that contains the `.dll` and `.xml` files you want generated.

* The assets for building the API reference in your repo. You can start by copying existing assets, for example, [from WinForms](https://github.com/telerik/winforms-docs/tree/master/_assetsApi). Note that the templates are plain HTML for the time being, so you must keep them in sync with your repo code manually: update the footer template with the generated HTML of your own docs, make sure the search template can reach the scripts it needs (can be an issue if you have cache busting enabled in your own repo). Also, update the `index.md` file to have the contents suitable for your case. Keep them updated if you change your own repo as well.

* An `MSBuild` step in your content repo builds that will take the binaries, XML files and content repo, build the HTML files for the API ref, and copy them to the `_site/api` folder in your content repo.

    This build is executed through the [`_buildApi/BuildApiReference.proj`](https://github.com/telerik/docs-seed/blob/master/_buildApi/BuildApiReference.proj) file. For example, in the VS command prompt: `msbuild.exe BuildApiReference.proj /p:LatestBinariesPath=\\\\someNetworkServer\MySourceFiles;DocsRepoName=blazor-docs;DocumentationBaseUrl=https://docs.telerik.com/blazor-ui;DocsRepoApiAssetsFolder=_assetsApi;HasApiFilter=true`.
     
     >note Depending on the machine culture, you might need to use a comma `,` instead of a semi-colon `;` otherwise you will get a `DocsRepoName is not defined` error
           ```
           (CheckRequiredProperties target) ->
              D:\DocsSeed\_buildApi\BuildApiReference.proj(26,5): error : DocsRepoName is not defined (Ex. winforms-docs)
           ```
           
    Here is a list of the build parameters and their purpose:
    
    * `LatestBinariesPath`&mdash;The path to where you have the `.dll`+`.xml` pairs of code you want documented. The format is usually resembles `\\\\someNetworkServer\MySourceFiles` or `C:\work\myFolder`. The escaping of the backslashes is an example for using this as a build parameter.
    
    * `DocsRepoName`&mdash;The name of the repo with your contents. By default, the build expects that the docs-seed repo and the content repo are located in adjacent folders.  So, for example, pass only `blazor-docs` or `winforms-docs`, or `teststudio/docs` (when the docs are nested further down in a folder inside your repo).
    
    * `DocumentationBaseUrl`&mdash;The base URL of your docs when on the live server. Used for the `sitemap.xml` file. For example, `https://docs.telerik.com/blazor-ui/`.
    
    * `DocsRepoApiAssetsFolder`&mdash;This is the location for the build assets specific to your repo (at the time of writing, search, footer templates, feedback form, plus some styles). If you copy from an existing repo, this is always `_assetsApi`.
    
    * `HasApiFilter`&mdash;An `optional` parameter in case you want to avoid generating API reference docs for some classes or their members. See the [DocFX docs on the matter](https://dotnet.github.io/docfx/tutorial/howto_filter_out_unwanted_apis_attributes.html) for syntax and examples. To use this filter, you must add a file in your repo with the desired filter contents, and put it in `<DocsRepoApiAssetsFolder>\filterConfig.yml`. The file is always at the root of the API assets folder, and is always called `filterConfig.yml`. Here's what DocFX generates at the time of writing (10 Jul 2019, DocFX version 2.40.5):
    
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