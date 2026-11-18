import { KodinyIframe } from '@cp949/xx-kodiny-iframe';
import { filter, firstValueFrom } from 'rxjs';

export class TeachmPoseIframe {
  private readonly iframeName = 'CODINY_IFRAME_TEACHM_POSE';
  private readonly url: string;
  private static refCount = 0;

  private kodinyIframe?: KodinyIframe;

  constructor(options: { iframeUrl: string }) {
    const { iframeUrl } = options;
    const queryStr = `?iframeToken=${encodeURIComponent(this.iframeName)}`;
    // const frameUrl = url ?? `${datiBaseURL}/d_/iframe/teachm-pose/index.html`
    this.url = iframeUrl + queryStr;
    // this.url = 'http://localhost:9999' + queryStr
  }

  createIfNotExists = () => {
    if (document.querySelector(`#${this.iframeName}`)) {
      return;
    }

    const f = document.createElement('iframe');
    const attrs = {
      name: this.iframeName,
      id: this.iframeName,
      frameborder: 0,
      width: 0,
      height: 0,
      src: this.url,
    };
    Object.entries(attrs).forEach(([key, value]) => {
      f.setAttribute(key, value.toString());
    });
    f.style.border = 'none';
    f.style.width = '0';
    f.style.height = '0';
    document.body.appendChild(f);
    return f;
  };

  private removeIframe = () => {
    const f = document.querySelector(`#${this.iframeName}`);
    if (!f) return;
    f.parentElement?.removeChild(f);
  };

  start = () => {
    TeachmPoseIframe.refCount++;
    this.createIfNotExists();
    const iframeToken = this.iframeName;
    const kodinyIframe = new KodinyIframe(iframeToken, `[id="${iframeToken}"]`);
    kodinyIframe.start();
    this.kodinyIframe = kodinyIframe;
  };

  stop = () => {
    TeachmPoseIframe.refCount--;
    this.kodinyIframe?.stop();
    this.kodinyIframe = undefined;
    if (TeachmPoseIframe.refCount <= 0) {
      this.removeIframe();
    }
  };

  runCmd = async (cmd: string, args?: unknown[]): Promise<any> => {
    this.createIfNotExists();
    const kodinyIframe = this.kodinyIframe;
    if (!kodinyIframe) {
      console.warn('iframe not created');
      return;
    }
    await firstValueFrom(kodinyIframe.observeIframeReady().pipe(filter(Boolean)));
    return kodinyIframe.runCmd(cmd, args);
  };
}
