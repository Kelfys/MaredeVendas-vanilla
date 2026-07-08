import { describe, it, expect } from 'vitest'
import {
  canReportStore, canReportProduct, canSubmitContentReport, getReportLoginPath,
} from '../js/report-permissions.js'

describe('report permissions', () => {
  const customer = { id: 'user-1', role: 'customer' }
  const merchant = { id: 'merchant-1', role: 'merchant' }

  it('allows customers and merchants to submit reports', () => {
    expect(canSubmitContentReport(customer)).toBe(true)
    expect(canSubmitContentReport(merchant)).toBe(true)
    expect(canSubmitContentReport({ id: 'a-1', role: 'admin' })).toBe(false)
    expect(canSubmitContentReport(null)).toBe(false)
  })

  it('allows reporting another users store', () => {
    expect(canReportStore(customer, { id: 'store-1', owner_id: 'other' })).toBe(true)
    expect(canReportStore(merchant, { id: 'store-1', owner_id: 'other' })).toBe(true)
  })

  it('blocks reporting own store', () => {
    expect(canReportStore(merchant, { id: 'store-1', owner_id: 'merchant-1' })).toBe(false)
  })

  it('allows reporting another stores product', () => {
    expect(canReportProduct(merchant, { id: 'p1', store: { owner_id: 'other' } })).toBe(true)
  })

  it('blocks reporting own product', () => {
    expect(canReportProduct(merchant, { id: 'p1', store: { owner_id: 'merchant-1' } })).toBe(false)
  })

  it('uses merchant login path for lojistas', () => {
    expect(getReportLoginPath(merchant, '/loja/demo')).toBe('/lojista/entrar?redirect=%2Floja%2Fdemo')
    expect(getReportLoginPath(customer, '/')).toBe('/conta/entrar?redirect=%2F')
  })
})