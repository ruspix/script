// ==UserScript==
// @name         Ruspixel news
// @namespace    https://ruspix.github.io/
// @version      1.2
// @description  News for Ruspixel faction
// @author       Darkness
// @run-at       document-start
// @icon         https://raw.githubusercontent.com/ruspix/script/main/assets/ruspixel-icon.png
// @grant        GM_addStyle
// @downloadURL  https://raw.githubusercontent.com/ruspix/script/main/news.user.js
// @updateURL    https://raw.githubusercontent.com/ruspix/script/main/news.user.js
// @connect      githubusercontent.com
// @connect      github.com
// @connect      fuckyouarkeros.fun
// @connect      pixelplanet.fun
// @connect      pixmap.fun
// @connect      chillpixel.xyz
// @connect      pixelya.fun
// @connect      pixuniverse.fun
// @connect      globepixel.fun
// @connect      localhost
// @match        *://fuckyouarkeros.fun/*
// @match        *://pixelplanet.fun/*
// @match        *://pixmap.fun/*
// @match        *://chillpixel.xyz/*
// @match        *://pixelya.fun/*
// @match        *://pixuniverse.fun/*
// @match        *://globepixel.fun/*
// ==/UserScript==

/**
 * @typedef {import('./types').ILocalStorageData} ILocalStorageData
 * @typedef {import('./types').INewsMeta} INewsMeta
 * @typedef {import('./types').ICheckNewsListResponse} ICheckNewsListResponse
 */

// TODO
// handle case when modal opened and news updates

// const hostUrl = 'http://localhost';
const hostUrl = 'https://raw.githubusercontent.com/ruspix/script/main';
const newsUrl = 'https://raw.githubusercontent.com/ruspix/news/main';
const checkInterval = 5e3;
const localStorageKey = 'ruspixel-news';

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}

async function main() {
	addGlobalStyle();
	const button = addOpenButton();
	const {
		modal,
		closeButton,
		renderArticles,
	} = addModal();

	// bind modal handlers

	button.addEventListener('click', () => {
		if(modal.classList.contains('show')) {
			modal.classList.remove('show');
		} else {
			modal.classList.add('show');
			button.classList.remove('unchecked');
			setLastNewsAsLastViewed();
		}
	});

	closeButton.addEventListener('click', () => {
		modal.classList.remove('show');
	});

	const oldData = loadLocalStorage();
	if(oldData) {
		// set prev news if any
		const metas = oldData.lastList;
		const htmls = await fetchAllNewsHTML(metas);
		renderArticles(metas, htmls);
		
		// check if prev news is viewed
		if(oldData.lastViewedId !== oldData.lastList.at(-1)?.id) {
			button.classList.add('unchecked');
		}
	}

	// check current news and set check interval
	const checkIntervalCallback = async () => {
		const checkResult = await checkNews();
		if(!checkResult.updated) return;

		updateLocalStorage({
			lastList: checkResult.metas,
		});

		playNotification();
		const htmls = await fetchAllNewsHTML(checkResult.metas);
		renderArticles(checkResult.metas, htmls);
		button.classList.add('unchecked');
	}

	checkIntervalCallback();
	setInterval(checkIntervalCallback, checkInterval);
}

function addOpenButton() {
	const button = document.createElement('button');
	button.classList.add('rp-button');
	
	const icon = document.createElement('img');
	icon.src = addScriptRepoPrefix('/assets/ruspixel-icon.png');
	button.appendChild(icon);

	document.body.appendChild(button);

	return button;
}

function addModal() {
	const modal = document.createElement('div');
	modal.classList.add('rp-modal');

	const header = document.createElement('div');
	header.classList.add('rp-modal__header');
	modal.appendChild(header);

	const headerH1 = document.createElement('h1');
	headerH1.innerText = 'Ruspuxel News';
	header.appendChild(headerH1);

	const closeButton = document.createElement('button');
	closeButton.style.setProperty(
		'--mask-url',
		`url("${addScriptRepoPrefix('/assets/close-icon.svg')}")`);
	closeButton.classList.add('rp-modal__header-close');
	header.appendChild(closeButton);

	const closeIcon = document.createElement('img');
	closeIcon.src = addScriptRepoPrefix('/assets/close-icon.svg');
	closeButton.appendChild(closeIcon);

	const body = document.createElement('div');
	body.classList.add('rp-modal__body');
	modal.appendChild(body);

	document.body.appendChild(modal);

	/**
	 * @param {INewsMeta[]} metas 
	 * @param {string[]} htmls 
	 */
	const renderArticles = (metas, htmls) => {
		body.innerHTML = metas.map((meta, i) => {
			return `
				<article class="rp-article">	
					<div class="rp-article__header">
						<h1 class="rp-article__header-title">
							${meta.title}
						</h1>
						<div class="rp-article__header-time">
							${formatTime(meta.createdAt)}
						</div>
					</div>
					<div class="rp-article__content">
						${htmls[i]}
					</div>
				</article>
			`;
		}).reverse().join('');
	}

	return {
		modal,
		closeButton,
		renderArticles,
	}
}

/**
 * @param {string | Date} time 
 */
function formatTime(time) {
	const date = time instanceof Date ? time : new Date(time);
	return (
				date.getFullYear() + '-' +
				(date.getMonth() + 1) + '-' + 
				date.getDate() + ' ' + 
				date.getHours() + ':' + 
				date.getMinutes()
			)
}

/**
 * @returns {Promise<ICheckNewsListResponse>}
 */
async function checkNews() {
	const list = await fetchNewsList();
	const lastNews = list.at(-1);
	if(!lastNews) {
		return {
			updated: false,
			metas: [],
		}
	}

	const savedData = loadLocalStorage();
	const lastSavedMeta = savedData?.lastList.at(-1);
		return {
		updated: lastSavedMeta?.id !== lastNews.id,
		metas: list,
	}
}

async function addGlobalStyle() {
	const res = await fetch(
		addScriptRepoPrefix('/style.css'),
		{ cache: "no-cache" });
	const css = await res.text();
	GM_addStyle(css);
}

/**
 * @returns {Promise<INewsMeta[]>}
 */
async function fetchNewsList() {
	const listUrl = addScriptNewsRepoPrefix(`/list.json`);
	const res = await fetch(listUrl, { cache: "no-cache" });
	return res.json();
}

/**
 * @param {Pick<INewsMeta, 'id'>[]} ids
 */
async function fetchAllNewsHTML(ids) {
	return Promise.all(ids.map(({ id }) => fetchNewsHTML(id)));
}

/**
 * 
 * @param {string} id 
 * @returns {Promise<string>}
 */
async function fetchNewsHTML(id) {
	const newsUrl = addScriptNewsRepoPrefix(`/posts/${id}.html`);
	const res = await fetch(newsUrl, { cache: "no-cache" });
	return res.text();
}

/**
 * @param {Partial<ILocalStorageData>} changes 
 */
function updateLocalStorage(changes) {
	const old = loadLocalStorage() ?? getInitialLocalStorageData();
	saveLocalStorage({ ...old, ...changes });
}

/**
 * @returns {ILocalStorageData}
 */
function getInitialLocalStorageData() {
	return {
		lastViewedId: null,
		lastList: [],
	}
}

/**
 * @param {ILocalStorageData} data
 */
function saveLocalStorage(data) {
	localStorage.setItem(localStorageKey, JSON.stringify(data));
}

/**
 * @returns {ILocalStorageData | null}
 */
function loadLocalStorage() {
	const data = localStorage.getItem(localStorageKey);
	if(!data) return null;
	return JSON.parse(data);
}

/**
 * @param {string} path
 * @returns {string}
 */
function addScriptRepoPrefix(path) {
	return `${hostUrl}${path}`
}

function addScriptNewsRepoPrefix(path) {
	return `${newsUrl}${path}`
}

function playNotification() {
	return new Audio(addScriptRepoPrefix('/assets/notification-sound.mp3')).play();
}

function setLastNewsAsLastViewed() {
	const data = loadLocalStorage();
	if(!data) return;

	data.lastViewedId = data.lastList.at(-1)?.id ?? null;
	saveLocalStorage(data);
}
