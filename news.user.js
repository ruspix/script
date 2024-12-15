// ==UserScript==
// @name         Ruspixel news
// @version      1.0
// @author       Darkness
// @run-at       document-start
// @icon         https://ruspix.github.io/ruspix.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
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
// @match        *://fuckyouarkeros.fun/*
// @match        *://pixelplanet.fun/*
// @match        *://pixmap.fun/*
// @match        *://chillpixel.xyz/*
// @match        *://pixelya.fun/*
// @match        *://pixuniverse.fun/*
// @match        *://globepixel.fun/*
// ==/UserScript==

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}

function main() {
	let opened = false;

	const onButtonClick = () => {
		if(opened) {

		} else {

		}
	}

	const button = document.createElement('div');
	button.addEventListener('click', onButtonClick);
	button.style = `
		box-sizing: border-box;
		position: fixed;
		top: 16px;
		right: 16px;
		width: 36px;
		height: 36px;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: rgba(0,0,0,0.25);
		border: darkred 1px solid;
		border-radius: 10px;
	`;
	
	const icon = document.createElement('img');
	icon.src = addScriptRepoPrefix('/ruspixel-icon.png');
	icon.style = `
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		object-fit: contain;
	`;
	button.appendChild(icon);

	document.body.appendChild(button);
}

function addScriptRepoPrefix(path) {
	return `https://raw.githubusercontent.com/ruspix/script/main${path}`
}