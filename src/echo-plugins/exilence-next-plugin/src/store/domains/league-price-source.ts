import { action, computed, makeObservable, observable } from 'mobx'
import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { IExternalPrice } from '../../interfaces/external-price.interface'
import { ILeaguePriceSource } from '../../interfaces/league-price-source.interface'

export class LeaguePriceSource implements ILeaguePriceSource {
  uuid: string = uuidv4()
  priceSourceUuid: string = ''

  prices: IExternalPrice[] = []
  @observable pricedFetchedAt?: number

  @computed
  get timeSincePricesFetched() {
    if (!this.pricedFetchedAt) {
      return undefined
    }
    return dayjs.utc(this.pricedFetchedAt).fromNow()
  }

  constructor(obj?: ILeaguePriceSource) {
    makeObservable(this)
    Object.assign(this, obj)
  }

  @action
  updatePrices(newPrices: IExternalPrice[]) {
    this.prices = newPrices
    this.pricedFetchedAt = dayjs.utc().valueOf()
  }
}
