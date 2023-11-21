import { BehaviorSubject, filter, map, Observable, of, Subject } from 'rxjs'
import { concatMap, delay, tap } from 'rxjs/operators'
import { EchoDirService } from './echo-dir-service'

export type SmartCacheLoadConfig = {
  key: string
  maxStaleMs?: number,
  maxAgeMs?: number
}

export type SmartCacheBaseEvent = {
  key: string
  timestampMs: number
}

export type SmartCacheResultEvent<T> = SmartCacheBaseEvent & {
  type: 'result'
  result: T | null | undefined
}

export type SmartCacheQueuedEvent = SmartCacheBaseEvent & {
  type: 'queued'
}

export type SmartCacheLoadingEvent = SmartCacheBaseEvent & {
  type: 'loading'
}

export type SmartCacheErrorEvent = SmartCacheBaseEvent & {
  type: 'error'
  error: any
}

export type SmartCacheRateLimitEvent = SmartCacheBaseEvent & {
  type: 'rate-limit'
  limitExpiresMs: number
}

export type SmartCacheStatusEvent =
  | SmartCacheLoadingEvent
  | SmartCacheErrorEvent
  | SmartCacheRateLimitEvent
  | SmartCacheQueuedEvent

export type SmartCacheEvent<T> = SmartCacheStatusEvent | SmartCacheResultEvent<T>

export type SmartCacheStore<T> = {
  lastResultEvent: SmartCacheResultEvent<T> | undefined
  lastErorrEvent: SmartCacheErrorEvent | undefined
  lastRequestEvent: SmartCacheEvent<T> | undefined
}

export class SmartCache<T> {
  public events$ = new Subject<SmartCacheEvent<T>>()
  private workQueue$ = new Subject<SmartCacheQueuedEvent>()

  public memoryCache$ = new BehaviorSubject<{ [key: string]: SmartCacheStore<T> }>({})
  private localCacheChecked: { [key: string]: boolean } = {}

  constructor(
    private dir: EchoDirService,
    private type: string,
    loadFun: (key: string) => Observable<T | null>
  ) {
    this.events$.subscribe((e) => {
      const currentStore = this.memoryCache$.value[e.key] ?? {}
      const nextStore = { ...currentStore, lastRequestEvent: e!! }

      if (e.type === 'error') {
        nextStore.lastErorrEvent = e
      } else if (e.type === 'result') {
        nextStore.lastResultEvent = e
        nextStore.lastErorrEvent = undefined
        this.dir.writeJson(['cache', "smart-cache", this.type, e.key], e)
      }

      if (e.type !== 'queued') {
        this.memoryCache$.next({ ...this.memoryCache$.value, [e.key]: nextStore })
      }
    })

    this.workQueue$
      .pipe(
        concatMap((e) => {
          const ratelimitDelayMs = 1000 //calculate rate limit here
          console.log('pre-ratelimit', e, ratelimitDelayMs)
          this.events$.next({
            type: 'rate-limit',
            key: e.key,
            timestampMs: Date.now(),
            limitExpiresMs: ratelimitDelayMs
          })
          return of(e).pipe(
            delay(ratelimitDelayMs),
            tap((e) => console.log('post-ratelimit', e)),
            concatMap((e) => {
              return loadFun(e.key).pipe(map((r) => ({ e, r })))
            })
          )
        })
      )
      .subscribe(({ e, r }) => {
        this.events$.next({ type: 'result', result: r, key: e.key, timestampMs: Date.now() })
      })
  }

  private loadFromLocalIfValid(config: SmartCacheLoadConfig): SmartCacheResultEvent<T> | null {
    const key = config.key
    const maxAgeMs = config.maxAgeMs!! + config.maxStaleMs!!
    const memoryCachedResult = this.memoryCache$.value[key]?.lastResultEvent
    if (memoryCachedResult && this.isValid(memoryCachedResult, maxAgeMs)) {
      return memoryCachedResult
    }

    if (!this.localCacheChecked[key]) {
      this.localCacheChecked[key] = true
      if (this.dir.existsJson('cache', key)) {
        const localCachedValue = this.dir.loadJson<SmartCacheResultEvent<T>>('cache', key)
        if (localCachedValue && this.isValid(localCachedValue, maxAgeMs)) {
          this.events$.next(localCachedValue)
          return localCachedValue
        }
      }
    }

    return null
  }

  private isValid(
    value: SmartCacheResultEvent<T> | undefined | null,
    maxAgeMs: number
  ): boolean {
    if (process.env['FORCE_SMART_CACHE_VALUE'] === "true") {
      console.log("smart-cache forced valid = true")
      return true
    }

    const validAge = Date.now() - (value?.timestampMs ?? 0) < maxAgeMs
    return validAge
  }

  public fromCache(key: string): Observable<SmartCacheStore<T> | null | undefined> {
    return this.memoryCache$.pipe(map((e) => e[key]))
  }

  private fireLoad(config: SmartCacheLoadConfig) {
    const currentStore = this.memoryCache$.value[config.key] ?? {}
    if (
      !currentStore.lastRequestEvent?.type ||
      currentStore.lastRequestEvent?.type === 'result' ||
      currentStore.lastRequestEvent?.type === 'error'
    ) {
      const nextEvent: SmartCacheQueuedEvent = {
        type: 'queued',
        key: config.key,
        timestampMs: Date.now()
      }
      this.memoryCache$.next({
        ...this.memoryCache$.value,
        [config.key]: { ...currentStore, lastRequestEvent: nextEvent!! }
      })
      this.events$.next(nextEvent)
      this.workQueue$.next(nextEvent)
    }
  }

  public load(config: SmartCacheLoadConfig): Observable<SmartCacheEvent<T>> {
    if (config.key === null || config.key === undefined) {
      throw new Error('Config key cannot be null or undefined')
    }

    config = {
      maxAgeMs: 60_000,
      maxStaleMs: 30_000,
      ...config
    }

    return new Observable<SmartCacheEvent<T>>((sub) => {
      const localResult = this.loadFromLocalIfValid(config)
      if (localResult) {
        sub.next(localResult)
        sub.complete()

        const stale = !this.isValid(localResult, config.maxAgeMs!!)
        if (stale) {
          this.fireLoad(config)
        }
      } else {
        const eventSub = this.events$.pipe(
          filter((e) => e.key === config.key)
        ).subscribe((e) => {
          sub.next(e)

          if (e.type === 'error') {
            sub.error(e.error)
            eventSub.unsubscribe()
            sub.complete()
          } else if (e.type === 'result') {
            eventSub.unsubscribe()
            sub.complete()
          }
        })

        this.fireLoad(config)
      }
    })
  }
}
