import type preact from 'preact';
import type dayjs from 'dayjs';
import type tippy from 'tippy';

declare namespace clsx {
	type ClassValue = ClassArray | ClassDictionary | string | number | bigint | null | boolean | undefined;
	type ClassDictionary = Record<string, any>;
	type ClassArray = ClassValue[];
	function clsx(...inputs: ClassValue[]): string;
}

declare global {
  const htm: {
    bind<HResult>(
      h: (type: any, props: Record<string, any>, ...children: any[]) => HResult
    ): (strings: TemplateStringsArray, ...values: any[]) => HResult | HResult[];
  }
  
  const peact: preact;

  const dayjs: dayjs;

  const tippy: tippy;

  const clsx: (...inputs: clsx.ClassValue[]) => string;

  declare interface ILocalStorageData {
    lastViewedId: number | null;
  }
  
  declare interface INewsMeta {
    id: number;
    title: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  }

  declare interface INews extends INewsMeta {
    html: string;
  }
  
  declare type ICheckNewsListResponse = {
    updated: boolean;
		lastViewedMismatched: boolean;
    metas: INewsMeta[];
  }
  
  declare interface IArticleProps extends INews {}

  declare interface IModalProps {
    show: boolean;
    news: INews[];
    online: number | null;
  }

  declare interface IButtonProps {
    unchecked: boolean;
  }

  declare type NewsLoadCallback = (list: INews[]) => void;
  
  type SSEEvents = (
    'create-news' |
    'update-news' |
    'delete-news' |
    'update-online'
  )

  declare type SSE = {
    addEventListener<E extends SSEEvents>(
      event: E,
      handler: (msg: MessageEvent) => void,
    ): void;
  }
}

export {};