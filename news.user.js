// ==UserScript==
// @name         Ruspixel news
// @namespace    https://ruspix.github.io/
// @version      1.9
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
// @require      https://cdn.jsdelivr.net/npm/dayjs@1.11.13/dayjs.min.js
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

// const hostUrl = 'http://localhost';
const hostUrl = 'https://raw.githubusercontent.com/ruspix/script/main';
// const apiUrl = 'http://localhost/ruspixel';
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
		online: null,
		show: false,
	});

	/** @type {INews[]} */
	let newsList = [];

	button.root.addEventListener('click', () => {
		if(newsList.length) {
			setLastViewed(newsList[0].id);
		}

		modal.update({ show: !modal.props.show });
		button.update({ unchecked: false });
	});

	const modalCloseButton = modal.root.querySelector('.rp-modal__header-close');
	modalCloseButton?.addEventListener('click', () => {
		modal.update({ show: false });
	});

	let historyIsLoading = false;
	let allLoaded = false;
	modal.body.addEventListener('scroll', () => {
		const scrollBottom = (
			modal.body.scrollHeight -
			modal.body.scrollTop -
			modal.body.clientHeight
		);

		if(
			scrollBottom > 200 ||
			historyIsLoading ||
			allLoaded
		) return;

		historyIsLoading = true;

		fetchNewsList({
			html: true,
			offset: newsList.length,
		})
		.then(list => {
			if(
				list.length === 0 ||
				list.some(({ id }) => id === 1)
			) {
				allLoaded = true;
				return;
			}

			newsList.push(...list);
			uniqueNews(newsList);
			sortNews(newsList);
			modal.update({ news: newsList });
		})
		.finally(() => historyIsLoading = false);
	});

	newsList = await fetchNewsList({ html: true });
	modal.update({ news: newsList });

	const lastViewedId = loadLocalStorage()?.lastViewedId ?? null;
	if(
		lastViewedId !== null &&
		lastViewedId < newsList[0].id
	) {
		button.update({ unchecked: true });
	}

	const sse = connectSSE();
	
	sse.addEventListener('create-news', msg => {
		/** @type {INews} */
		const parsed = JSON.parse(msg.data);
		newsList.unshift(parsed);
		modal.update({ news: newsList });
		button.update({ unchecked: true });
		playNotification();
	});

	sse.addEventListener('update-news', msg => {
		/** @type {INews} */
		const parsed = JSON.parse(msg.data);
		const updateIndex = newsList.findIndex(({ id }) => parsed.id === id);
		if(updateIndex === -1) {
			console.warn('cant find news in list', parsed);
			return;
		}

		newsList[updateIndex] = parsed;
		modal.update({ news: newsList });
	});

	sse.addEventListener('delete-news', msg => {
		const deletedId = +msg.data;
		const deletedIndex = newsList.findIndex(({ id }) => id === deletedId);
		if(deletedId === -1) return;
		newsList.splice(deletedIndex, 1);
		modal.update({ news: newsList });
	});

	sse.addEventListener('update-online', msg => {
		/** @type {{ ips: number }} */
		const parsed = JSON.parse(msg.data);
		modal.update({ online: parsed.ips });
	});
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
					${
						props.updatedAt !== props.createdAt &&
						` (updated ${formatTime(props.updatedAt)})`
					}
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
				<p class="rp-modal__header-online">online: ${props.online ?? '-'}</p>
				<h1>Ruspixel News</h1>
				<button class="rp-modal__header-close">
					<img src="${addScriptRepoPrefix('/assets/close-icon.svg')}"/>
				</button>
			</div>
			<hr class="rp-modal__hr"/>
			<div class="rp-modal__body">
				${
					sortNews(props.news.slice(0))
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

	/** @type {HTMLDivElement | null} */
	const body = root.querySelector('div.rp-modal__body');
	if(!body) throw new Error('cant find modal body');

	return {
		root,
		body,
		get props() {
			return props;
		},
		update,
	}
}

/**
 * @param {string | Date} time
 * @returns {string}
 */
function formatTime(time) {
	return dayjs(time).format('YYYY-MM-DD hh:mm');
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

/**
 * @param {number} id 
 */
function setLastViewed(id) {
	const data = loadLocalStorage();
	if(!data) return;

	data.lastViewedId = id;
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
	return news.sort((a, b) => b.id - a.id);
}

/**
 * @param {INews[]} news
 */
function uniqueNews(news) {
	news.forEach((item, i) => {
		const firstIndex = news.findIndex(({ id }) => item.id === id);
		if(firstIndex === i) return;
		news.splice(i, 1);
	});
	return news;
}

/**
 * @returns {SSE}
 */
function connectSSE(
) {
	return new EventSource(`${apiUrl}/news/updates`);
}