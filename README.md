# docs-seed repo
Contains the documentation site implementation.

- [Local Setup :computer:](#local-setup)
- [Troubleshooting :hankey:](#troubleshooting)
- [Extra Features :moneybag:](#extra-features)

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
- Install Ruby DevKit ([64bit](https://dl.bintray.com/oneclick/rubyinstaller/DevKit-mingw64-64-4.7.2-20130224-1432-sfx.exe) or [32bit](https://dl.bintray.com/oneclick/rubyinstaller/DevKit-mingw64-32-4.7.2-20130224-1151-sfx.exe))
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
