// FirmataPlotDialogEvent(모듈 전역 Subject)와 FirmataManager.plot의 계약을 고정하는 특성화 테스트.
// vitest의 node 환경에서 실행한다.
// 두 Subject와 genId의 seq는 모듈 상태다. 테스트끼리 간섭하지 않도록 구독은 매번 해제하고,
// requestId는 값이 아니라 이 테스트가 받은 값으로만 비교한다.
import { Subscription, firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FirmataManager, FirmataPlotDialogEvent } from '../src/index.js';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const subscriptions: Subscription[] = [];

/** observeOpenRequest를 구독해 이 테스트가 연 요청을 모은다. 구독은 afterEach에서 해제한다. */
function collectRequests() {
  const requests: Array<{ requestId: string; periId: string; eventName: string }> = [];
  subscriptions.push(
    FirmataPlotDialogEvent.observeOpenRequest().subscribe((it) => requests.push(it)),
  );
  return requests;
}

beforeEach(() => {
  vi.spyOn(console, 'debug').mockImplementation(() => {});
});

afterEach(() => {
  subscriptions.splice(0).forEach((it) => it.unsubscribe());
  vi.restoreAllMocks();
});

describe('FirmataPlotDialogEvent', () => {
  it('open은 요청을 즉시 내보내고 requestId를 돌려준다. requestId는 호출마다 다르다', () => {
    const requests = collectRequests();

    const first = FirmataPlotDialogEvent.open('sensor:1', 'onChange');
    const second = FirmataPlotDialogEvent.open('sensor:1', 'onChange');

    expect(requests).toEqual([
      { requestId: first, periId: 'sensor:1', eventName: 'onChange' },
      { requestId: second, periId: 'sensor:1', eventName: 'onChange' },
    ]);
    expect(first).toMatch(/^FirmataPlotDialogEvent_\d{8}_\d+$/);
    expect(first).not.toBe(second);
  });

  it('openAndWaitForClosing은 같은 requestId의 onCloseDialog에만 끝난다', async () => {
    const requests = collectRequests();
    const closing = firstValueFrom(FirmataPlotDialogEvent.openAndWaitForClosing('a', 'e'));
    const other = firstValueFrom(FirmataPlotDialogEvent.openAndWaitForClosing('b', 'e'));
    let closed = false;
    void closing.then(() => (closed = true));
    const [mine, others] = requests;

    FirmataPlotDialogEvent.onCloseDialog(others.requestId);
    await flush();
    expect(closed).toBe(false);

    FirmataPlotDialogEvent.onCloseDialog(mine.requestId);
    await expect(closing).resolves.toEqual({ success: true, requestId: mine.requestId });
    // 남은 구독이 테스트 뒤로 새지 않도록 닫는다.
    FirmataPlotDialogEvent.onCloseDialog(others.requestId);
    await other;
  });

  it('구독하기 전에 onCloseDialog가 불리면 그 응답은 받지 못한다', async () => {
    const requests = collectRequests();
    const waiting = FirmataPlotDialogEvent.openAndWaitForClosing('a', 'e');
    FirmataPlotDialogEvent.onCloseDialog(requests[0].requestId);

    let closed = false;
    subscriptions.push(waiting.subscribe(() => (closed = true)));
    await flush();

    expect(closed).toBe(false);
  });
});

describe('FirmataManager.plot', () => {
  it('열기 요청을 내보내고, 다이얼로그가 닫히면 끝난다', async () => {
    const requests = collectRequests();
    let done = false;

    const plotting = new FirmataManager().plot({}, 'sensor:1', 'onChange').then(() => {
      done = true;
    });
    await flush();
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ periId: 'sensor:1', eventName: 'onChange' });
    expect(done).toBe(false);

    FirmataPlotDialogEvent.onCloseDialog(requests[0].requestId);
    await plotting;
    expect(done).toBe(true);
  });

  it('요청을 받은 쪽이 같은 호출 안에서 바로 닫으면 응답을 놓쳐 끝나지 않는다', async () => {
    // open이 요청을 내보내는 순간 응답 구독은 아직 없다. 동기로 닫으면 응답이 사라진다.
    subscriptions.push(
      FirmataPlotDialogEvent.observeOpenRequest().subscribe((it) =>
        FirmataPlotDialogEvent.onCloseDialog(it.requestId),
      ),
    );
    let done = false;

    void new FirmataManager().plot({}, 'sensor:1', 'onChange').then(() => {
      done = true;
    });
    await flush();

    expect(done).toBe(false);
  });

  it('다이얼로그 열기가 실패하면 오류를 삼키고 정상 종료한다', async () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(FirmataPlotDialogEvent, 'openAndWaitForClosing').mockImplementation(() => {
      throw new Error('열기 실패');
    });

    await expect(new FirmataManager().plot({}, 'sensor:1', 'onChange')).resolves.toBeUndefined();

    expect(debug).toHaveBeenCalledWith('PLOT 실패:', '열기 실패');
  });
});
