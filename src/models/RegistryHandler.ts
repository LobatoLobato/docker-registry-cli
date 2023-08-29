import { docker, git } from "@cli";
import { TEMP_PATH } from "@paths";
import { asyncWrap } from "@util";
import axios, { AxiosResponse, AxiosResponseHeaders } from "axios";
import fs, { rmSync } from "node:fs";
import path from "node:path";
import { ConnectionRefusedError } from "../errors/ConnectionRefusedError";
import stream from "node:stream";

export interface RegistryHandlerConfig {
  registryAddress: string;
  gitCredentials: {
    username: string;
    accessToken: string;
  };
  stream?: stream.Writable;
  verboseStream?: stream.Writable;
}
export interface InternalRegistryHandlerConfig extends RegistryHandlerConfig {
  registryVersion: string;
}

interface RegistryResponseHeaders extends AxiosResponseHeaders {
  "docker-distribution-api-version": string;
  "www-authenticate": string;
}
interface RegistryResponse extends AxiosResponse {
  headers: RegistryResponseHeaders;
  data: never;
}
interface ManifestResponse extends RegistryResponse {
  headers: RegistryResponseHeaders & {
    "docker-content-digest": string;
  };
  data: never;
}

export class RegistryHandler {
  public readonly registryAddress: string = "";
  public readonly registryAddressNoProtocol: string = "";
  public readonly registryVersion: string = "";
  private readonly headers = {
    ManifestAccept: "application/vnd.docker.distribution.manifest.v2+json",
  };
  private readonly stream: stream.Writable | undefined;
  private readonly verboseStream: stream.Writable | undefined;
  private constructor(config: InternalRegistryHandlerConfig) {
    const { registryAddress } = config;
    Object.assign(this, config);
    this.registryAddressNoProtocol = registryAddress.replace(/https?:\/\//, "");
  }

  public static async createHandler(config: RegistryHandlerConfig) {
    const { registryAddress } = config;
    const registryVersion = await this.getRegistryVersion(registryAddress);

    return new RegistryHandler({
      ...config,
      registryVersion,
    });
  }

  public async getImageList(): Promise<{ name: string; tags: string[] }[]> {
    const catalogResponse = await axios.get(this.createCatalogUrl());
    const imageNames = catalogResponse.data.repositories;

    const imageList: { name: string; tags: string[] }[] = [];
    for (const name of imageNames) {
      const tags = await this.getTagList(name);

      if (!tags) continue;

      imageList.push({ name, tags });
    }

    return imageList;
  }

  public async pushImage(
    taggedImage: string,
    options?: { gitUrl?: string; dockerfilePath?: string }
  ) {
    const tempPath = path.join(TEMP_PATH, "build");
    const scopedTaggedImage = this.appendAddress(taggedImage, true);

    if (!options?.gitUrl && !options?.dockerfilePath) {
      this.stream?.write(`[Pushing ${taggedImage}]`);
      await docker.tag(taggedImage, scopedTaggedImage);
      const pushResult = await docker.push(scopedTaggedImage, {
        stream: this.verboseStream,
      });
      await docker.rmi(scopedTaggedImage);

      this.stream?.write(`[Successfully pushed ${taggedImage}]`);

      return pushResult;
    }
    const { gitUrl, dockerfilePath } = options;

    if (gitUrl) {
      this.stream?.write(`[Cloning ${gitUrl}]`);
      await git.clone(gitUrl, tempPath);
      this.stream?.write(`[Successfully cloned ${gitUrl}]\n`);

      this.stream?.write(`[Building ${taggedImage}]`);
      await docker.build(scopedTaggedImage, tempPath, {
        stream: this.verboseStream,
      });
      this.stream?.write(`[Successfully built ${taggedImage}]\n`);
    }

    if (dockerfilePath) {
      this.stream?.write(`[Building ${taggedImage}]`);
      await docker.build(scopedTaggedImage, dockerfilePath, {
        stream: this.verboseStream,
      });
      this.stream?.write(`[Successfully built ${taggedImage}]\n`);
    }

    this.stream?.write(`[Pushing ${taggedImage}]`);
    const pushResult = await docker.push(scopedTaggedImage, {
      stream: this.verboseStream,
    });
    this.stream?.write(`[Successfully pushed ${taggedImage}]\n`);
    await docker.rmi(scopedTaggedImage);

    fs.rmSync(tempPath, { recursive: true, force: true });

    return pushResult;
  }

  public async removeImage(taggedImage: string): Promise<void> {
    const [imageName, imageTag] = this.extractNameAndTag(taggedImage);
    const references = await this.getReferences(taggedImage);
    const imageDigest = references?.find(({ tag }) => tag === imageTag)?.digest;

    // If image:tag does not exist throw an error
    if (!imageDigest) {
      const error = new Error();
      error.name = `NOT FOUND`;
      error.message = `Image ${taggedImage} is not on this registry`;

      throw error;
    }

    // If image:tag exists, but other tags reference it, untag it
    if (references.length > 1) {
      this.stream?.write(`[Untagging ${taggedImage}]`);
      await this.untagImage(taggedImage);
      this.stream?.write(`[Successfully untagged ${taggedImage}]`);
      return;
    }

    // If image:tag exists and no other tags reference it, remove it
    this.stream?.write(`[Deleting ${taggedImage}]`);
    await this.deleteImage(imageName, imageDigest);
    this.stream?.write(`[Successfully deleted ${taggedImage}]`);
    return;
  }

  private async untagImage(taggedImage: string): Promise<void> {
    const tempPath = path.join(TEMP_PATH, "untag");
    const [imageName] = this.extractNameAndTag(taggedImage);
    const scopedTaggedImage = this.appendAddress(taggedImage, true);

    this.stream?.write(` [Building dummy image]`);
    await docker.build(scopedTaggedImage, tempPath, {
      dummy: true,
      stream: this.verboseStream,
    });
    this.stream?.write(` [Successfully built dummy image]`);

    rmSync(tempPath, {
      recursive: true,
      force: true,
      retryDelay: 100,
      maxRetries: 20,
    });

    this.stream?.write(` [Pushing dummy image]`);
    const pushResult = await docker.push(scopedTaggedImage, {
      stream: this.verboseStream,
    });
    this.stream?.write(` [Successfully pushed dummy image]`);

    this.stream?.write(` [Untagging ${taggedImage}]`);
    await docker.rmi(scopedTaggedImage);

    await this.deleteImage(imageName, pushResult.digest);
  }

  private async deleteImage(imageName: string, digest: string): Promise<void> {
    const url = this.createManifestUrl(imageName, digest);
    try {
      await axios.delete(url);
    } catch (err) {
      console.log(err);
    }
  }

  private static async getRegistryVersion(
    registryAddress: string
  ): Promise<string> {
    const url = `${registryAddress}/v2/`;
    const [response, error] = await asyncWrap<RegistryResponse>(axios.get(url));

    if (error) {
      if (error.message.includes("ECONNREFUSED")) {
        throw new ConnectionRefusedError(registryAddress);
      }
      throw error;
    }

    const { headers, status } = response;
    if (status === 401) {
      const authError = new Error("Authentication failed.");
      authError.message = headers["www-authenticate"];
      throw authError;
    }

    return headers["docker-distribution-api-version"];
  }

  private extractNameAndTag(imageNameWithTag: string): [string, string] {
    const name = imageNameWithTag.replace(/:[^:]+$/, "");
    const tag = imageNameWithTag.replace(/.+:/, "");

    return [name, tag];
  }

  private async getDigest(
    imageName: string,
    imageTag: string
  ): Promise<string | null> {
    try {
      let url = this.createManifestUrl(imageName, imageTag);
      const response: ManifestResponse = await axios.get(url, {
        headers: { Accept: this.headers.ManifestAccept },
      });
      if (response.status === 200) {
        return response.headers["docker-content-digest"];
      }
    } catch (err) {}

    return null;
  }

  private async getReferences(
    taggedImage: string
  ): Promise<{ tag: string; digest: string }[] | null> {
    const [imageName, imageTag] = this.extractNameAndTag(taggedImage);
    const tagList = await this.getTagList(imageName);

    if (!tagList) return null;

    const digest = await this.getDigest(imageName, imageTag);

    if (!digest) return null;

    const references: { tag: string; digest: string }[] = [];

    for (const tag of tagList) {
      const refDigest = await this.getDigest(imageName, tag);
      if (refDigest !== digest) continue;
      references.push({ tag, digest: refDigest });
    }

    return references;
  }
  private async getTagList(imageName: string): Promise<string[] | null> {
    const tagListUrl = this.createTagListUrl(imageName);
    const tagListResponse = await axios.get(tagListUrl);
    const tagList: string[] | null = tagListResponse.data.tags;

    return tagList?.sort((a, b) => b.length - a.length) ?? null;
  }
  private appendAddress(imageWithTag: string, noProtocol?: boolean): string {
    const address = noProtocol
      ? this.registryAddress.replace(/https?:\/\//, "")
      : this.registryAddress;
    return `${address}/${imageWithTag}`;
  }

  private createCatalogUrl(): string {
    return `${this.registryAddress}/v2/_catalog`;
  }

  private createManifestUrl(
    imageName: string,
    imageTagOrDigest: string
  ): string {
    return `${this.registryAddress}/v2/${imageName}/manifests/${imageTagOrDigest}`;
  }

  private createTagListUrl(imageName: string): string {
    return `${this.registryAddress}/v2/${imageName}/tags/list`;
  }
}
