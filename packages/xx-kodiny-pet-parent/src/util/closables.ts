import { Subject } from 'rxjs';

type WinEventType = keyof WindowEventMap;
type WinEventListener<K extends WinEventType> = (this: Window, ev: WindowEventMap[K]) => any;
type EventOptions = boolean | AddEventListenerOptions;

type DocEventType = keyof DocumentEventMap;

type DocEventListener<K extends DocEventType> = (this: Document, ev: DocumentEventMap[K]) => any;

type ElemEventType = keyof HTMLElementEventMap;
type ElemEventListener<K extends ElemEventType> = (
  this: HTMLElement,
  ev: HTMLElementEventMap[K],
) => any;

/**
 * 해제할 일(리스너 제거, 구독 해제, 자원 닫기)을 모았다가 `close()`에서 한 번에 실행한다.
 * `add*`는 이미 만든 대상을 등록하고, `create*`는 인스턴스를 만들면서 등록한다.
 * `addRx`는 대상의 `unsubscribe()`를 호출한다.
 * `addClose`, `addDispose`, `addDestroy`, `addShutdown`, `addTerminate`는 이름과 같은 메서드를 호출한다.
 */
export class Closables {
  #store = new Set<() => any>();
  #closeTrigger$: Subject<any> | undefined;

  /**
   * `close()`가 호출될 때 알리는 Subject. 처음 접근할 때 만든다.
   * `close()`가 호출되면 비워 두고, 다음 접근에서 새로 만든다.
   */
  get closeTrigger$(): Subject<any> {
    if (!this.#closeTrigger$) {
      this.#closeTrigger$ = new Subject();
    }
    return this.#closeTrigger$;
  }

  /** 해제 함수를 등록한다. */
  add = (...closables: (() => any)[]): this => {
    closables.forEach((it) => {
      this.#store.add(it);
    });
    return this;
  };

  /** 등록한 해제 함수를 뺀다. */
  remove = (...closables: (() => any)[]): this => {
    closables.forEach((it) => {
      this.#store.delete(it);
    });
    return this;
  };

  addRx = (...closables: Array<{ unsubscribe: () => any }>): this => {
    closables.forEach((s) => {
      this.#store.add(() => {
        s.unsubscribe();
      });
    });
    return this;
  };

  /** `addRx`의 다른 이름 */
  addUnsubscribe = this.addRx;

  addClose = (...closables: Array<{ close: () => any }>): this => {
    closables.forEach((s) => {
      this.#store.add(() => {
        s.close();
      });
    });
    return this;
  };

  addDispose = (...closables: Array<{ dispose: () => any }>): this => {
    closables.forEach((s) => {
      this.#store.add(() => {
        s.dispose();
      });
    });
    return this;
  };

  addDestroy = (...closables: Array<{ destroy: () => any }>): this => {
    closables.forEach((s) => {
      this.#store.add(() => {
        s.destroy();
      });
    });
    return this;
  };

  addShutdown = (...closables: Array<{ shutdown: () => any }>): this => {
    closables.forEach((s) => {
      this.#store.add(() => {
        s.shutdown();
      });
    });
    return this;
  };

  addTerminate = (...closables: Array<{ terminate: () => any }>): this => {
    closables.forEach((s) => {
      this.#store.add(() => {
        s.terminate();
      });
    });
    return this;
  };

  addElementListener = <K extends ElemEventType>(
    elem: HTMLElement,
    type: K,
    listener: ElemEventListener<K>,
    options?: EventOptions,
  ): this => {
    elem.addEventListener(type, listener, options);
    this.#store.add(() => {
      elem.removeEventListener(type, listener, options);
    });
    return this;
  };

  addDocumentListener = <K extends DocEventType>(
    type: K,
    listener: DocEventListener<K>,
    options?: EventOptions,
  ): this => {
    document.addEventListener(type, listener, options);
    this.#store.add(() => {
      document.removeEventListener(type, listener, options);
    });
    return this;
  };

  addWindowListener = <K extends WinEventType>(
    type: K,
    listener: WinEventListener<K>,
    options?: EventOptions,
  ): this => {
    window.addEventListener(type, listener, options);
    this.#store.add(() => {
      window.removeEventListener(type, listener, options);
    });
    return this;
  };

  /** 등록된 해제 함수 개수 */
  get count() {
    return this.#store.size;
  }

  /**
   * `closeTrigger$`에 알린 뒤 등록된 함수를 모두 실행하고 비운다.
   * 여러 번 호출해도 등록된 함수는 한 번만 실행된다.
   */
  close = () => {
    if (this.#closeTrigger$) {
      this.#closeTrigger$.next(1);
      this.#closeTrigger$ = undefined;
    }

    if (this.#store.size > 0) {
      Array.from(this.#store).forEach((fn) => {
        fn();
      });
      this.#store.clear();
    }
  };

  static create = (...closables: (() => any)[]) => {
    const c = new Closables();
    c.add(...closables);
    return c;
  };

  static createWindowListener = <K extends WinEventType>(
    type: K,
    listener: WinEventListener<K>,
    options?: EventOptions,
  ) => {
    const c = new Closables();
    c.addWindowListener(type, listener, options);
    return c;
  };

  static createDocumentListener = <K extends DocEventType>(
    type: K,
    listener: DocEventListener<K>,
    options?: EventOptions,
  ) => {
    const c = new Closables();
    c.addDocumentListener(type, listener, options);
    return c;
  };

  static createElementListener = <K extends ElemEventType>(
    elem: HTMLElement,
    type: K,
    listener: ElemEventListener<K>,
    options?: EventOptions,
  ) => {
    const c = new Closables();
    c.addElementListener(elem, type, listener, options);
    return c;
  };

  static createRx = (...closables: { unsubscribe: () => any }[]) => {
    const c = new Closables();
    c.addRx(...closables);
    return c;
  };

  static createClose = (...closables: { close: () => any }[]) => {
    const c = new Closables();
    c.addClose(...closables);
    return c;
  };

  static createTerminate = (...closables: { terminate: () => any }[]) => {
    const c = new Closables();
    c.addTerminate(...closables);
    return c;
  };

  static createShutdown = (...closables: { shutdown: () => any }[]) => {
    const c = new Closables();
    c.addShutdown(...closables);
    return c;
  };

  static createDestroy = (...closables: { destroy: () => any }[]) => {
    const c = new Closables();
    c.addDestroy(...closables);
    return c;
  };

  static createDispose = (...closables: { dispose: () => any }[]) => {
    const c = new Closables();
    c.addDispose(...closables);
    return c;
  };
}
