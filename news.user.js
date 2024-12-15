// ==UserScript==
// @name         Ruspixel news
// @version      1.0
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

// const hostUrl = 'http://localhost';
const hostUrl = 'https://raw.githubusercontent.com/ruspix/script/main';
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
		setContent,
		setCreationTime,
		setTitle,
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
		const meta = oldData.lastList.at(-1);
		const html = await fetchNewsHTML(meta.id);
		setCreationTime(meta.createdAt);
		setTitle(meta.title);
		setContent(html);
		
		// check if prev news is viewed
		if(oldData.lastViewedId !== meta.id) {
			button.classList.add('unchecked');
		}
	}

	// check current news and set check interval
	const checkIntervalCallback = async () => {
		const checkResult = await checkNews();
		if(!checkResult.mustUpdate) return;

		setCreationTime(checkResult.meta.createdAt);
		setTitle(checkResult.meta.title);
		setContent(checkResult.html);
		playNotification();
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

	const title = document.createElement('h1');
	title.classList.add('rp-modal__header-title');
	header.appendChild(title);

	const time = document.createElement('div');
	time.classList.add('rp-modal__header-time');
	header.appendChild(time);

	const closeButton = document.createElement('button');
	closeButton.classList.add('rp-modal__header-close');
	header.appendChild(closeButton);

	const closeIcon = document.createElement('img');
	closeIcon.src = addScriptRepoPrefix('/assets/close-icon.svg');
	closeButton.appendChild(closeIcon);

	const body = document.createElement('div');
	body.classList.add('rp-modal__body');
	modal.appendChild(body);

	document.body.appendChild(modal);

	return {
		modal,
		closeButton,
		setTitle: text => {
			title.innerText = text;
		},
		setCreationTime: gmtTime => {
			const date = new Date(gmtTime);
			time.innerText = (
				date.getFullYear() + '-' +
				(date.getMonth() + 1) + '-' + 
				date.getDate() + ' ' + 
				date.getHours() + ':' + 
				date.getMinutes()
			)
		},
		setContent: html => {
			body.innerHTML = html;
		},
	}
}

async function checkNews() {
	const list = await fetchNewsList();
	const lastNews = list.at(-1);

	const savedData = loadLocalStorage();
	if(!savedData) {
		saveLocalStorage({ lastList: list });
		return {
			mustUpdate: true,
			meta: lastNews,
			html: await fetchNewsHTML(lastNews.id),
		}
	}

	const lastSavedNews = savedData.lastList.at(-1);
	if(JSON.stringify(lastSavedNews) === JSON.stringify(lastNews)) {
		return {
			mustUpdate: false,
			meta: null,
			html: null,
		}
	} else {
		saveLocalStorage({ lastList: list });
		return {
			mustUpdate: true,
			meta: lastNews,
			html: await fetchNewsHTML(lastNews.id),
		}
	}
}

async function addGlobalStyle() {
	const res = await fetch(
		addScriptRepoPrefix('/style.css'),
		{ cache: "no-cache" });
	const css = await res.text();
	GM_addStyle(css);
}

async function fetchNewsList() {
	const listUrl = addScriptRepoPrefix('/news/list.json');
	const res = await fetch(listUrl, { cache: "no-cache" });
	return res.json();
}

async function fetchNewsHTML(id) {
	const newsUrl = addScriptRepoPrefix(`/news/${id}.html`);
	const res = await fetch(newsUrl, { cache: "no-cache" });
	return res.text();
}

function saveLocalStorage(data) {
	localStorage.setItem(localStorageKey, JSON.stringify(data));
}

function loadLocalStorage() {
	const data = localStorage.getItem(localStorageKey);
	if(!data) return null;
	return JSON.parse(data);
}

function addScriptRepoPrefix(path) {
	return `${hostUrl}${path}`
}

function playNotification() {
	return new Audio(addScriptRepoPrefix('/assets/notification-sound.mp3')).play();
}

function setLastNewsAsLastViewed() {
	const data = loadLocalStorage();
	if(!data) return;

	data.lastViewedId = data.lastList.at(-1).id;
	saveLocalStorage(data);
}