import fs, { write } from 'fs'

const timestring = require('timestring')
const dotenv = require('dotenv')
const { chromium } = require('playwright')
const prompts = require('prompts')
const passwordPrompt = require('password-prompt')

dotenv.config()

const GITHUB_ORGANIZATION = process.env.GITHUB_ORGANIZATION
const GITHUB_USERNAME = process.env.GITHUB_USERNAME
let GITHUB_PASSWORD = process.env.GITHUB_PASSWORD

const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY
const GITHUB_WORKFLOW = process.env.GITHUB_WORKFLOW
const GITHUB_WORKFLOW_STATUS = process.env.GITHUB_WORKFLOW_STATUS
const GITHUB_BRANCH = process.env.GITHUB_BRANCH

const SSO_EMAIL = process.env.SSO_EMAIL
let SSO_PASSWORD = process.env.SSO_PASSWORD
const PAGE_COUNT = +process.env.PAGE_COUNT

const main: () => Promise<void> = async () => {
  console.log('👀 Welcome 👋 Let\' start scraping! 🚀')

  const pw: Playwright = await initPlaywright()
  
  await login(pw)

  let queryConfig: QueryConfig = getInitialQueryConfig()
  
  do {
    queryConfig = await askConfig(queryConfig)
    const results: Results = await scrape(pw, queryConfig)
    writeToDisk(results, queryConfig)
  } while (await askContinue())

  await pw.page.close()

  console.log('👀 See you, space cowboy! 🚀')

  process.exit()

}; main();

type Playwright = {
  browser: any,
  context: any,
  page: any
}

type QueryConfig = {
  repo: string,
  workflow: string,
  status: string,
  branch: string,
  pages: number,
}

type Results = {
  urls: string[]
  durations: number[]
}

async function initPlaywright(): Promise<Playwright> {
  const browser = await chromium.launch({
    headless: false
  });

  const context = await browser.newContext()
  context.setDefaultTimeout(1000 * 1000 * 1000)

  const page = await context.newPage()
  
  return {browser, context, page}
}

async function login(pw: Playwright): Promise<void> {
  await pw.page.goto('https://www.github.com')

  await Promise.all([
    pw.page.waitForNavigation(),
    pw.page.click('a[href="/login"]')
  ])
  
  await pw.page.fill('input[name="login"]', GITHUB_USERNAME)

  if (!GITHUB_PASSWORD) {
    GITHUB_PASSWORD = await passwordPrompt('🔐 Insert GitHub password: ', { method: 'hide' })
  }

  await pw.page.fill('input[name="password"]', GITHUB_PASSWORD)

  await Promise.all([
    pw.page.waitForNavigation(),
    pw.page.click('input[type="submit"]')
  ])

  console.log('👀 Grab your phone 📲 and perform MFA. You may need to enter a code in the browser! 💻')

  await Promise.all([
    pw.page.waitForNavigation(),
    pw.page.click(`a[href="/orgs/${GITHUB_ORGANIZATION}/sso?return_to=%2F"]`)
  ])

  await Promise.all([
    pw.page.waitForNavigation(),
    pw.page.click('button[type="submit"]')
  ])

  await pw.page.fill('input[type="email"]', SSO_EMAIL)

  pw.page.click('input[type="submit"]')
  
  if (!SSO_PASSWORD) {
    SSO_PASSWORD = await passwordPrompt('🔐 Insert SSO password: ', { method: 'hide' })
  }

  await pw.page.fill('input[type="password"]', SSO_PASSWORD)

  await Promise.all([
    pw.page.waitForNavigation(),
    pw.page.click('input[type="submit"]')
  ])
}

function getInitialQueryConfig(): QueryConfig {
  return {
    repo: GITHUB_REPOSITORY,
    workflow: GITHUB_WORKFLOW,
    status: GITHUB_WORKFLOW_STATUS,
    branch: GITHUB_BRANCH,
    pages: PAGE_COUNT,
  }
}

async function askConfig(cfg: QueryConfig): Promise<QueryConfig> {
  const notEmpty = (value: string) => (value.trim().length == 0 ? 'This should not be empty' : true)
  const notZero = (value: number) => (value == 0 ? 'This should not be zero' : true)
  
  const questions = [
    {
      type: 'text',
      name: 'repo',
      message: 'What repo do you want to scrape? 📁',
      initial: cfg.repo,
      validate: notEmpty
    },
    {
      type: 'text',
      name: 'workflow',
      message: 'What workflow do you want to scrape? 🤖',
      initial: cfg.workflow,
      validate: notEmpty
    },
    {
      type: 'text',
      name: 'status',
      message: 'What status do you want to scrape? ✅',
      initial: cfg.status,
      validate: notEmpty
    },
    {
      type: 'text',
      name: 'branch',
      message: 'What branch do you want to scrape? 🌳',
      initial: cfg.branch,
      validate: notEmpty
    },
    {
      type: 'number',
      name: 'pages',
      message: 'How many pages do you want to scrape? 📖',
      initial: cfg.pages,
      validate: notZero
    },
  ];

  const answer = await prompts(questions)

  return {
    repo: answer.repo,
    workflow: answer.workflow,
    status: answer.status,
    branch: answer.branch,
    pages: answer.pages,
  }
}

async function askContinue(): Promise<boolean> {
  const answer = await prompts({
    message: 'Continue scraping? 🚀',
    type: 'confirm',
    name: 'continue'
  })

  return answer.continue
}

async function scrape(pw: Playwright, cfg: QueryConfig): Promise<Results> {
  const githubRepoUrl = `https://www.github.com/${GITHUB_ORGANIZATION}/${cfg.repo}`
  const query = `is%3A${cfg.status}+branch%3A${cfg.branch}`;

  let urls = []
  let durations = []

  const pagination = [...Array(cfg.pages).keys()].map(i => i + 1)

  for (const pg of pagination) {
    console.log(`⏳ Scraping page ${pg} of ${pagination.length}...`)

    await pw.page.goto(`${githubRepoUrl}/actions/workflows/${cfg.workflow}?page=${pg}&query=${query}`)

    await pw.page.waitForSelector('a.Link--primary')
  
    const links = await pw.page.locator('a.Link--primary')
    const spans = await pw.page.locator('span.issue-keyword')

    urls.push(...(await links.evaluateAll(list => list.map(element => element.href))));
    durations.push(...(await spans.evaluateAll(list => list.map(element => element.innerHTML.trim()))));
  }

  console.log(`😈 Scraped ${pagination.length} pages!`)

  durations = durations.filter((value, index) => index % 2 == 0)
  .map(str => timestring(str))
  .reverse()

  urls = urls.reverse()

  return {urls, durations}
}

function writeToDisk(results: Results, cfg: QueryConfig): void {
  console.log(`💾 Writing results to disk...`)

  const testRuns = results.durations.map((value, index) => ({index: index, duration: value, url: results.urls[index]}))
  const durationsPlot = results.durations.map((value, index) => ({x: index, y: value}))

  if (!fs.existsSync('output')) fs.mkdirSync('output', {recursive: true})
  
  const outputSlug = `${GITHUB_ORGANIZATION}_${cfg.repo}_${cfg.branch}_${cfg.workflow.split('.')[0]}_${cfg.status}`
  const outputDir = `output/${outputSlug}`
  
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, {recursive: true})

  fs.writeFileSync(`${outputDir}/test-durations.json`, JSON.stringify(results.durations))
  fs.writeFileSync(`${outputDir}/test-runs.json`, JSON.stringify(testRuns))
  fs.writeFileSync(`${outputDir}/durations-plot.json`, JSON.stringify(durationsPlot))

  console.log(`✅ Current run saved at "${process.cwd()}/${outputDir}"`)
}