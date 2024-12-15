Тут будет скрипт под tampermonkey и новостные файлы
  
some data rules  
  
/news/list.json  
  news in next type  
  
  {  
    id: string; // name of the news file, maybe in uuid  
    title: string; // news article  
    description: string; // news description  
    createdAt: string; // date when news created in GMT format "Fri, 13 Dec 2024 09:29:06 GMT"  
  }[]  
  
/news/[id].html  
  news file in html format  
  
/news/[id].md  
  news file in markdown format  
