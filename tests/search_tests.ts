import AbortController from 'abort-controller'
import { ErrorStatusCode, EnqueuedTask } from '../src/types'
import {
  clearAllIndexes,
  config,
  BAD_HOST,
  MeiliSearch,
  getClient,
} from './meilisearch-test-utils'

const index = {
  uid: 'movies_test',
}
const emptyIndex = {
  uid: 'empty_test',
}

const dataset = [
  {
    id: 123,
    title: 'Pride and Prejudice',
    comment: 'A great book',
    genre: 'romance',
  },
  {
    id: 456,
    title: 'Le Petit Prince',
    comment: 'A french book about a prince that walks on little cute planets',
    genre: 'adventure',
    isNull: null,
    isTrue: true,
  },
  {
    id: 2,
    title: 'Le Rouge et le Noir',
    comment: 'Another french book',
    genre: 'romance',
  },
  {
    id: 1,
    title: 'Alice In Wonderland',
    comment: 'A weird book',
    genre: 'adventure',
  },
  {
    id: 1344,
    title: 'The Hobbit',
    comment: 'An awesome book',
    genre: 'sci fi',
  },
  {
    id: 4,
    title: 'Harry Potter and the Half-Blood Prince',
    comment: 'The best book',
    genre: 'fantasy',
  },
  { id: 42, title: "The Hitchhiker's Guide to the Galaxy", genre: 'fantasy' },
]

jest.setTimeout(100 * 1000)

afterAll(() => {
  return clearAllIndexes(config)
})

describe.each([
  { permission: 'Master' },
  { permission: 'Private' },
  { permission: 'Public' },
])('Test on POST search', ({ permission }) => {
  beforeAll(async () => {
    await clearAllIndexes(config)
    const client = await getClient('Master')
    await client.createIndex(index.uid)
    await client.createIndex(emptyIndex.uid)

    const newFilterableAttributes = ['genre', 'title', 'id']
    const { uid: task1 }: EnqueuedTask = await client
      .index(index.uid)
      .updateSettings({
        filterableAttributes: newFilterableAttributes,
        sortableAttributes: ['id'],
      })
    await client.waitForTask(task1)

    const { uid: task2 } = await client.index(index.uid).addDocuments(dataset)
    await client.waitForTask(task2)
  })

  test(`${permission} key: Basic search`, async () => {
    const client = await getClient(permission)
    const response = await client.index(index.uid).search('prince', {})
    expect(response).toHaveProperty('hits', expect.any(Array))
    expect(response).toHaveProperty('offset', 0)
    expect(response).toHaveProperty('limit', 20)
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response).toHaveProperty('query', 'prince')
    expect(response.hits.length).toEqual(2)
  })

  test(`${permission} key: Basic phrase search`, async () => {
    const client = await getClient(permission)
    const response = await client
      .index(index.uid)
      .search('"french book" about', {})
    expect(response).toHaveProperty('hits', expect.any(Array))
    expect(response).toHaveProperty('offset', 0)
    expect(response).toHaveProperty('limit', 20)
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response).toHaveProperty('query', '"french book" about')
    expect(response.hits.length).toEqual(2)
  })

  test(`${permission} key: search with options`, async () => {
    const client = await getClient(permission)
    const response = await client
      .index(index.uid)
      .search('prince', { limit: 1 })
    expect(response).toHaveProperty('hits', expect.any(Array))
    expect(response).toHaveProperty('offset', 0)
    expect(response).toHaveProperty('limit', 1)
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response).toHaveProperty('query', 'prince')
    expect(response.hits.length).toEqual(1)
  })

  test(`${permission} key: search with sortable`, async () => {
    const client = await getClient(permission)
    const response = await client
      .index(index.uid)
      .search('', { sort: ['id:asc'] })
    expect(response).toHaveProperty('hits', expect.any(Array))
    const hit = response.hits[0]
    expect(hit.id).toEqual(1)
  })

  test(`${permission} key: search with array options`, async () => {
    const client = await getClient(permission)
    const response = await client.index(index.uid).search('prince', {
      attributesToRetrieve: ['*'],
    })
    expect(response).toHaveProperty('hits', expect.any(Array))
    expect(response).toHaveProperty('offset', 0)
    expect(response).toHaveProperty('limit', 20)
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response).toHaveProperty('query', 'prince')
    expect(response.hits.length).toEqual(2)
  })

  test(`${permission} key: search with array options`, async () => {
    const client = await getClient(permission)
    const response = await client.index(index.uid).search('prince', {
      attributesToRetrieve: ['*'],
    })
    expect(response).toHaveProperty('hits', expect.any(Array))
    expect(response).toHaveProperty('offset', 0)
    expect(response).toHaveProperty('limit', 20)
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response).toHaveProperty('query', 'prince')
    expect(response.hits.length).toEqual(2)
  })

  test(`${permission} key: search with options`, async () => {
    const client = await getClient(permission)
    const response = await client
      .index(index.uid)
      .search('prince', { limit: 1 })
    expect(response).toHaveProperty('hits', expect.any(Array))
    expect(response).toHaveProperty('offset', 0)
    expect(response).toHaveProperty('limit', 1)
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response).toHaveProperty('query', 'prince')
    expect(response.hits.length).toEqual(1)
  })

  test(`${permission} key: search with limit and offset`, async () => {
    const client = await getClient(permission)
    const response = await client.index(index.uid).search('prince', {
      limit: 1,
      offset: 1,
    })
    expect(response).toHaveProperty('hits', [
      {
        id: 4,
        title: 'Harry Potter and the Half-Blood Prince',
        comment: 'The best book',
        genre: 'fantasy',
      },
    ])
    expect(response).toHaveProperty('offset', 1)
    expect(response).toHaveProperty('limit', 1)
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response).toHaveProperty('query', 'prince')
    expect(response.hits.length).toEqual(1)
  })

  test(`${permission} key: search with matches parameter and small croplength`, async () => {
    const client = await getClient(permission)
    const response = await client.index(index.uid).search('prince', {
      filter: 'title = "Le Petit Prince"',
      attributesToCrop: ['*'],
      cropLength: 5,
      matches: true,
    })
    expect(response).toHaveProperty('hits', expect.any(Array))
    expect(response).toHaveProperty('offset', 0)
    expect(response).toHaveProperty('limit', 20)
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response).toHaveProperty('query', 'prince')
    expect(response.hits.length).toEqual(1)
    expect(response.hits[0]).toHaveProperty('_matchesInfo', {
      comment: [{ start: 22, length: 6 }],
      title: [{ start: 9, length: 6 }],
    })
  })

  test(`${permission} key: search with all options but not all fields`, async () => {
    const client = await getClient(permission)
    const response = await client.index(index.uid).search('prince', {
      limit: 5,
      offset: 0,
      attributesToRetrieve: ['id', 'title'],
      attributesToCrop: ['*'],
      cropLength: 6,
      attributesToHighlight: ['*'],
      filter: 'title = "Le Petit Prince"',
      matches: true,
    })
    expect(response).toHaveProperty('hits', expect.any(Array))
    expect(response).toHaveProperty('offset', 0)
    expect(response).toHaveProperty('limit', 5)
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response).toHaveProperty('query', 'prince')
    expect(response.hits[0]._formatted).toHaveProperty('title')
    expect(response.hits[0]._formatted).toHaveProperty('id')
    expect(response.hits[0]).not.toHaveProperty('comment')
    expect(response.hits[0]).not.toHaveProperty('description')
    expect(response.hits.length).toEqual(1)
    expect(response.hits[0]).toHaveProperty('_formatted', expect.any(Object))
    expect(response.hits[0]._formatted).toHaveProperty(
      'title',
      'Petit <em>Prince</em>'
    )
    expect(response.hits[0]).toHaveProperty('_matchesInfo', expect.any(Object))
  })

  test(`${permission} key: search with all options and all fields`, async () => {
    const client = await getClient(permission)
    const response = await client.index(index.uid).search('prince', {
      limit: 5,
      offset: 0,
      attributesToRetrieve: ['*'],
      attributesToCrop: ['*'],
      cropLength: 6,
      attributesToHighlight: ['*'],
      filter: 'title = "Le Petit Prince"',
      matches: true,
    })
    expect(response).toHaveProperty('hits', expect.any(Array))
    expect(response).toHaveProperty('offset', 0)
    expect(response).toHaveProperty('limit', 5)
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response).toHaveProperty('query', 'prince')
    expect(response.hits.length).toEqual(1)
    expect(response.hits[0]).toHaveProperty('_formatted', expect.any(Object))
    expect(response.hits[0]._formatted).toHaveProperty(
      'title',
      'Petit <em>Prince</em>'
    )
    expect(response.hits[0]).toHaveProperty('_matchesInfo', expect.any(Object))
  })

  test(`${permission} key: search with all options but specific fields`, async () => {
    const client = await getClient(permission)
    const response = await client.index(index.uid).search('prince', {
      limit: 5,
      offset: 0,
      attributesToRetrieve: ['id', 'title'],
      attributesToCrop: ['id', 'title'],
      cropLength: 6,
      attributesToHighlight: ['id', 'title'],
      filter: 'title = "Le Petit Prince"',
      matches: true,
    })
    expect(response).toHaveProperty('hits', expect.any(Array))
    expect(response).toHaveProperty('offset', 0)
    expect(response).toHaveProperty('limit', 5)
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response).toHaveProperty('query', 'prince')
    expect(response.hits.length).toEqual(1)
    expect(response.hits[0]._formatted?.id).toEqual('456')
    expect(response.hits[0]).toHaveProperty('title', 'Le Petit Prince')
    expect(response.hits[0]).not.toHaveProperty('comment')
    expect(response.hits[0]).toHaveProperty('_formatted', expect.any(Object))
    expect(response.hits[0]).not.toHaveProperty(
      'description',
      expect.any(Object)
    )
    expect(response.hits[0]._formatted).toHaveProperty(
      'title',
      'Petit <em>Prince</em>'
    )
    expect(response.hits[0]._formatted).not.toHaveProperty('comment')
    expect(response.hits[0]).toHaveProperty('_matchesInfo', expect.any(Object))
  })

  test(`${permission} key: Search with specific fields in attributesToHighlight and check for types of number fields`, async () => {
    const client = await getClient(permission)
    const response = await client.index(index.uid).search('prince', {
      attributesToHighlight: ['title'],
    })
    expect(response.hits[0]._formatted?.id).toEqual('456')
    expect(response.hits[0]._formatted?.isNull).toEqual(null)
    expect(response.hits[0]._formatted?.isTrue).toEqual(true)
  })

  test(`${permission} key: Search with specific fields in attributesToHighlight and check for types of number fields`, async () => {
    const client = await getClient(permission)
    const response = await client.index(index.uid).search('prince', {
      attributesToHighlight: ['title', 'id'],
    })
    expect(response.hits[0]._formatted?.id).toEqual('456')
    expect(response.hits[0]._formatted?.isNull).toEqual(null)
    expect(response.hits[0]._formatted?.isTrue).toEqual(true)
  })

  test(`${permission} key: search with filter and facetsDistribution`, async () => {
    const client = await getClient(permission)
    const response = await client.index(index.uid).search('a', {
      filter: ['genre = romance'],
      facetsDistribution: ['genre'],
    })
    expect(response).toHaveProperty('facetsDistribution', {
      genre: { romance: 2 },
    })
    expect(response).toHaveProperty('exhaustiveFacetsCount', false)
    expect(response).toHaveProperty('exhaustiveNbHits', false)
    expect(response).toHaveProperty('hits', expect.any(Array))
    expect(response.hits.length).toEqual(2)
  })

  test(`${permission} key: search with filter on number`, async () => {
    const client = await getClient(permission)
    const response = await client.index(index.uid).search('a', {
      filter: 'id < 0',
    })
    expect(response).toHaveProperty('exhaustiveNbHits', false)
    expect(response).toHaveProperty('hits', expect.any(Array))
    expect(response.hits.length).toEqual(0)
  })

  test(`${permission} key: search with filter with spaces`, async () => {
    const client = await getClient(permission)
    const response = await client.index(index.uid).search('h', {
      filter: ['genre = "sci fi"'],
    })
    expect(response).toHaveProperty('hits', expect.any(Array))
    expect(response.hits.length).toEqual(1)
  })

  test(`${permission} key: search with multiple filter`, async () => {
    const client = await getClient(permission)
    const response = await client.index(index.uid).search('a', {
      filter: ['genre = romance', ['genre = romance', 'genre = romance']],
      facetsDistribution: ['genre'],
    })
    expect(response).toHaveProperty('facetsDistribution', {
      genre: { romance: 2 },
    })
    expect(response).toHaveProperty('exhaustiveFacetsCount', false)
    expect(response).toHaveProperty('exhaustiveNbHits', false)
    expect(response).toHaveProperty('hits', expect.any(Array))
    expect(response.hits.length).toEqual(2)
  })

  test(`${permission} key: search with multiple filter and undefined query (placeholder)`, async () => {
    const client = await getClient(permission)
    const response = await client.index(index.uid).search(undefined, {
      filter: ['genre = fantasy'],
      facetsDistribution: ['genre'],
    })
    expect(response).toHaveProperty('facetsDistribution', {
      genre: { fantasy: 2 },
    })
    expect(response.hits.length).toEqual(2)
  })

  test(`${permission} key: search with multiple filter and null query (placeholder)`, async () => {
    const client = await getClient(permission)
    const response = await client.index(index.uid).search(null, {
      filter: ['genre = fantasy'],
      facetsDistribution: ['genre'],
    })
    expect(response).toHaveProperty('facetsDistribution', {
      genre: { fantasy: 2 },
    })
    expect(response.hits.length).toEqual(2)
    expect(response.nbHits).toEqual(2)
  })

  test(`${permission} key: search with multiple filter and empty string query (placeholder)`, async () => {
    const client = await getClient(permission)
    const response = await client.index(index.uid).search('', {
      filter: ['genre = fantasy'],
      facetsDistribution: ['genre'],
    })
    expect(response).toHaveProperty('facetsDistribution', {
      genre: { fantasy: 2 },
    })
    expect(response.hits.length).toEqual(2)
  })

  test(`${permission} key: search on index with no documents and no primary key`, async () => {
    const client = await getClient(permission)
    const response = await client.index(emptyIndex.uid).search('prince', {})
    expect(response).toHaveProperty('hits', [])
    expect(response).toHaveProperty('offset', 0)
    expect(response).toHaveProperty('limit', 20)
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response).toHaveProperty('query', 'prince')
    expect(response.hits.length).toEqual(0)
  })

  test(`${permission} key: Try to search on deleted index and fail`, async () => {
    const client = await getClient(permission)
    const masterClient = await getClient('Master')
    const { uid } = await masterClient.index(index.uid).delete()
    await masterClient.waitForTask(uid)

    await expect(
      client.index(index.uid).search('prince', {})
    ).rejects.toHaveProperty('code', ErrorStatusCode.INDEX_NOT_FOUND)
  })
})

describe.each([{ permission: 'No' }])(
  'Test failing test on search',
  ({ permission }) => {
    beforeAll(async () => {
      const client = await getClient('Master')
      const { uid } = await client.createIndex(index.uid)
      await client.waitForTask(uid)
    })

    test(`${permission} key: Try Basic search and be denied`, async () => {
      const client = await getClient(permission)
      await expect(
        client.index(index.uid).search('prince')
      ).rejects.toHaveProperty(
        'code',
        ErrorStatusCode.MISSING_AUTHORIZATION_HEADER
      )
    })
  }
)

describe.each([
  { permission: 'Master' },
  { permission: 'Private' },
  { permission: 'Public' },
])('Test on abortable search', ({ permission }) => {
  beforeAll(async () => {
    const client = await getClient('Master')
    await clearAllIndexes(config)
    const { uid } = await client.createIndex(index.uid)
    await client.waitForTask(uid)
  })

  test(`${permission} key: search on index and abort`, async () => {
    const controller = new AbortController()
    const client = await getClient(permission)
    const searchPromise = client.index(index.uid).search(
      'unreachable',
      {},
      {
        signal: controller.signal,
      }
    )

    controller.abort()

    searchPromise.catch((error: any) => {
      expect(error).toHaveProperty('message', 'The user aborted a request.')
    })
  })

  test(`${permission} key: search on index multiple times, and abort only one request`, async () => {
    const client = await getClient(permission)
    const controllerA = new AbortController()
    const controllerB = new AbortController()
    const controllerC = new AbortController()
    const searchQuery = 'prince'

    const searchAPromise = client.index(index.uid).search(
      searchQuery,
      {},
      {
        signal: controllerA.signal,
      }
    )

    const searchBPromise = client.index(index.uid).search(
      searchQuery,
      {},
      {
        signal: controllerB.signal,
      }
    )

    const searchCPromise = client.index(index.uid).search(
      searchQuery,
      {},
      {
        signal: controllerC.signal,
      }
    )

    const searchDPromise = client.index(index.uid).search(searchQuery, {})

    controllerB.abort()

    searchDPromise.then((response) => {
      expect(response).toHaveProperty('query', searchQuery)
    })

    searchCPromise.then((response) => {
      expect(response).toHaveProperty('query', searchQuery)
    })

    searchAPromise.then((response) => {
      expect(response).toHaveProperty('query', searchQuery)
    })

    searchBPromise.catch((error: any) => {
      expect(error).toHaveProperty('message', 'The user aborted a request.')
    })
  })
})

describe.each([
  { host: BAD_HOST, trailing: false },
  { host: `${BAD_HOST}/api`, trailing: false },
  { host: `${BAD_HOST}/trailing/`, trailing: true },
])('Tests on url construction', ({ host, trailing }) => {
  test(`Test get search route`, async () => {
    const route = `indexes/${index.uid}/search`
    const client = new MeiliSearch({ host })
    const strippedHost = trailing ? host.slice(0, -1) : host
    await expect(client.index(index.uid).search()).rejects.toHaveProperty(
      'message',
      `request to ${strippedHost}/${route} failed, reason: connect ECONNREFUSED ${BAD_HOST.replace(
        'http://',
        ''
      )}`
    )
  })

  test(`Test post search route`, async () => {
    const route = `indexes/${index.uid}/search`
    const client = new MeiliSearch({ host })
    const strippedHost = trailing ? host.slice(0, -1) : host
    await expect(client.index(index.uid).search()).rejects.toHaveProperty(
      'message',
      `request to ${strippedHost}/${route} failed, reason: connect ECONNREFUSED ${BAD_HOST.replace(
        'http://',
        ''
      )}`
    )
  })
})
