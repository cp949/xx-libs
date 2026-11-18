import type { IMakerAddon } from '@cp949/xx-maker-interface';
import { TeachmPoseIframe } from './TeachmPoseIframe.js';

export class TeachmPoseAddon implements IMakerAddon {
  private iframeUrl: string;
  private iframe_?: TeachmPoseIframe;
  private started_ = false;

  constructor(config: {
    teachmPose: {
      iframeUrl: string;
    };
  }) {
    this.iframeUrl = config.teachmPose.iframeUrl;
  }

  get iframe(): TeachmPoseIframe {
    if (this.iframe_) {
      return this.iframe_;
    }
    this.iframe_ = new TeachmPoseIframe({ iframeUrl: this.iframeUrl });
    return this.iframe_;
  }

  onAddonInit = (args: any) => {
    console.log('TeachmPoseAddon.onAddonInit()', args);
  };

  onAddonDestroy = () => {
    console.log('TeachmPoseAddon.onAddonDestroy()');
    if (this.started_) {
      this.started_ = false;
      this.iframe_?.stop();
      this.iframe_ = undefined;
    }
  };

  private ensureIframeStart = (): TeachmPoseIframe => {
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

  predict = async (
    modelUrl: string,
    imageDataUrl: string,
  ): Promise<{
    classLabel: string;
    score: number;
  }> => {
    await this.loadModel(modelUrl);
    const iframe = this.ensureIframeStart();
    const args = [modelUrl, imageDataUrl];
    const result = await iframe.runCmd('predict', args);
    return result as {
      classLabel: string;
      score: number;
    };
  };

  getClassLabels = async (modelUrl: string): Promise<string[]> => {
    await this.loadModel(modelUrl);
    const iframe = this.ensureIframeStart();
    const args = [modelUrl];
    const result = await iframe.runCmd('getClassLabels', args);
    return result as string[];
  };
}
