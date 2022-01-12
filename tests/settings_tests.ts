import { ErrorStatusCode, EnqueuedTask, Settings } from '../src/types'
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
const indexAndPK = {
  uid: 'movies_test_with_pk',
  primaryKey: 'id',
}

const dataset = [
  { id: 123, title: 'Pride and Prejudice', comment: 'A great book' },
  { id: 456, title: 'Le Petit Prince', comment: 'A french book' },
  { id: 2, title: 'Le Rouge et le Noir', comment: 'Another french book' },
  { id: 1, title: 'Alice In Wonderland', comment: 'A weird book' },
  { id: 1344, title: 'The Hobbit', comment: 'An awesome book' },
  {
    id: 4,
    title: 'Harry Potter and the Half-Blood Prince',
    comment: 'The best book',
  },
  { id: 42, title: "The Hitchhiker's Guide to the Galaxy" },
]

const defaultRankingRules = [
  'words',
  'typo',
  'proximity',
  'attribute',
  'sort',
  'exactness',
]

const defaultSettingsEmpty = {
  rankingRules: defaultRankingRules,
  distinctAttribute: null,
  searchableAttributes: [],
  displayedAttributes: [],
  sortableAttributes: [],
  stopWords: [],
  synonyms: {},
}

const defaultSettings = {
  rankingRules: defaultRankingRules,
  distinctAttribute: null,
  searchableAttributes: ['id', 'title', 'comment'],
  displayedAttributes: ['comment', 'title', 'id'],
  sortableAttributes: ['id'],
  stopWords: [],
  synonyms: {},
}

jest.setTimeout(100 * 1000)

afterAll(() => {
  return clearAllIndexes(config)
})

describe.each([{ permission: 'Master' }, { permission: 'Private' }])(
  'Test on settings',
  ({ permission }) => {
    beforeEach(async () => {
      await clearAllIndexes(config)
      const client = await getClient('Master')
      const { uid: AddDocPkTask } = await client
        .index(indexAndPK.uid)
        .addDocuments(dataset, {
          primaryKey: indexAndPK.primaryKey,
        })
      await client.waitForTask(AddDocPkTask)

      const { uid: AddDocTask } = await client
        .index(index.uid)
        .addDocuments(dataset, {})
      await client.waitForTask(AddDocTask)
    })

    test(`${permission} key: Get default settings of an index`, async () => {
      const client = await getClient(permission)
      const response: Settings = await client.index(index.uid).getSettings()
      expect(response).toHaveProperty('rankingRules', defaultRankingRules)
      expect(response).toHaveProperty('distinctAttribute', null)
      expect(response).toHaveProperty('searchableAttributes', ['*'])
      expect(response).toHaveProperty('displayedAttributes', ['*'])
      expect(response).toHaveProperty('sortableAttributes', [])
      expect(response).toHaveProperty('stopWords', [])
      expect(response).toHaveProperty('synonyms', {})
    })

    test(`${permission} key: Get default settings of empty index with primary key`, async () => {
      const client = await getClient(permission)
      const response: Settings = await client
        .index(indexAndPK.uid)
        .getSettings()
      expect(response).toHaveProperty('rankingRules', defaultRankingRules)
      expect(response).toHaveProperty('distinctAttribute', null)
      expect(response).toHaveProperty('searchableAttributes', ['*'])
      expect(response).toHaveProperty('displayedAttributes', ['*'])
      expect(response).toHaveProperty('sortableAttributes', [])
      expect(response).toHaveProperty('stopWords', [])
      expect(response).toHaveProperty('synonyms', {})
    })

    test(`${permission} key: Update settings`, async () => {
      const client = await getClient(permission)
      const newSettings = {
        distinctAttribute: 'title',
        rankingRules: ['id:asc', 'typo'],
        stopWords: ['the'],
        filterableAttributes: [],
      }
      const task: EnqueuedTask = await client
        .index(index.uid)
        .updateSettings(newSettings)
      expect(task).toHaveProperty('uid', expect.any(Number))
      await client.index(index.uid).waitForTask(task.uid)

      const response: Settings = await client.index(index.uid).getSettings()
      expect(response).toHaveProperty('rankingRules', newSettings.rankingRules)
      expect(response).toHaveProperty(
        'distinctAttribute',
        newSettings.distinctAttribute
      )
      expect(response).toHaveProperty('searchableAttributes', ['*'])
      expect(response).toHaveProperty('displayedAttributes', ['*'])
      expect(response).toHaveProperty('stopWords', newSettings.stopWords)
      expect(response).toHaveProperty('synonyms', {})
    })

    test(`${permission} key: Update settings on empty index with primary key`, async () => {
      const client = await getClient(permission)
      const newSettings = {
        distinctAttribute: 'title',
        rankingRules: ['title:asc', 'typo'],
        stopWords: ['the'],
      }

      const task: EnqueuedTask = await client
        .index(indexAndPK.uid)
        .updateSettings(newSettings)
      expect(task).toHaveProperty('uid', expect.any(Number))
      await client.index(indexAndPK.uid).waitForTask(task.uid)

      const response: Settings = await client
        .index(indexAndPK.uid)
        .getSettings()
      expect(response).toHaveProperty('rankingRules', newSettings.rankingRules)
      expect(response).toHaveProperty(
        'distinctAttribute',
        newSettings.distinctAttribute
      )
      expect(response).toHaveProperty('searchableAttributes', ['*'])
      expect(response).toHaveProperty('displayedAttributes', ['*'])
      expect(response).toHaveProperty('stopWords', newSettings.stopWords)
      expect(response).toHaveProperty('synonyms', {})
    })

    test(`${permission} key: Reset settings`, async () => {
      const client = await getClient(permission)
      const task: EnqueuedTask = await client.index(index.uid).resetSettings()
      expect(task).toHaveProperty('uid', expect.any(Number))
      await client.index(index.uid).waitForTask(task.uid)

      const response: Settings = await client.index(index.uid).getSettings()
      expect(response).toHaveProperty('rankingRules', defaultRankingRules)
      expect(response).toHaveProperty('distinctAttribute', null)
      expect(response).toHaveProperty('searchableAttributes', ['*'])
      expect(response).toHaveProperty('displayedAttributes', ['*'])
      expect(response).toHaveProperty('sortableAttributes', [])
      expect(response).toHaveProperty('stopWords', [])
      expect(response).toHaveProperty('synonyms', {})
    })

    test(`${permission} key: Reset settings of empty index`, async () => {
      const client = await getClient(permission)
      const task: EnqueuedTask = await client
        .index(indexAndPK.uid)
        .resetSettings()
      expect(task).toHaveProperty('uid', expect.any(Number))
      await client.index(index.uid).waitForTask(task.uid)

      const response: Settings = await client
        .index(indexAndPK.uid)
        .getSettings()
      expect(response).toHaveProperty('rankingRules', defaultRankingRules)
      expect(response).toHaveProperty('distinctAttribute', null)
      expect(response).toHaveProperty('searchableAttributes', ['*'])
      expect(response).toHaveProperty('displayedAttributes', ['*'])
      expect(response).toHaveProperty('stopWords', [])
      expect(response).toHaveProperty('synonyms', {})
    })

    test(`${permission} key: Update searchableAttributes settings on empty index`, async () => {
      const client = await getClient(permission)
      const newSettings = {
        searchableAttributes: ['title'],
      }
      const task: EnqueuedTask = await client
        .index(index.uid)
        .updateSettings(newSettings)
      expect(task).toHaveProperty('uid', expect.any(Number))
      await client.index(index.uid).waitForTask(task.uid)

      const response: Settings = await client.index(index.uid).getSettings()
      expect(response).toHaveProperty('rankingRules', defaultRankingRules)
      expect(response).toHaveProperty(
        'distinctAttribute',
        defaultSettings.distinctAttribute
      )
      expect(response).toHaveProperty(
        'searchableAttributes',
        newSettings.searchableAttributes
      )
      expect(response).toHaveProperty('displayedAttributes', expect.any(Array))
      expect(response).toHaveProperty('stopWords', defaultSettings.stopWords)
      expect(response).toHaveProperty('synonyms', {})
    })

    test(`${permission} key: Update searchableAttributes settings on empty index with a primary key`, async () => {
      const client = await getClient(permission)
      const newSettings = {
        searchableAttributes: ['title'],
      }
      // Update settings
      const task: EnqueuedTask = await client
        .index(indexAndPK.uid)
        .updateSettings(newSettings)
      // Wait for setting addition to be done
      await client.index(index.uid).waitForTask(task.uid)

      // Fetch settings
      const response: Settings = await client
        .index(indexAndPK.uid)
        .getSettings()

      // compare searchableAttributes
      expect(response).toHaveProperty(
        'searchableAttributes',
        newSettings.searchableAttributes
      )

      expect(task).toHaveProperty('uid', expect.any(Number))
      expect(response).toHaveProperty('rankingRules', defaultRankingRules)
      expect(response).toHaveProperty(
        'distinctAttribute',
        defaultSettingsEmpty.distinctAttribute
      )
      expect(response).toHaveProperty(
        'searchableAttributes',
        newSettings.searchableAttributes
      )
      expect(response).toHaveProperty('displayedAttributes', expect.any(Array))
      expect(response).toHaveProperty('stopWords', defaultSettings.stopWords)
      expect(response).toHaveProperty('synonyms', {})
    })
  }
)

describe.each([{ permission: 'Public' }])(
  'Test on settings',
  ({ permission }) => {
    beforeEach(async () => {
      await clearAllIndexes(config)
    })
    test(`${permission} key: try to get settings and be denied`, async () => {
      const client = await getClient(permission)
      await expect(
        client.index(index.uid).getSettings()
      ).rejects.toHaveProperty('code', ErrorStatusCode.INVALID_API_KEY)
    })
    test(`${permission} key: try to update settings and be denied`, async () => {
      const client = await getClient(permission)
      await expect(
        client.index(index.uid).updateSettings({})
      ).rejects.toHaveProperty('code', ErrorStatusCode.INVALID_API_KEY)
    })
    test(`${permission} key: try to reset settings and be denied`, async () => {
      const client = await getClient(permission)
      await expect(
        client.index(index.uid).resetSettings()
      ).rejects.toHaveProperty('code', ErrorStatusCode.INVALID_API_KEY)
    })
  }
)

describe.each([{ permission: 'No' }])('Test on settings', ({ permission }) => {
  beforeEach(async () => {
    await clearAllIndexes(config)
  })
  test(`${permission} key: try to get settings and be denied`, async () => {
    const client = await getClient(permission)
    await expect(client.index(index.uid).getSettings()).rejects.toHaveProperty(
      'code',
      ErrorStatusCode.MISSING_AUTHORIZATION_HEADER
    )
  })
  test(`${permission} key: try to update settings and be denied`, async () => {
    const client = await getClient(permission)
    await expect(
      client.index(index.uid).updateSettings({})
    ).rejects.toHaveProperty(
      'code',
      ErrorStatusCode.MISSING_AUTHORIZATION_HEADER
    )
  })
  test(`${permission} key: try to reset settings and be denied`, async () => {
    const client = await getClient(permission)
    await expect(
      client.index(index.uid).resetSettings()
    ).rejects.toHaveProperty(
      'code',
      ErrorStatusCode.MISSING_AUTHORIZATION_HEADER
    )
  })
})

describe.each([
  { host: BAD_HOST, trailing: false },
  { host: `${BAD_HOST}/api`, trailing: false },
  { host: `${BAD_HOST}/trailing/`, trailing: true },
])('Tests on url construction', ({ host, trailing }) => {
  test(`Test getSettings route`, async () => {
    const route = `indexes/${index.uid}/settings`
    const client = new MeiliSearch({ host })
    const strippedHost = trailing ? host.slice(0, -1) : host
    await expect(client.index(index.uid).getSettings()).rejects.toHaveProperty(
      'message',
      `request to ${strippedHost}/${route} failed, reason: connect ECONNREFUSED ${BAD_HOST.replace(
        'http://',
        ''
      )}`
    )
  })

  test(`Test updateSettings route`, async () => {
    const route = `indexes/${index.uid}/settings`
    const client = new MeiliSearch({ host })
    const strippedHost = trailing ? host.slice(0, -1) : host
    await expect(
      client.index(index.uid).updateSettings({})
    ).rejects.toHaveProperty(
      'message',
      `request to ${strippedHost}/${route} failed, reason: connect ECONNREFUSED ${BAD_HOST.replace(
        'http://',
        ''
      )}`
    )
  })

  test(`Test resetSettings route`, async () => {
    const route = `indexes/${index.uid}/settings`
    const client = new MeiliSearch({ host })
    const strippedHost = trailing ? host.slice(0, -1) : host
    await expect(
      client.index(index.uid).resetSettings()
    ).rejects.toHaveProperty(
      'message',
      `request to ${strippedHost}/${route} failed, reason: connect ECONNREFUSED ${BAD_HOST.replace(
        'http://',
        ''
      )}`
    )
  })
})
