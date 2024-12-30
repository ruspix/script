// ==UserScript==
// @name         Ruspixel news
// @namespace    https://ruspix.github.io/
// @version      1.6
// @description  News for Ruspixel faction
// @author       Darkness
// @run-at       document-start
// @icon         https://raw.githubusercontent.com/ruspix/script/main/assets/ruspixel-icon.png
// @grant        GM_addStyle
// @downloadURL  https://raw.githubusercontent.com/ruspix/script/main/news.user.js
// @updateURL    https://raw.githubusercontent.com/ruspix/script/main/news.user.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/preact/10.25.3/preact.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/htm/3.1.1/htm.min.js
// @require      https://cdn.jsdelivr.net/npm/clsx@2.1.1/dist/clsx.min.js
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
// @connect      black-and-red.space
// @match        *://fuckyouarkeros.fun/*
// @match        *://pixelplanet.fun/*
// @match        *://pixmap.fun/*
// @match        *://chillpixel.xyz/*
// @match        *://pixelya.fun/*
// @match        *://pixuniverse.fun/*
// @match        *://globepixel.fun/*
// ==/UserScript==

const { h, render } = preact;
const html = htm.bind(h);

const hostUrl = 'http://localhost';
// const hostUrl = 'https://raw.githubusercontent.com/ruspix/script/main';
const apiUrl = 'https://black-and-red.space/ruspixel'
const checkInterval = 5e3;
const localStorageKey = 'ruspixel-news-v2';
const newsPerPage = 20;
const newsToRemember = 5;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}

async function main() {
	await addGlobalStyle();
	const button = addOpenButton({
		unchecked: false,
	});

	const modal = addModal({
		news: [],
		show: false,
	});

	button.root.addEventListener('click', () => {
		setLastNewsAsLastViewed();
		modal.update({ show: !modal.props.show });
		button.update({ unchecked: false });
	});

	const modalCloseButton = modal.root.querySelector('.rp-modal__header-close');
	modalCloseButton?.addEventListener('click', () => {
		modal.update({ show: false });
	});

	const oldData = loadLocalStorage();
	if(oldData) {
		// set prev news if any
		const news = oldData.lastList;
		modal.update({ news });
		
		// check if prev news is viewed
		if(
			oldData.lastList.length > 0 &&
			oldData.lastViewedId !== null &&
			oldData.lastViewedId < oldData.lastList[0].id
		) {
			button.update({ unchecked: true });
		}
	}

	// check current news and set check interval
	const checkIntervalCallback = async () => {
		const {
			updated,
			metas,
			lastViewedMismatched,
		} = await checkNews();
		if(!updated) return;

		const htmls = await fetchAllNewsHTML(metas)
		const news = mergeMetasAndHtmls(metas, htmls);
		updateLocalStorage({ lastList: news });
		modal.update({ news });

		if(lastViewedMismatched) {
			if(!modal.props.show) {
				button.update({ unchecked: true });
			}

			playNotification();
		}
	}

	checkIntervalCallback();
	setInterval(checkIntervalCallback, checkInterval);
}

/**
 * @param {IButtonProps} props 
 */
function Button(props) {
	return html`
		<button class="${clsx('rp-button', props.unchecked && 'unchecked')}">
			<img src=${addScriptRepoPrefix('/assets/ruspixel-icon.png')}/>
		</button>
	`;
}

/**
 * @param {IButtonProps} initial 
 */
function addOpenButton(initial) {
	const root = document.createElement('button');
	document.body.appendChild(root);

	let props = initial;
	render(Button(props), document.body, root);

	return {
		root,
		get props() {
			return props;
		},
		/**
		 * @param {Partial<IButtonProps>} changes
		 */
		update: changes => {
			props = { ...props, ...changes };
			render(Button(props), document.body, root);
		},
	}
}

/**
 * @param {IArticleProps} props
 */
function Article(props) {
	return html`
		<article class="rp-article">	
			<div class="rp-article__header">
				<h1 class="rp-article__header-title">
					${props.title}
				</h1>
				<div class="rp-article__header-time">
					${formatTime(props.createdAt)}
				</div>
			</div>
			<div
				class="rp-article__content"
				dangerouslySetInnerHTML=${{ __html: props.html }}
			></div>
		</article>
	`
}

function ArticleDelimiter() {
	return html`
		<hr class="rp-article-delimiter"/>
	`
}

/**
 * @param {IModalProps} props 
 */
function Modal(props) {
	return html`
		<div class="${clsx('rp-modal', props.show && 'show')}">
			<div class="rp-modal__header">
				<h1>Ruspixel News</h1>
				<button class="rp-modal__header-close">
					<img src="${addScriptRepoPrefix('/assets/close-icon.svg')}"/>
				</button>
			</div>
			<div class="rp-modal__body">
				${
					sortNews(props.news)
					.map(item => [Article(item), ArticleDelimiter()])
					.flat()
					.slice(0, -1)
				}
			</div>
		</div
	`
}

/**
 * @param {IModalProps} initial 
 */
function addModal(initial) {
	const root = document.createElement('div');
	document.body.appendChild(root);

	let props = initial;

	/**
		 * @param {Partial<IModalProps>} changes
		 */
	const update = changes => {
		props = { ...props, ...changes };
		render(Modal(props), document.body, root);
		replaceArticleImages(root);
	}
	
	update({});

	return {
		root,
		get props() {
			return props;
		},
		update,
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
	const lastNews = list.at(0);
	if(!lastNews) {
		return {
			updated: false,
			lastViewedMismatched: false,
			metas: [],
		}
	}

	const savedData = loadLocalStorage();
	if(!savedData) {
		return {
			updated: true,
			lastViewedMismatched: false,
			metas: list,
		}
	}

	const lastViewedMismatched = (
		savedData.lastViewedId !== null &&
		lastNews.id > savedData.lastViewedId
	);

	const updated = savedData.lastList.some(
		(old, i) => list[i].id !== old.id || list[i].updatedAt !== old.updatedAt );

	return {
		updated,
		lastViewedMismatched,
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
 * @param {string} path
 * @param {RequestInit | undefined} options
*/
async function fetchApi(path, options = undefined) {
	return fetch(apiUrl + path, options);
}

/**
 * @param {{ limit?: number, offset?: number, html?: boolean }} options
 * @returns {Promise<INews[]>}
 */
async function fetchNewsList({
	offset = 0,
	limit = newsPerPage,
	html = false,
} = {
	offset: 0,
	limit: newsPerPage,
	html: false,
}) {
	const res = await fetchApi(`/news?limit=${limit}&offset=${offset}&html=${html}`);
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
 * @param {number} id
 * @returns {Promise<string>}
 */
async function fetchNewsHTML(id) {
	const res = await fetchApi(`/news/html/${id}`);
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

function playNotification() {
	return new Audio(addScriptRepoPrefix('/assets/notification-sound.mp3')).play();
}

function setLastNewsAsLastViewed() {
	const data = loadLocalStorage();
	if(!data) return;

	data.lastViewedId = data.lastList.at(0)?.id ?? null;
	saveLocalStorage(data);
}

/**
 * @param {INewsMeta[]} metas 
 * @param {string[]} htmls 
 */
function mergeMetasAndHtmls(metas, htmls) {
	return metas.map((meta, i) => ({ ...meta, html: htmls[i] }));
}

/**
 * @param {HTMLElement} el
 */
function replaceArticleImages(el) {
	/** @type {HTMLElement[]} */
	let articles;
	if(el.classList.contains('rp-article')) {
		articles = [el];
	} else {
		articles = Array.from(el.querySelectorAll('.rp-article'));
	}

	/** @type {HTMLImageElement[]} */
	const images = [];
	articles.forEach(article => {
		images.push(...Array.from(article.querySelectorAll('img')));
	});
	
	Array.from(images)
	.filter(img => !img.hasAttribute('handled'))
	.forEach(original => {
		const parent = original.parentElement;
		if(!parent) return;
		render(html`
			<div class="rp-article__content-image">
				<img handled src="${original.src}"/>
				<button
					class="rp-article__content-image-download"
					onclick=${() => void downloadImage(original.src)}
				>
					<img src="${addScriptRepoPrefix('/assets/download-icon.svg')}"/>
				</button>
			</div>
		`, parent, original);
		original.remove();
	});

}

/**
 * @param {string} url
 * @param {string} fileName
 */
async function downloadImage(
	url,
	fileName = getFileNameFromUrl(url),
) {
	const res = await fetch(url);
	const blob = await res.blob();
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = fileName;
	link.click();
	URL.revokeObjectURL(link.href);
}

/**
 * @param {string} url
 */
function getFileNameFromUrl(url) {
	const parts = new URL(url).pathname.split('/');
	return parts[parts.length - 1];
}

/**
 * @param {INews[]} news
 */
function sortNews(news) {
	return news.slice(0).sort((a, b) => b.id - a.id);
}