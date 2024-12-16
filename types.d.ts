export interface ILocalStorageData {
	lastViewedId: string | null;
	lastList: INewsMeta[];
}

export interface INewsMeta {
	id: string;
	title: string;
	description: string;
	createdAt: string;
}

export type ICheckNewsListResponse = {
	updated: boolean;
	metas: INewsMeta[];
}