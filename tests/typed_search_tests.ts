import { EnqueuedTask, ErrorStatusCode } from '../src/'
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

interface Movie {
  id: number
  title: string
  comment?: string
  genre?: string
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
])('Test on search', ({ permission }) => {
  beforeAll(async () => {
    const client = await getClient('Master')
    await clearAllIndexes(config)

    const task1 = await client.createIndex(index.uid)
    await client.waitForTask(task1.uid)
    const task2 = await client.createIndex(emptyIndex.uid)
    await client.waitForTask(task2.uid)

    const newFilterableAttributes = ['genre', 'title']
    const response: EnqueuedTask = await client
      .index<Movie>(index.uid)
      .updateFilterableAttributes(newFilterableAttributes)

    await client.waitForTask(response.uid)
    const { uid } = await client.index<Movie>(index.uid).addDocuments(dataset)
    await client.waitForTask(uid)
  })

  test(`${permission} key: Basic search`, async () => {
    const client = await getClient(permission)
    const response = await client.index<Movie>(index.uid).search('prince', {})
    expect(response.hits.length === 2).toBeTruthy()
    expect(response.offset === 0).toBeTruthy()
    expect(response.limit === 20).toBeTruthy()
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response.query === 'prince').toBeTruthy()
  })

  test(`${permission} key: Search with options`, async () => {
    const client = await getClient(permission)
    const response = await client
      .index<Movie>(index.uid)
      .search('prince', { limit: 1 })
    expect(response.hits.length === 1).toBeTruthy()
    expect(response.offset === 0).toBeTruthy()
    expect(response.limit === 1).toBeTruthy()
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response.query === 'prince').toBeTruthy()
  })

  test(`${permission} key: Search with limit and offset`, async () => {
    const client = await getClient(permission)
    const response = await client.index<Movie>(index.uid).search('prince', {
      limit: 1,
      offset: 1,
    })
    expect(response.hits.length === 1).toBeTruthy()
    expect(response.offset === 1).toBeTruthy()
    // expect(response.bloub).toEqual(0) -> ERROR, bloub does not exist on type Response
    expect(response.limit === 1).toBeTruthy()
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response.query === 'prince').toBeTruthy()
    expect(response.hits[0].id).toEqual(4)
    expect(response.hits[0].title).toEqual(
      'Harry Potter and the Half-Blood Prince'
    )
    expect(response.hits[0].comment).toEqual('The best book')
    expect(response.hits[0].genre).toEqual('fantasy')
    expect(response.query === 'prince').toBeTruthy()
  })

  test(`${permission} key: Search with matches parameter and small croplength`, async () => {
    const client = await getClient(permission)
    const response = await client.index<Movie>(index.uid).search('prince', {
      filter: 'title = "Le Petit Prince"',
      attributesToCrop: ['*'],
      cropLength: 5,
      matches: true,
    })
    expect(response.hits.length === 1).toBeTruthy()
    expect(response.offset === 0).toBeTruthy()
    expect(response.limit === 20).toBeTruthy()
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response.query === 'prince').toBeTruthy()
    expect(response.hits[0]?._matchesInfo?.comment).toEqual([
      { start: 22, length: 6 },
    ])
    expect(response.hits[0]?._matchesInfo?.title).toEqual([
      { start: 9, length: 6 },
    ])
  })

  test(`${permission} key: Search with all options but not all fields`, async () => {
    const client = await getClient(permission)
    const response = await client.index<Movie>(index.uid).search('prince', {
      limit: 5,
      offset: 0,
      attributesToRetrieve: ['id', 'title'],
      attributesToCrop: ['*'],
      cropLength: 6,
      attributesToHighlight: ['*'],
      filter: 'title = "Le Petit Prince"',
      matches: true,
    })
    expect(response.hits.length === 1).toBeTruthy()
    expect(response.offset === 0).toBeTruthy()
    expect(response.limit === 5).toBeTruthy()
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response.query === 'prince').toBeTruthy()
    expect(
      response.hits[0]?._formatted?.title === 'Petit <em>Prince</em>'
    ).toBeTruthy()
    expect(response.hits[0]._formatted?.id).toEqual('456')
    expect(response.hits[0]).not.toHaveProperty('comment')
    expect(response.hits[0]).not.toHaveProperty('description')
    expect(response.hits[0]._formatted).toHaveProperty('comment')
    expect(response.hits[0]._formatted).not.toHaveProperty('description')
    expect(response.hits.length === 1).toBeTruthy()
    expect(response.hits[0]).toHaveProperty('_matchesInfo', expect.any(Object))
  })

  test(`${permission} key: Search with all options and all fields`, async () => {
    const client = await getClient(permission)
    const response = await client.index<Movie>(index.uid).search('prince', {
      limit: 5,
      offset: 0,
      attributesToRetrieve: ['*'],
      attributesToCrop: ['*'],
      cropLength: 6,
      attributesToHighlight: ['*'],
      filter: 'title = "Le Petit Prince"',
      matches: true,
    })
    expect(response.hits.length === 1).toBeTruthy()
    expect(response.offset === 0).toBeTruthy()
    expect(response.limit === 5).toBeTruthy()
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response.query === 'prince').toBeTruthy()
    expect(response.hits[0]?.title === 'Le Petit Prince').toBeTruthy()
    expect(response.hits[0]?._matchesInfo?.title?.[0]?.start === 9).toBeTruthy()
    expect(
      response.hits[0]?._matchesInfo?.title?.[0]?.length === 6
    ).toBeTruthy()
    expect(
      response.hits[0]?._formatted?.title === 'Petit <em>Prince</em>'
    ).toBeTruthy()
  })

  test(`${permission} key: Search with all options but specific fields`, async () => {
    const client = await getClient(permission)
    const response = await client.index<Movie>(index.uid).search('prince', {
      limit: 5,
      offset: 0,
      attributesToRetrieve: ['id', 'title'],
      attributesToCrop: ['id', 'title'],
      cropLength: 6,
      attributesToHighlight: ['id', 'title'],
      filter: 'title = "Le Petit Prince"',
      matches: true,
    })
    expect(response.hits.length === 1).toBeTruthy()
    expect(response.offset === 0).toBeTruthy()
    expect(response.limit === 5).toBeTruthy()
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response.query === 'prince').toBeTruthy()

    expect(response.hits[0].id).toEqual(456)
    expect(response.hits[0].title).toEqual('Le Petit Prince')
    // ERROR Property 'comment' does not exist on type 'Hit<Pick<Movie, "id" | "title">>'.
    // expect(response.hits[0].comment).toEqual('comment')

    expect(response.hits[0]?.title === 'Le Petit Prince').toBeTruthy()
    expect(response.hits[0]?._matchesInfo?.title).toEqual([
      { start: 9, length: 6 },
    ])
    expect(
      response.hits[0]?._formatted?.title === 'Petit <em>Prince</em>'
    ).toBeTruthy()
    expect(response.hits[0]).not.toHaveProperty(
      'description',
      expect.any(Object)
    )
    expect(response.hits[0]._formatted).not.toHaveProperty('comment')
  })

  test(`${permission} key: Search with specific fields in attributesToHighlight and check for types of number fields`, async () => {
    const client = await getClient(permission)
    const response = await client.index<Movie>(index.uid).search('prince', {
      attributesToHighlight: ['title'],
    })
    expect(response.hits[0]._formatted?.id).toEqual('456')
    expect(response.hits[0]._formatted?.isNull).toEqual(null)
    expect(response.hits[0]._formatted?.isTrue).toEqual(true)
  })

  test(`${permission} key: Search with specific fields in attributesToHighlight and check for types of number fields`, async () => {
    const client = await getClient(permission)
    const response = await client.index<Movie>(index.uid).search('prince', {
      attributesToHighlight: ['title', 'id'],
    })
    expect(response.hits[0]._formatted?.id).toEqual('456')
    expect(response.hits[0]._formatted?.isNull).toEqual(null)
    expect(response.hits[0]._formatted?.isTrue).toEqual(true)
  })

  test(`${permission} key: Search with filter and facetsDistribution`, async () => {
    const client = await getClient(permission)
    const response = await client.index<Movie>(index.uid).search('a', {
      filter: ['genre=romance'],
      facetsDistribution: ['genre'],
    })
    expect(response.facetsDistribution?.genre?.romance === 2).toBeTruthy()
    expect(response.exhaustiveFacetsCount === false).toBeTruthy()
    expect(response.hits.length === 2).toBeTruthy()
  })

  test(`${permission} key: Search with filter with spaces`, async () => {
    const client = await getClient(permission)
    const response = await client.index<Movie>(index.uid).search('h', {
      filter: ['genre="sci fi"'],
    })
    expect(response).toHaveProperty('hits', expect.any(Array))
    expect(response.hits.length === 1).toBeTruthy()
  })

  test(`${permission} key: Search with multiple filter`, async () => {
    const client = await getClient(permission)
    const response = await client.index<Movie>(index.uid).search('a', {
      filter: ['genre=romance', ['genre=romance', 'genre=romance']],
      facetsDistribution: ['genre'],
    })
    expect(response.facetsDistribution?.genre?.romance === 2).toBeTruthy()
    expect(response.exhaustiveFacetsCount === false).toBeTruthy()
    expect(response.hits.length === 2).toBeTruthy()
  })

  test(`${permission} key: Search with multiple filter and placeholder search using undefined`, async () => {
    const client = await getClient(permission)
    const response = await client.index<Movie>(index.uid).search(undefined, {
      filter: ['genre = fantasy'],
      facetsDistribution: ['genre'],
    })
    expect(response.facetsDistribution?.genre?.fantasy === 2).toBeTruthy()
    expect(response.exhaustiveFacetsCount === false).toBeTruthy()
    expect(response.hits.length === 2).toBeTruthy()
  })

  test(`${permission} key: Search with multiple filter and placeholder search using NULL`, async () => {
    const client = await getClient(permission)
    const response = await client.index<Movie>(index.uid).search(null, {
      filter: ['genre = fantasy'],
      facetsDistribution: ['genre'],
    })
    expect(response.facetsDistribution?.genre?.fantasy === 2).toBeTruthy()
    expect(response.exhaustiveFacetsCount === false).toBeTruthy()
    expect(response.hits.length === 2).toBeTruthy()
  })

  test(`${permission} key: Search on index with no documents and no primary key`, async () => {
    const client = await getClient(permission)
    const response = await client.index(emptyIndex.uid).search('prince', {})
    expect(response.limit === 20).toBeTruthy()
    expect(response).toHaveProperty('processingTimeMs', expect.any(Number))
    expect(response.query === 'prince').toBeTruthy()
  })

  test(`${permission} key: Try to Search on deleted index and fail`, async () => {
    const client = await getClient(permission)
    const masterClient = await getClient('Master')
    const { uid } = await masterClient.index<Movie>(index.uid).delete()
    await masterClient.waitForTask(uid)
    await expect(
      client.index<Movie>(index.uid).search('prince')
    ).rejects.toHaveProperty('code', ErrorStatusCode.INDEX_NOT_FOUND)
  })
})

describe.each([{ permission: 'No' }])(
  'Test failing test on search',
  ({ permission }) => {
    beforeEach(async () => {
      await clearAllIndexes(config)
    })

    test(`${permission} key: Try Basic search and be denied`, async () => {
      const client = await getClient(permission)
      await expect(
        client.index<Movie>(index.uid).search('prince')
      ).rejects.toHaveProperty(
        'code',
        ErrorStatusCode.MISSING_AUTHORIZATION_HEADER
      )
    })
  }
)

describe.each([
  { host: BAD_HOST, trailing: false },
  { host: `${BAD_HOST}/api`, trailing: false },
  { host: `${BAD_HOST}/trailing/`, trailing: true },
])('Tests on url construction', ({ host, trailing }) => {
  test(`Test get search route`, async () => {
    const route = `indexes/${index.uid}/search`
    const client = new MeiliSearch({ host })
    const strippedHost = trailing ? host.slice(0, -1) : host
    await expect(
      client.index<Movie>(index.uid).search()
    ).rejects.toHaveProperty(
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
    await expect(
      client.index<Movie>(index.uid).search()
    ).rejects.toHaveProperty(
      'message',
      `request to ${strippedHost}/${route} failed, reason: connect ECONNREFUSED ${BAD_HOST.replace(
        'http://',
        ''
      )}`
    )
  })
})
