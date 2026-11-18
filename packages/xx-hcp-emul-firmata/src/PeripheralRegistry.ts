import { BehaviorSubject, Observable, distinctUntilChanged, filter, map } from 'rxjs';

export class PeripheralRegistry {
  private store$ = new BehaviorSubject<Record<string, 'pending' | 'active'>>({});

  exists = (key: string) => {
    return !!this.store$.value[key];
  };

  add = (key: string) => {
    const old = this.store$.value;
    if (!old[key]) {
      this.store$.next({ ...old, [key]: 'pending' });
    }
  };

  isActive = (key: string) => {
    return this.store$.value[key] === 'active';
  };

  isPending = (key: string) => {
    return this.store$.value[key] === 'pending';
  };

  updateActive = (key: string) => {
    const old = this.store$.value;
    this.store$.next({ ...old, [key]: 'active' });
  };

  observePeriState = (key: string): Observable<'pending' | 'active'> => {
    return this.store$.pipe(
      filter((it) => !!it[key]),
      map((it) => it[key]),
      distinctUntilChanged(),
    );
  };

  observeActive = (key: string): Observable<boolean> => {
    return this.observePeriState(key).pipe(map((it) => it === 'active'));
  };
}
