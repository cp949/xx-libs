import type { IMakerAddon } from '@cp949/xx-maker-interface';
import { TeachmAudioIframe } from './TeachmAudioIframe.js';

/**
 * 티처블 머신 오디오 애드온
 * 마이크 권한을 얻기 위해, 터치 제스처가 필요하여
 * 사용자가 불편하므로 사용되지는 않습니다.
 */
export class TeachmAudioAddon implements IMakerAddon {
  private iframeUrl: string;
  private iframe_?: TeachmAudioIframe;
  private started_ = false;

  constructor(config: {
    teachmAudio: {
      iframeUrl: string;
    };
  }) {
    this.iframeUrl = config.teachmAudio.iframeUrl;
  }

  get iframe(): TeachmAudioIframe {
    if (this.iframe_) {
      return this.iframe_;
    }
    this.iframe_ = new TeachmAudioIframe({ iframeUrl: this.iframeUrl });
    return this.iframe_;
  }

  onAddonInit = (args: any) => {
    console.log('TeachmAudioAddon.onAddonInit()', args);
  };

  onAddonDestroy = () => {
    console.log('TeachmAudioAddon.onAddonDestroy()');
    if (this.started_) {
      this.started_ = false;
      this.iframe_?.stop();
      this.iframe_ = undefined;
    }
  };

  private ensureIframeStart = (): TeachmAudioIframe => {
    const iframe = this.iframe;
    if (!this.started_) {
      this.started_ = true;
      iframe.start();
    }
    return iframe;
  };

  loadModel = async (modelUrl: string): Promise<void> => {
    const iframe = this.ensureIframeStart();
    const args = [modelUrl];
    await iframe.runCmd('loadModel', args);
  };

  hasModel = async (modelUrl: string): Promise<boolean> => {
    const iframe = this.ensureIframeStart();
    const args = [modelUrl];
    return await iframe.runCmd('hasModel', args);
  };

  stopListening = async (modelUrl: string): Promise<void> => {
    if (!this.started_) {
      return;
    }
    const iframe = this.ensureIframeStart();
    const args = [modelUrl];
    return await iframe.runCmd('stopListening', args);
  };

  startListen = async (
    modelUrl: string,
  ): Promise<{
    classLabel: string;
    score: number;
  }> => {
    await this.loadModel(modelUrl);
    const iframe = this.ensureIframeStart();
    const args = [modelUrl];
    const result = await iframe.runCmd('startListen', args);
    return result as {
      classLabel: string;
      score: number;
    };
  };

  wordLabels = async (modelUrl: string): Promise<string[]> => {
    await this.loadModel(modelUrl);
    const iframe = this.ensureIframeStart();
    const args = [modelUrl];
    const result = await iframe.runCmd('wordLabels', args);
    return result as string[];
  };
}
