"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const timestring = require('timestring');
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
(() => __awaiter(void 0, void 0, void 0, function* () {
    const browser = yield chromium.launch({
        headless: false
    });
    const context = yield browser.newContext();
    context.setDefaultTimeout(1000 * 1000 * 1000);
    /**
     * Open a new page
     */
    const page = yield context.newPage();
    /**
     * Login to GitHub
     */
    yield page.goto('https://www.github.com');
    yield Promise.all([
        page.waitForNavigation(),
        page.click('a[href="/login"]')
    ]);
    yield page.fill('input[name="login"]', GITHUB_USERNAME);
    yield page.fill('input[name="password"]', GITHUB_PASSWORD);
    yield Promise.all([
        page.waitForNavigation(),
        page.click('input[type="submit"]')
    ]);
    /**
     * Login to GitHub organization SSO
     */
    yield Promise.all([
        page.waitForNavigation(),
        page.click(`a[href="/orgs/${GITHUB_ORGANIZATION}/sso?return_to=%2F"]`)
    ]);
    yield Promise.all([
        page.waitForNavigation(),
        page.click('button[type="submit"]')
    ]);
    yield page.fill('input[type="email"]', SSO_EMAIL);
    page.click('input[type="submit"]');
    yield page.fill('input[type="password"]', SSO_PASSWORD);
    yield Promise.all([
        page.waitForNavigation(),
        page.click('input[type="submit"]')
    ]);
    page.click('button[type="submit"]');
    /**
     * Scrape the URLs for workflow runs
     */
    const query = `is%3A${GITHUB_WORKFLOW_STATUS}+branch%3A${GITHUB_BRANCH}`;
    const testRunUrls = [];
    let durations = [];
    for (const pg of PAGINATION) {
        yield page.goto(`${GITHUB_REPOSITORY_URL}/actions/workflows/${GITHUB_WORKFLOW}?page=${pg}&query=${query}`);
        yield page.waitForSelector('a.Link--primary');
        const links = yield page.locator('a.Link--primary');
        const spans = yield page.locator('span.issue-keyword');
        testRunUrls.push(...(yield links.evaluateAll(list => list.map(element => element.href))));
        durations.push(...(yield spans.evaluateAll(list => list.map(element => element.innerHTML.trim()))));
    }
    durations = durations.filter((value, index) => index % 2 == 0).map(str => timestring(str));
    const testRuns = durations.map((value, index) => ({ duration: value, url: testRunUrls[index] }));
    console.log(testRunUrls);
    console.log(testRunUrls.length);
    console.log(durations);
    console.log(durations.length);
    fs_1.default.writeFileSync(`test-durations.json`, JSON.stringify(durations));
    fs_1.default.writeFileSync(`test-runs.json`, JSON.stringify(testRuns));
}))();
//# sourceMappingURL=index.js.map