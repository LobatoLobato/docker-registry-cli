
export class DockerUnavailableError extends Error {
  constructor() {
    super();
    this.name = "DockerUnavailableError";
    this.message = "The Docker Engine is needed to push and remove images\n";
    this.message += "Please make sure the Docker Engine is installed, running\n";
    this.message += 'and that the "docker" command is available anywhere in your environment\n';
    this.message += "See: https://docs.docker.com/engine/install/"
  }
}