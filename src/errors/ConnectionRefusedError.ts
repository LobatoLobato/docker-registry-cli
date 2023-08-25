export class ConnectionRefusedError extends Error {
  constructor(address: string) {
    super();
    this.name = "ConnectionRefusedError";
    this.message = "Connection to the registry was refused\n";
    this.message += "Try changing the address in your configuration.\n";
    this.message += `Current address: ${address}`;
  }
}
