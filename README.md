# docs-seed repo
Contains the documentation site implementation.

- [Local Setup :computer:](#local-setup)


## Local Setup
This section describes the best practices about what and how should be done in order to run the documentation locally.

### Prerequisites
- Install Docker (Community Edititon(CE) is enough) - please use the [official Docker installation](https://docs.docker.com/install/) guide.

### Instructions
- Clone the current repo 
```bash
git clone git@github.com:telerik/docs-seed.git
```

- Then clone the repo which shall populate the site's content (e.g. the XAML documentation) in the root folder (basically, this is is the folder in which you've cloned the **docs-seed** repo.
- Open a terminal of your choice (e.g. gitBash) and execute the following bash command in the root folder again (where the **Dockerfile** is located)
```bash
sh start-docs.sh
```

- This is it! You can find the documentation site on server address which is written in the terminal: *http://0.0.0.0:4000/*. If you can't open the previous URL, replace the '0.0.0.0' with 'localhost' - *http://localhost:4000*. 
> For example, for WPF documentation this would be: http://0.0.0.0:4000/devtools/wpf/

> If you want to stop the web site and the container in which it has been served, navigate to the terminal in which you've executed the previous command and press 'CTRL+C'.

#### LiveSync
To be able to monitor the changes you are making on the built documentation, execute the following command in a new terminal in the root directory of the site:
```bash
sh watch.sh
```

> **Prerequisite**: If you haven't yet, please install [Node.js](https://nodejs.org/en/).
