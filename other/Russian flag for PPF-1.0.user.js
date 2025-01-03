// ==UserScript==
// @name           Russian flag for PPF
// @namespace      https://ruspixel.vercel.app/
// @version        1.0
// @author         nof
// @description    Add russian flag on cursor to PixelPlanet
// @icon           https://em-content.zobj.net/source/apple/391/flag-russia_1f1f7-1f1fa.png
// @connect		   pixelplanet.fun
// @connect		   fuckyouarkeros.fun
// @match          *://*.fuckyouarkeros.fun/*
// @match          *://*.pixelplanet.fun/*
// @require        https://unpkg.com/cursor-effects@latest/dist/browser.js
// ==/UserScript==

new cursoreffects.rainbowCursor({
      length: 30,
      colors: ["white","blue","red"],
      size: 7,
    });