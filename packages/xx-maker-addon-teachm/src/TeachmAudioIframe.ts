import { KodinyIframe } from '@cp949/xx-kodiny-iframe';
import { filter, firstValueFrom } from 'rxjs';

/**
 * 티처블 머신 오디오 iframe
 * 마이크 권한을 얻기 위해, 터치 제스처가 필요하여
 * 사용자가 불편하므로 사용되지는 않습니다.
 */
export class TeachmAudioIframe {
  private readonly iframeName = 'CODINY_IFRAME_TEACHM_AUDIO';
  private readonly url: string;
  private static refCount = 0;

  private kodinyIframe?: KodinyIframe;

  constructor(options: { iframeUrl: string }) {
    const { iframeUrl } = options;
    const queryStr = `?iframeToken=${encodeURIComponent(this.iframeName)}`;
    // const frameUrl = url ?? `${datiBaseURL}/d_/iframe/teachm-audio/index.html`
    this.url = iframeUrl + queryStr;
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
      allow: 'microphone',
    };
    Object.entries(attrs).forEach(([key, value]) => {
      f.setAttribute(key, value.toString());
    });
    // f.style.position = 'absolute'
    // f.style.top = '100px'
    // f.style.left = '100px'
    // f.style.border = 'none'
    // f.style.width = '300px'
    // f.style.height = '300px'
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
    TeachmAudioIframe.refCount++;
    this.createIfNotExists();
    const iframeToken = this.iframeName;
    const kodinyIframe = new KodinyIframe(iframeToken, `[id="${iframeToken}"]`);
    kodinyIframe.start();
    this.kodinyIframe = kodinyIframe;
  };

  stop = () => {
    TeachmAudioIframe.refCount--;
    this.kodinyIframe?.stop();
    this.kodinyIframe = undefined;
    if (TeachmAudioIframe.refCount <= 0) {
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
