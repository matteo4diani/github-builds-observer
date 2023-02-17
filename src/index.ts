import fs from 'fs'

const timestring = require('timestring')
const dotenv = require('dotenv');
const { chromium } = require('playwright');

dotenv.config();

const GITHUB_ORGANIZATION = process.env.GITHUB_ORGANIZATION;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_PASSWORD = process.env.GITHUB_PASSWORD;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const GITHUB_REPOSITORY_URL = `https://www.github.com/${GITHUB_ORGANIZATION}/${GITHUB_REPOSITORY}`;
const GITHUB_WORKFLOWS_URI = `${GITHUB_REPOSITORY_URL}/actions/workflows`;
const GITHUB_WORKFLOW = process.env.GITHUB_WORKFLOW;
const GITHUB_WORKFLOW_STATUS = process.env.GITHUB_WORKFLOW_STATUS;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH;
const SSO_EMAIL = process.env.SSO_EMAIL;
const SSO_PASSWORD = process.env.SSO_PASSWORD;
const PAGE_COUNT = +process.env.PAGE_COUNT;
const PAGINATION = [...Array(+PAGE_COUNT).keys()].map(i => i + 1);

(async () => {
  const browser = await chromium.launch({
    headless: false
  });

  const context = await browser.newContext()
  context.setDefaultTimeout(1000 * 1000 * 1000)

  /**
   * Open a new page
   */

  const page = await context.newPage()

  /**
   * Login to GitHub
   */

  await page.goto('https://www.github.com')

  await Promise.all([
    page.waitForNavigation(),
    page.click('a[href="/login"]')
  ]);

  await page.fill('input[name="login"]', GITHUB_USERNAME)
  await page.fill('input[name="password"]', GITHUB_PASSWORD)

  await Promise.all([
    page.waitForNavigation(),
    page.click('input[type="submit"]')
  ]);

  /**
   * Login to GitHub organization SSO
   */

  await Promise.all([
    page.waitForNavigation(),
    page.click(`a[href="/orgs/${GITHUB_ORGANIZATION}/sso?return_to=%2F"]`)
  ]);

  await Promise.all([
    page.waitForNavigation(),
    page.click('button[type="submit"]')
  ]);

  await page.fill('input[type="email"]', SSO_EMAIL)

  page.click('input[type="submit"]')

  await page.fill('input[type="password"]', SSO_PASSWORD)

  await Promise.all([
    page.waitForNavigation(),
    page.click('input[type="submit"]')
  ]);

  page.click('button[type="submit"]')

  /**
   * Scrape the URLs for workflow runs
   */

  const query = `is%3A${GITHUB_WORKFLOW_STATUS}+branch%3A${GITHUB_BRANCH}`;

  const testRunUrls = []
  let durations = []

  for (const pg of PAGINATION) {
    await page.goto(`${GITHUB_REPOSITORY_URL}/actions/workflows/${GITHUB_WORKFLOW}?page=${pg}&query=${query}`)

    await page.waitForSelector('a.Link--primary')
  
    const links = await page.locator('a.Link--primary')
    const spans = await page.locator('span.issue-keyword')

    testRunUrls.push(...(await links.evaluateAll(list => list.map(element => element.href))));
    durations.push(...(await spans.evaluateAll(list => list.map(element => element.innerHTML.trim()))));

  }

  durations = durations.filter((value, index) => index % 2 == 0).map(str => timestring(str))
  const testRuns = durations.map((value, index) => ({duration: value, url: testRunUrls[index]}))
  console.log(testRunUrls)
  console.log(testRunUrls.length)
  console.log(durations)
  console.log(durations.length)

  fs.writeFileSync(`test-durations.json`, JSON.stringify(durations))
  fs.writeFileSync(`test-runs.json`, JSON.stringify(testRuns))

  await page.close();
})();