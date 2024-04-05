import map from './map';

export type Database = ReturnType<typeof map.sqlite>;
export type CurrentUser = Awaited<ReturnType<ReturnType<typeof map.sqlite>['users']['getOne']>> | null | undefined;
