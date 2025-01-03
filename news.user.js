// ==UserScript==
// @name         Ruspixel news
// @namespace    https://ruspix.github.io/
// @version      1.11
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
// @require      https://unpkg.com/@popperjs/core@2
// @require      https://unpkg.com/tippy.js@6
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
				<h1>Новости Ruspixel</h1>
				<div class="rp-modal__header-menu">
					<button class="rp-modal__header-info">
						i
					</button>
					<button class="rp-modal__header-close">
						<img src="${addScriptRepoPrefix('/assets/close-icon.svg')}"/>
					</button>
				</div>
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

	initInfoPopover('.rp-modal__header-info');

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

/** @param {string} selector */
function initInfoPopover(selector) {
	tippy(selector, {
		maxWidth: 'none',
		allowHTML: true,
		trigger: 'click',
		arrow: false,
		interactive: true,
		hideOnClick: 'toggle',
		placement: 'right-end',
		content: `
			<div class="rp-modal__header-info-popover">
				<div>
					<p style="margin-bottom: 5px;">
						Этот скрипт и другие технологии были созданы бесплатно человеком с ником <span class="rp-modal__bold">Darkness</span>.
					</p>
					<p>
						Мы были бы очень признательны за пожертвования в знак благодарности и для того, чтобы помочь покрыть расходы на сервер, необходимые для поддержания работоспособности веб-сайта и скрипта.
					</p>
				</div>
				<div class="rp-modal__header-info-popover-links">
					<a
						href="https://discord.com/users/584671022918402049"
						target="_blank"
						class="rp-modal__header-info-popover-link"
					>
						<img src="${addScriptRepoPrefix('/assets/discord.svg')}" alt="discord logo"/>
					</a>
					<a
						href="https://boosty.to/touchedbydarkness"
						target="_blank"
						class="rp-modal__header-info-popover-link"
					>
						<img src="${addScriptRepoPrefix('/assets/donut.svg')}" alt="boosty logo"/>
					</a>
					<a
						href="https://github.com/TouchedByDarkness"
						target="_blank"
						class="rp-modal__header-info-popover-link"
					>
						<img src="${addScriptRepoPrefix('/assets/github.svg')}" alt="github logo"/>
					</a>
				</div>
			</div>
		`
	});
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

		const src = original.src;

		/** @type {ITemplate | null} */
		let template = null;
		try {
			template = parseTemplateSource(src)
		} catch (e) {
			console.warn(`error while parsing template "${src}"`);
			console.warn(e);
		}

		const onAddTemplate = () => {
			if(!template) return;

			if(isTemplateExists(template)) {
				updateTemplate(template);
				console.log(`template "${template.name}" updated`);
			} else {
				addTemplate(template);
				console.log(`template "${template.name}" added`);
			}
		}

		render(html`
			<div class="rp-article__content-image">
				<img handled src="${original.src}"/>
				<div class="rp-article__content-image-menu">
					<button
						title="download template"
						onclick=${() => void downloadImage(src)}
					>
						<img src="${addScriptRepoPrefix('/assets/download-icon.svg')}"/>
					</button>
					${ template &&
						html`
							<button
								title="add template to ppf"
								onclick=${onAddTemplate}
								class="rp-article__content-image-add-template"
							>
								<img src="${addScriptRepoPrefix('/assets/plus-icon.svg')}"/>
							</button>
						`
					}
				</div>
			</div>
		`, parent, original);
		original.remove();
	});

}

/**
 * @param {string} url
 * @param {string} filename
 */
async function downloadImage(
	url,
	filename = getFilenameFromUrl(url),
) {
	const res = await fetch(url);
	const blob = await res.blob();
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = filename;
	link.click();
	URL.revokeObjectURL(link.href);
}

/**
 * @param {string} url
 */
function getFilenameFromUrl(url) {
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

/**
 * @param {string} src
 * @returns {ITemplate}
 */
function parseTemplateSource(src) {
	const filename = removeExtensionFromFilename(getFilenameFromUrl(src));
	const [version, ...rest] = filename.split('_');

	if(+version === 0) {
		const [
			canvas,
			subCanvas,
			name,
			x,
			y,
		] = rest;

		if(canvas !== 'ppf') throw new Error('invalid canvas name');
	
		return {
			src,
			canvas,
			subCanvas,
			name,
			x: +x,
			y: +y,
		}
	}
	
	throw new Error('invalid template filename version');
}

/**
 * @param {string} filename
 */
function removeExtensionFromFilename(filename) {
	return filename.split('.')[0];
}

/**
 * @param {ITemplate} template 
 */
async function addTemplate(template) {
	const file = await loadFile(template.src);
	templateLoader.addFile(
		file,
		template.name,
		template.subCanvas ?? '0',
		template.x,
		template.y
	);
}

/**
 * @param {ITemplate} template 
 */
function isTemplateExists(template) {
	return findTemplate(template) !== undefined;
}

/**
 * @param {ITemplate} template 
 */
function findTemplate(template) {
	const list = getNativeTemplates();
	return list.find(t => template.name === t.title);
}

/**
 * @returns {INativeTemplate[]}
 */
function getNativeTemplates() {
	return JSON.parse(JSON.parse(localStorage['persist:tem']).list);
}

/**
 * @param {ITemplate} template 
 */
async function updateTemplate(template) {
	const found = findTemplate(template);
	if(!found) {
		console.warn('cant find template to update');
		return;
	}

	const file = await loadFile(template.src);
	templateLoader.updateFile(found.imageId, file);
}

/**
 * @param {string} src
 */
async function loadFile(src) {
	const res = await fetch(src);
	const data = await res.blob();
	const filename = getFilenameFromUrl(src);
	return new File([data], filename, {
		type: res.headers.get('Content-Type') ?? 'image/png',
	});
}