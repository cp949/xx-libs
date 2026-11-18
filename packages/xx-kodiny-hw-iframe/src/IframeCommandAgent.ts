import type { CmdRequest, IParentSender, IRequestHandlerProto } from './types.js';

function errmsg(err: any): string {
  if (err['message']) {
    return err['message'] as string;
  }
  return err.toString();
}

function isValidFrame(data: any) {
  if (!data) return false;
  const type = data['type'];

  if (typeof type !== 'string') {
    console.log('[C] unknown message', data);
    return false;
  }
  return true;
}

export class IframeCommandAgent {
  constructor(
    private readonly fromParent: IRequestHandlerProto,
    private readonly toParent: IParentSender,
  ) {
    // empty
  }

  static setup = (
    fromParent: IRequestHandlerProto,
    toParent: IParentSender,
  ): IframeCommandAgent => {
    return new IframeCommandAgent(fromParent, toParent);
  };

  handleMessageEvent = async (event: MessageEvent<unknown>) => {
    console.log('[C] message received', event);
    if (!isValidFrame(event.data)) {
      console.log('[C] unknown message', event.data);
      return;
    }

    const { type, requestId, cmd, args = [] } = event.data as CmdRequest;

    const cmdFunction = (this.fromParent as any)[cmd];
    if (typeof cmdFunction !== 'function') {
      console.log('cmd=', cmd, 'type=', typeof cmdFunction);
      console.log('[C] commander cannot handle command', cmd);
      return;
    }

    try {
      // call command function
      const result = await cmdFunction.apply(this.fromParent, args as []);
      this.toParent.success({
        success: true,
        requestId,
        type,
        cmd,
        value: result,
      });
    } catch (err) {
      this.toParent.error({
        requestId,
        type,
        success: false,
        errorCode: 'unknown',
        message: errmsg(err),
      });
    }
  };
}
