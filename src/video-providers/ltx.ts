import { HttpGenerativeVideoProvider } from "./httpVideoProvider";

export class LTXVideoProvider extends HttpGenerativeVideoProvider {
  constructor(baseUrl: string | undefined) {
    super(baseUrl, "ltx-video");
  }
}
