import { HttpGenerativeVideoProvider } from "./httpVideoProvider";

export class WanVideoProvider extends HttpGenerativeVideoProvider {
  constructor(baseUrl: string | undefined) {
    super(baseUrl, "wan-video");
  }
}
