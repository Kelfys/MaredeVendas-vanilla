import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function createChannelMock() {
  const handlers = []
  const chain = {
    on: vi.fn((_event, _opts, handler) => {
      handlers.push(handler)
      return chain
    }),
    subscribe: vi.fn(() => chain),
    topic: '',
  }
  return { chain, handlers }
}

describe('subscribeToStoreOrders', () => {
  let channels
  let client

  beforeEach(() => {
    vi.stubGlobal('window', { location: { pathname: '/', origin: 'http://localhost' } })
    channels = []
    client = {
      getChannels: vi.fn(() => channels),
      removeChannel: vi.fn((ch) => {
        channels = channels.filter((c) => c !== ch)
      }),
      channel: vi.fn((name) => {
        const { chain } = createChannelMock()
        chain.topic = `realtime:${name}`
        channels.push(chain)
        return chain
      }),
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('remove canal existente antes de inscrever de novo', async () => {
    vi.doMock('../js/db.js', () => ({
      getSupabase: () => client,
      isSupabaseConfigured: () => true,
      requireClient: vi.fn(),
    }))

    const { subscribeToStoreOrders } = await import('../js/api.js')
    const storeId = '22222222-2222-4222-8222-222222220016'

    const unsub1 = subscribeToStoreOrders(storeId, vi.fn())
    expect(client.channel).toHaveBeenCalledTimes(1)
    expect(channels).toHaveLength(1)

    const unsub2 = subscribeToStoreOrders(storeId, vi.fn())
    expect(client.removeChannel).toHaveBeenCalledTimes(1)
    expect(client.channel).toHaveBeenCalledTimes(2)
    expect(channels).toHaveLength(1)

    unsub1()
    unsub2()
  })

  it('unsubscribe remove o canal do client', async () => {
    vi.doMock('../js/db.js', () => ({
      getSupabase: () => client,
      isSupabaseConfigured: () => true,
      requireClient: vi.fn(),
    }))

    const { subscribeToStoreOrders } = await import('../js/api.js')
    const storeId = 'store-abc'

    const unsub = subscribeToStoreOrders(storeId, vi.fn())
    expect(channels).toHaveLength(1)
    const channel = channels[0]

    unsub()
    expect(client.removeChannel).toHaveBeenCalledWith(channel)
    expect(channels).toHaveLength(0)
  })
})