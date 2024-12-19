import preactType from 'preact';
import clsx from 'clsx';

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
  
  const peact: preactType;

  const clsx: (...inputs: clsx.ClassValue[]) => string;

  declare interface ILocalStorageData {
    lastViewedId: string | null;
    lastList: INewsMeta[];
  }
  
  declare interface INewsMeta {
    id: string;
    title: string;
    description: string;
    createdAt: string;
  }

  declare interface INews extends INewsMeta {
    html: string;
  }
  
  declare type ICheckNewsListResponse = {
    updated: boolean;
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
}

export {};