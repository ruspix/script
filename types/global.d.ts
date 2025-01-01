import type preact from 'preact';
import type dayjs from 'dayjs';

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

  const clsx: (...inputs: clsx.ClassValue[]) => string;

  declare interface ILocalStorageData {
    lastViewedId: number | null;
    lastList: INews[];
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
  }

  declare interface IButtonProps {
    unchecked: boolean;
  }

  declare type NewsLoadCallback = (list: INews[]) => void;
}

export {};