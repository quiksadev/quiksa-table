import React, {ReactNode} from "react";

export enum FilterType {
    TEXT = 'text',
    NUMBER = 'number',
    SELECT = 'select',
    DATE = 'date',
    CUSTOM = 'custom'
}

export enum EditorType {
    TEXT = 'text',
    NUMBER = 'number',
    SELECT = 'select',
    DATE = 'date',
    CUSTOM = 'custom'
}

export interface Column<T> {
    header: string;
    accessor: keyof T;
    render?: (value: T[keyof T], row: T) => JSX.Element;
    formatter?: (value: any) => any;
    filterable?: boolean;
    filterType?: FilterType;
    filterOptions?: any;
    editable?: boolean;
    editorType?: EditorType;
    editorOptions?: any;
}

export interface SortConfig<T> {
    key: keyof T;
    direction: 'ascending' | 'descending';
}

export interface FetchParams<T> {
    page: number;
    sortKey?: keyof T;
    sortDirection?: "ascending" | "descending";
    filterText?: string;
    columnFilters?: Partial<Record<keyof T, string>>;
    itemsPerPage?: number;
}

export interface FetchResult<T> {
    data: T[];
    totalPages: number;
}

export interface Action<T> {
    label: string;
    onClick: (row: T) => void;
    className?: string;
    icon?: React.ReactNode;
}

export interface QuiksaTableTheme {
    tableClassName?: string;
    headerClassName?: string;
    headerCellClassName?: string;
    bodyClassName?: string;
    rowClassName?: string | ((row: any, index: number) => string);
    cellClassName?: string | ((row: any, column: Column<any>, index: number) => string);
    filterRowClassName?: string;
    filterCellClassName?: string;
    paginationClassName?: string;
    customHeaderCellRender?: (column: Column<any>) => React.ReactNode;
    customCellRender?: (row: any, column: Column<any>, index: number) => React.ReactNode;

    sortAscendingIcon?: ReactNode;
    sortDescendingIcon?: ReactNode;
    sortDefaultIcon?: ReactNode;
    loadingIcon?: ReactNode;
    editIcon?: ReactNode;
    saveIcon?: ReactNode;
    cancelIcon?: ReactNode;
}

export interface TableProps<T, K extends keyof T> {
    columns: Column<T>[];
    data?: T[];
    fetchData?: (params: FetchParams<T>) => Promise<FetchResult<T>>;
    sortable?: boolean;
    filterable?: boolean;
    pageable?: boolean;
    itemsPerPage?: number;
    initialSortConfig?: SortConfig<T>|null;
    actions: Action<T>[];
    customHeaderComponent?: React.ReactNode;
    rowKey: K;
    selectable?: boolean;
    onSelectionChange?: (isAllSelected: boolean, selectedRowKeys: Set<T[K]>) => void;
    onCellUpdate?: (
        rowKeyValue: T[K],
        columnKey: keyof T,
        newValue: any
    ) => Promise<void>;
    theme?: QuiksaTableTheme;
}