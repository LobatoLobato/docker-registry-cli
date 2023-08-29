# DockerRegistryCLI

> This is a cli application powered by NodeJS that provides easier interaction with a private docker registry.

## Table of contents

- [General Info](#general-information)
- [Setup](#setup)
- [Usage](#usage)
- [Project Status](#project-status)
- [Room for Improvement](#room-for-improvement)
* [Credits](#credits)

## General Information

This project aims to facilitate the interaction between a developer and a private docker registry by abstracting the Registry V2 HTTP API into simple single-line easy commands.

It uses both the docker engine, to build and push images, and the Registry V2 HTTP API, for the listing and removal of images.

## Setup

Install [docker]($https://docs.docker.com/engine/install/) if not already installed.  
Install the application globally using npm:

```shell
$ npm install -g @lobatolobato/docker-registry-cli
```

Then run it with:

```shell
$ docker-registry-cli
```

## Usage

The application provides the following commands to interact with the registry:

- [list](#list)
- [push](#push)
- [remove](#remove)
- [config](#config)
- [test_connection](#testconnection)
- [gui](#gui)
  - [list](#gui-list)
  - [push](#gui-push)
  - [remove](#gui-remove)
  - [config](#gui-config)
  - [test_connection](#gui-test-connection)

All of which can be run [with](#gui) or [without](#no-gui) a "GUI".

### NO GUI (Currently not implemented)

> - ### list
>
>   Lists repositories in the registry.
>
>   ```shell
>   # Lists all repositories in the registry
>   $ docker-registry-cli list
>
>   # Lists a specific repository in the registry
>   $ docker-registry-cli list --repo "repo_name"
>   ```
>
> - ### push
>
>   Pushes a new image into the registry.
>
>   ```shell
>   # Pushes an already built image to the registry
>   $ docker-registry-cli push imageName:tag
>
>   # Builds the image from the provided Dockerfile and pushes it to the registry
>   $ docker-registry-cli push imageName:tag --dockerfile "path/to/dockerfile"
>
>   # Builds the image from the provided git repository and pushes it to the registry
>   $ docker-registry-cli push imageName:tag --git "https://github.com/user/repository"
>   ```
>
> - ### remove
>
>   Removes or untags an image from the registry.
>
>   ```shell
>   # Removes or, if other tags reference it, untags an image from the registry
>   $ docker-registry-cli remove image:tag
>
>   # Removes an image and all tags related to it
>   $ docker-registry-cli remove image:tag --purge
>   ```
>
> - ### config
>
>   Gets or modifies the application's configuration
>
>   ```shell
>   # Gets the current configuration
>   $ docker-registry-cli config
>
>   # Sets the value of a field in the configuration
>   $ docker-registry-cli config --field "field" --value "value"
>
>   # Sets the value of a subfield in the configuration
>   $ docker-registry-cli config --field "field.subfield" --value "value"
>   ```
>
>   Fields:
>
>   - **registry_url**: The url where the registry is located at. E.g.: http://localhost:5000
>   - **git_credentials**: Your GitHub, GitLab, etc., credentials. Used for authentication when pushing images directly from git remote repositories.
>     - **username**: Your username
>     - **access_token**: Your access token or password
>
> - ### testconnection
>
>   Tests if the application can connect to the configured registry url.
>
>   ```shell
>   $ docker-registry-cli testconnection
>   ```

### GUI

> To enter a gui-like mode run:
>
> ```shell
> $ docker-registry-cli gui
> ```
>
> - <h3 id="gui-list">List</h3>
>
>   Lists repositories in the registry.
>
>   ##### Demo:
>
>   ![](/demos/list-demo.gif)
>
> - <h3 id="gui-push">Push</h3>
>
>   Pushes a new image into the registry.
>
>   #### Demos:
>
>   ##### From local built image:
>
>   ![](/demos/push-local-demo.gif)
>
>   ##### From dockerfile:
>
>   ![](/demos/push-dockerfile-demo.gif)
>
>   ##### From a git repository:
>
>   ![](/demos/push-git-demo.gif)
>
> - <h3 id="gui-remove">Remove</h3>
>
>   Removes or untags an image from the registry.
>
>   #### Demos:
>
>   ##### Only the specified tag:
>
>   ![](/demos/remove-single-demo.gif)
>
>   ##### The specified tag and all related tags:
>
>   ![](/demos/remove-allrelated-demo.gif)
>
> - <h3 id="gui-remove">Config</h3>
>
>   Shows a prompt for editing the application's configuration
>
>   Fields:
>
>   - **registry_url**: The url where the registry is located at. E.g.: http://localhost:5000
>   - **git_credentials**: Your GitHub, GitLab, etc., credentials. Used for authentication when pushing images directly from git remote repositories.
>     - **username**: Your username
>     - **access_token**: Your access token or password
>
>   #### Demo:
>
>   ![](/demos/config-demo.gif)
>
> - <h3 id="gui-test-connection">Test Connection</h3>
>
>   Tests if the application can connect to the configured registry url.
>
>   #### Demo:
>
>   ![](/demos/test-connection-demo.gif)

## Project Status

Project is: _in progress_

## Room for Improvement

Room for improvement:

- Application could be improved by reducing dependence on the docker engine

To do:

- Add "No GUI" commands
- Add Minimal GUI mode
- Add tests

## Credits

- [Felipe Ribeiro Lobato](https://github.com/lobatolobato)
