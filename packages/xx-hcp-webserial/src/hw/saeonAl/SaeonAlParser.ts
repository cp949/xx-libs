import { Observable } from 'rxjs';
import { SaeonAltinoLiteParser } from '../saeonAltinoLite/SaeonAltinoLiteParser';

type TransformFn = (upstream: Observable<Uint8Array>) => Observable<Uint8Array>;

/**
 * SaeonAl파서는 SaeonAltinoLiteParser를 이용합니다.
 * 지정된 패킷 크기의 시작/종료 마크를 찾아서 패킷을 전송합니다.
 * Transform 클래스를 상속합니다
 */
export class SaeonAlParser {
  static parse = (): TransformFn => {
    return (upstream: Observable<Uint8Array>) => {
      return new Observable((subscriber) => {
        const handleParsedResult = (chunk: Uint8Array) => {
          if (!subscriber.closed && chunk.length > 0) {
            subscriber.next(chunk);
          }
        };
        const parser = new SaeonAltinoLiteParser(
          {
            startMark: 0x02, // 시작 마크
            endMark: 0x03, // 종료 마크
            packetLength: 56, // 56바이트를 채워서 보냅니다
          },
          handleParsedResult,
        );
        const subscription = upstream.subscribe({
          next: parser.enqueue,
          error: subscriber.error,
          complete: subscriber.complete,
        });

        return () => {
          subscription.unsubscribe();
        };
      });
    };
  };
}
