# docs-seed repo
Contains the documentation site implementation.

- [Local Setup :computer:](#local-setup)
- [Troubleshooting :hankey:](#troubleshooting)
- [Extra Features :moneybag:](#extra-features)
- [Build API Reference](#build-api-reference)

## Local Setup
This section describes the best practices about what and how should be done in order to run the documentation locally.

### Prerequisites
- Install Docker (Community Edititon(CE) is enough) - please use the [official Docker installation guide](https://docs.docker.com/install/). Accept the default installation instructions (use Linux containers, etc.)    
  - From the Docker Settings window, share the drive where the documentation repos reside with Docker.
- Choose a repo you want to contribute to (e.g. [https://github.com/telerik/xaml-docs.git](https://github.com/telerik/xaml-docs.git), we will refer to that repo later as 'MY-REPO')
- Pull the repo onto your hard drive (e.g. `"D:\Work\xaml-docs"`)

> IMPORTANT: In case you are not able to install and use Docker, please go to [Instructions (without Docker)](#instructions-without-docker), otherwise continue to the next section.

### Instructions (with Docker)
- Clone the current (seed) repo 
```bash
git clone git@github.com:telerik/docs-seed.git
```

- Go to the directory in which you've pulled it (e.g. `D:\Work\docs-seed`)
- Open a terminal of your choice (e.g., gitBash)
- Run the following command by passing the MY-REPO path (the **quotes** are mandatory):
```bash
sh copy_local.sh "D:\Work\xaml-docs"
```

> If you are running the documentation on a MacOS or another OS where the *robocopy* command is unavailable, you have to pass a second  parameter to the copy_local.sh script: `sh copy_local.sh "D:\Work\xaml-docs" true`

- Go to the MY-REPO directory
- Open a terminal of your choice (e.g., gitBash)
- Execute the following bash command in the root folder (where the **Dockerfile** is located)
```bash
sh start-docs.sh
```

- This is it! You can find the documentation site on server address which is written in the terminal: *http://0.0.0.0:4000/*. If you can't open the previous URL, replace the '0.0.0.0' with 'localhost' - *http://localhost:4000*. 
> For example, for WPF documentation this would be: http://0.0.0.0:4000/devtools/wpf/

> If you want to stop the web site and the container in which it has been served, navigate to the terminal in which you've executed the previous command and press `CTRL+C`.

> For WPF and Silverlight, see how to pass an [additional config file](#additional-config-file).

### Instructions (without Docker)
- Install ruby 2.3.3 ([64bit](https://dl.bintray.com/oneclick/rubyinstaller/rubyinstaller-2.3.3-x64.exe) or [32bit](https://dl.bintray.com/oneclick/rubyinstaller/rubyinstaller-2.3.3-x64.exe))
- Install Ruby DevKit ([64bit](https://dl.bintray.com/oneclick/rubyinstaller/DevKit-mingw64-64-4.7.2-20130224-1432-sfx.exe) or [32bit](https://dl.bintray.com/oneclick/rubyinstaller/DevKit-mingw64-32-4.7.2-20130224-1151-sfx.exe)), see the [instructions](https://github.com/oneclick/rubyinstaller/wiki/Development-Kit#installation-instructions)
- Ensure everything is correctly installed, especially if you have previous versions installed on the machine (e.g. check whether the 'config.yml' file in the DevKit root folder contains the correct path to the ruby folder and check whether the system environmnet variables are correctly set).

> For more info on the above you can read the following article - http://jekyll-windows.juthilo.com/1-ruby-and-devkit/.

- Install bundler (if you have already installed, continue to the next step) by executing `gem install bundler`
- Clone the current (seed) repo 
```bash
git clone git@github.com:telerik/docs-seed.git
```

- Go to the directory in which you've pulled it (e.g. `D:\Work\docs-seed`)
- Open a terminal of your choice (e.g., gitBash)
- Run the following command by passing the MY-REPO path (the **quotes** are mandatory):
```bash
sh copy_local.sh "D:\Work\xaml-docs"
```

- Go to the MY-REPO directory
- Open a terminal of your choice (e.g., gitBash)
- Install gems by executing `bundle install`
- Execute the following bash command in the root folder
```bash
bundle exec jekyll serve
```

- This is it! You can find the documentation site on server address which is written in the terminal: *http://127.0.0.1:4000/*. If you can't open the previous URL, replace the '127.0.0.1' with 'localhost' - *http://localhost:4000*. 
> For example, for WPF documentation this would be: http://127.0.0.1:4000/devtools/wpf/

> If you want to change the host or port just pass the --host or --port arguments to the command above as an addition (e.g. `bundle exec jekyll serve --host=0.0.0.0 --port=1234`). 

## Troubleshooting

### Does Not Serve

You executed `sh start-docs.sh` but you did not see any Jekyll output. Instead, the command ended with

>the input device is not a TTY. If you are using mintty, try prefixing the command with 'winpty'

This happens whtn using Git Bash with the MinTTY console. This console does not allow combinations such as `Ctrl+C` to pass to the Docker container and so you get such an error.

The easiest way to **resolve** it is to prefix the command with `winpty`:

```bash
winpty sh start-docs.sh
```

An alternative is to re-install Git Bash and choose the default Windows terminal this time. You can read more detailes in the following post: [Docker for Windows: Interactive Sessions in MinTTY Git Bash](https://willi.am/blog/2016/08/08/docker-for-windows-interactive-sessions-in-mintty-git-bash/).

### Ctrl+C Does not Work

When you want to stop serving the docs, you may have to **repeat** the `Ctrl+C` command or **press** `Enter` after it.

### .gitignore is Always Modified

The scripts that copy the seed repo to the content repo (MY-REPO), also update the `.gitignore` file so as to avoid creating unstanged changes with work files that must not be commited. If you keep getting the `.gitignore` checked out, see what the change is with the original and commit to your repo the version that matches what the tool generates.

### Performance

Docker is a resource-intensive tool. If you are not using it on a daily basis, consider preventing it from running on startup. Right click its tray icon > Settings > General, uncheck "Start Docker when you log in". This can save you time when booting up/logging in, but you will need to explicitly start Docker before working on documentation.

Also, it tends to require a lot of HDD space, which may be an issue if you are running it on an SSD drive with limited capacity. You can reduce its quota by opening the Settings dialog > Advanced and either changing the image location, and/or reducing its max size. This also lets you limit its RAM consumption.

### Encoding Problems While Building

When you try to build the documentation site, you could see an error including the following `incomplete "\n" on UTF-16LE` message. It might be caused because of different things. Use the following steps to try to fix or workaround it:

1. Allow [files with long path](https://confluence.atlassian.com/bamkb/git-checkouts-fail-on-windows-with-filename-too-long-error-unable-to-create-file-errors-867363792.html) using the following command:
```bash
git config --system core.longpaths true
```

2. Add the following [System Environment Variables](https://www.linkedin.com/pulse/how-resolve-utf-8-encoding-issue-jenkins-ajuram-salim/)
    * JAVA_TOOL_OPTIONS: -Dfile.encoding=UTF-8
    * LANG: en_GB.UTF-8
3. Modify the `runtimes.rb` file in the execJs gem by changing `UTF-16LE` with `UTF-8` values - [see detailed instructions here](https://stackoverflow.com/questions/25830561/incomplete-n-on-utf-16le-error) or [here](https://stackoverflow.com/questions/12520456/execjsruntimeerror-on-windows-trying-to-follow-rubytutorial). The `runtimes.rb` file is located in `[Ruby Installation folder]\lib\ruby\gems\2.3.0\gems\execjs-2.7.0\lib\execjs`

## Extra Features

You can benefit from the following features:
* [additional config file](#additional-config-file)
* [live sync](#livesync)
* [build without serve](#only-build)
* [build site partially](#build-site-partially)

### Additional Config File

In case you want to add an additional config.yml file, pass it to the above command as follows:
```bash
sh start-docs.sh _silverlight.yml
```
### LiveSync
To be able to monitor the changes you are making on the built documentation, execute the following command in a new terminal in the root directory of the site:
```bash
sh watch.sh
```

> **Prerequisite**: If you haven't yet, please install [Node.js](https://nodejs.org/en/).

### Only Build

To only run `jekyll build` and not `jekyll serve`, you need to execute the following bash command:
```bash
sh build-docs.sh
```

This can be useful if you want to (or already have) setup local IIS to point to the `_site` folder in your documentation repo. This allows you to also test redirects that `jekyll serve` does not support.


### Build Site Partially

If you want to speed up the site's building time, you can pass **only** a specific part(s) of it - the folders you want to include in the site. 

This could be achieved by executing the `sh modify-config.sh` script with passing the corresponding *arguments* which are:

- **-i,--include** - the folders you want to include in the final build. Multiple folders are separated with comma. No spaces are allowed
- **-c,--config** - path to an additional config file which shall be used for the build (see here more about [additional config file](#additional-config-file)
- **-s,--serve** - accepts true/false - indicates whether the Jekyll should only build, or build and serve
- **-d,--docker** - accepts true/false - indicates whether the site shuold be run in Docker (set --docker=true if you're using Docker)


EXAMPLE: Let's say that you want to build only the documentation for 2 controls - Barcode and Chart, you are using Docker and you have an extra config YAML file. Then you have to open a terminal and execute the following:

`sh modify-config.sh --include=controls/barcode,controls/Chart --docker=true --config=_extra.yml`

## Build API Reference

There is infrastructure that uses [DocFx](https://dotnet.github.io/docfx/) to generate an API reference portion of the site for you. To use it, you need the following:

* the docs-seed repo on your build machine. This should already be set up.

* an API ref link in your table of contents on the left. To enable it, add the following line in your `_config.yml` file: 

    **_config.yml**
    
        api_reference_url: "api/"
        
* a folder on a shared network location that the build can access, and that contains the `.dll` and `.xml` files you want generated.

* the assets for building the API reference in your repo. You can start by copying existing assets, for example from Winforms: [https://github.com/telerik/winforms-docs/tree/master/_assetsApi](https://github.com/telerik/winforms-docs/tree/master/_assetsApi). Note that the templates are plain HTML for the time being, so you must keep them in sync with your actual repo code manually - update the footer template with the generated HTML of your own docs, make sure the search template can reach the scripts it needs (can be an issue mostly if you have cache busting enabled in your own repo). Also, update the `index.md` file to have the contents suitable for your case. Keep them updated if you change your own repo as well.

* an `MSBuild` step in your content repo builds that will take the binaries, xml files and content repo, build the HTML files for the API ref, and copy them to the `_site/api` folder in your content repo.

    This build is executed through the [_buildApi/BuildApiReference.proj](https://github.com/telerik/docs-seed/blob/master/_buildApi/BuildApiReference.proj) file. For example, in the VS command prompt: `msbuild.exe BuildApiReference.proj /p:LatestBinariesPath=\\\\someNetworkServer\MySourceFiles;DocsRepoName=blazor-docs;DocumentationBaseUrl=https://docs.telerik.com/blazor-ui;DocsRepoApiAssetsFolder=_assetsApi;HasApiFilter=true`
                
            
    Here is a list of the build parameters and their purpose:
    
    * `LatestBinariesPath` - the path to where you have the `.dll`+`.xml` pairs of code you want documented. The format is usually something like `\\\\someNetworkServer\MySourceFiles` or `C:\work\myFolder`. The escaping of the backslashes is an example for using this as a build parameter.
    
    * `DocsRepoName` - the name of the repo with your actual contents. The build assumes the docs-seed repo and the content repo are in adjacent folders. So, it is, for example just `blazor-docs` or `winforms-docs`, or `teststudio/docs` (when the docs are nested further down in a folder inside your repo).
    
    * `DocumentationBaseUrl` - the base URL of your docs when on the live server. Used for the `sitemap.xml` file. For example, `https://docs.telerik.com/blazor-ui/`.
    
    * `DocsRepoApiAssetsFolder` - this is where the build assets specific to your repo reside (at the time of writing, search, footer templates, feedback form, plus a little of bit of styles). If you copy from an existing repo, this would always be `_assetsApi`.
    
    * `HasApiFilter` - an `optional` parameter in case you want to avoid generating API reference docs for certain classes or their members. See the [DocFx docs on the matter](https://dotnet.github.io/docfx/tutorial/howto_filter_out_unwanted_apis_attributes.html) for syntax and examples. To use this filter, you must add a file in your repo with the desired filter contents, and put it in `<DocsRepoApiAssetsFolder>\filterConfig.yml`. The file is always at the root of the API assets folder, and is always called `filterConfig.yml`. Here's what docfx generate at the time of writing (10 Jul 2019, docfx version 2.40.5):
    
      **C#**

          //GENERATED
          public string publicTest;
          protected string protectedTest;
          protected internal string protectedInternalTest;

          //NOT GENERATED
          private string privateTest;
          internal string internalTest;
          private protected string privateProtectedTest;



