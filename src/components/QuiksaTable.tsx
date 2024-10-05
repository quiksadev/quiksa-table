"use client";

import React, {useEffect, useMemo, useRef, useState} from "react";
import {
    Column,
    EditorType,
    FilterType,
    QuiksaTableTheme,
    SortConfig,
    TableProps
} from '../models/types';
import {useDebounce} from "use-debounce";
import {SortAscendingIcon} from "../icons/SortAscendingIcon";
import {SortDescendingIcon} from "../icons/SortDescendingIcon";
import {SortDefaultIcon} from "../icons/SortDefaultIcon";
import {LoadingIcon} from "../icons/LoadingIcon";
import {SaveIcon} from "../icons/SaveIcon";
import {CancelIcon} from "../icons/CancelIcon";

const QuiksaTable = <T extends Record<string, any>, K extends keyof T>({
                                                                           columns,
                                                                           data,
                                                                           fetchData,
                                                                           sortable = false,
                                                                           filterable = false,
                                                                           pageable = false,
                                                                           itemsPerPage = 10,
                                                                           initialSortConfig = null,
                                                                           actions = [],
                                                                           customHeaderComponent,
                                                                           rowKey,
                                                                           selectable = false,
                                                                           onSelectionChange,
                                                                           onCellUpdate,
                                                                           theme = {},
                                                                       }: TableProps<T, K>) => {
    const [tableData, setTableData] = useState<T[]>([]);
    const [filterText, setFilterText] = useState('');
    const [debouncedFilterText] = useDebounce(filterText, 500);
    const [columnFilters, setColumnFilters] = useState<Partial<Record<keyof T, any>>>({});
    const [debouncedColumnFilters] = useDebounce(columnFilters, 500);
    const [selectedRowKeys, setSelectedRowKeys] = useState<Set<T[K]>>(new Set());
    const [isAllSelected, setIsAllSelected] = useState(false);
    const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(
        initialSortConfig
    );
    const [editingCell, setEditingCell] = useState<{
        rowKeyValue: T[K] | null;
        columnKey: keyof T | null;
    }>({ rowKeyValue: null, columnKey: null });
    const [editingValue, setEditingValue] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [itemsPerPageState, setItemsPerPageState] = useState(itemsPerPage);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const isServerSide = typeof fetchData === "function";
    const selectAllRef = useRef<HTMLInputElement>(null);

    const paginatedData = useMemo(() => {
        if (isServerSide) return tableData;
    }, [isServerSide, tableData]);

    const defaultTheme: QuiksaTableTheme = {
        tableClassName: "min-w-full divide-y divide-gray-200",
        headerClassName: "bg-gray-50",
        headerCellClassName: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
        bodyClassName: "bg-white divide-y divide-gray-200",
        rowClassName: (row: any, index: number) => index % 2 === 0 ? "bg-white" : "bg-gray-50",
        cellClassName: "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
        filterRowClassName: "bg-gray-100",
        filterCellClassName: "px-6 py-2",
        paginationClassName: "mt-4 flex justify-between items-center",

        sortAscendingIcon: <SortAscendingIcon />,
        sortDescendingIcon: <SortDescendingIcon />,
        sortDefaultIcon: <SortDefaultIcon />,
        loadingIcon: <LoadingIcon />,
        saveIcon: <SaveIcon />,
        cancelIcon: <CancelIcon />,
    };

    const mergedTheme = { ...defaultTheme, ...theme };

    useEffect(() => {
        if (!isServerSide) {
            let processedData = [...(data) || []];

            if (filterText) {
                processedData = processedData.filter(row =>
                    Object.values(row).some(
                        (value) =>
                            typeof value === "string" &&
                            value.toLowerCase().includes(filterText.toLowerCase())
                    )
                );
            }

            Object.entries(debouncedColumnFilters).forEach(([key, value]) => {
                const column = columns.find(col => String(col.accessor) === key);

                if (column && value) {
                    switch (column.filterType) {
                        case FilterType.TEXT:
                            processedData = processedData.filter(row =>
                                String(row[key as keyof T]).toLowerCase().includes(String(value).toLowerCase())
                            );
                            break;
                        case FilterType.NUMBER:
                            const { min, max } = value;
                            if (min) {
                                processedData = processedData.filter(row => Number(row[key as keyof T]) >= Number(min));
                            }
                            if (max) {
                                processedData = processedData.filter(row => Number(row[key as keyof T]) <= Number(max));
                            }
                            break;
                        case FilterType.SELECT:
                            processedData = processedData.filter(row => row[key as keyof T] === value);
                            break;
                        case FilterType.DATE:
                            processedData = processedData.filter(row => row[key as keyof T] === value);
                            break;
                        default:
                            break;
                    }
                }
            });

            if (sortConfig) {
                const {key, direction} = sortConfig;
                processedData.sort((a, b) => {
                    if (a[key] < b[key]) return direction === "ascending" ? -1 : 1;
                    if (a[key] > b[key]) return direction === "ascending" ? 1 : -1;
                    return 0;
                });
            }

            const calculatedTotalPages = pageable ? Math.ceil(processedData.length / itemsPerPageState) : 1;
            setTotalPages(calculatedTotalPages);

            if (pageable) {
                const startIdx = (currentPage - 1) * itemsPerPageState;
                const endIdx = startIdx + itemsPerPageState;
                processedData = processedData.slice(startIdx, endIdx);
            }

            setTableData(processedData);
        }

    }, [isServerSide, data, filterText, debouncedColumnFilters, sortConfig, currentPage, itemsPerPageState, pageable, columns]);

    useEffect(() => {
        if (!isServerSide) return;

        const fetchDataFromBackend = async () => {
            setLoading(true);
            setError(null);

            try {
                const result = await fetchData({
                    page: currentPage,
                    sortKey: sortConfig?.key,
                    sortDirection: sortConfig?.direction,
                    filterText: debouncedFilterText,
                    columnFilters: debouncedColumnFilters,
                    itemsPerPage: itemsPerPageState
                });
                setTableData(result.data);
                setTotalPages(result.totalPages);
            } catch (err) {
                setError("Failed to fetch data");
            } finally {
                setLoading(false);
            }
        };

        fetchDataFromBackend();
    }, [fetchData, currentPage, sortConfig, debouncedFilterText, debouncedColumnFilters, itemsPerPageState, isServerSide]);

    useEffect(() => {
        if (selectAllRef.current && tableData) {
            if (isAllSelected) {
                selectAllRef.current.checked = true;
                selectAllRef.current.indeterminate = false;
            } else if (selectedRowKeys.size === 0) {
                selectAllRef.current.checked = false;
                selectAllRef.current.indeterminate = false;
            } else {
                selectAllRef.current.checked = false;
                selectAllRef.current.indeterminate = true;
            }
        }

        if (onSelectionChange) {
            onSelectionChange(isAllSelected, selectedRowKeys);
        }
    }, [isAllSelected, selectedRowKeys, paginatedData, onSelectionChange, tableData]);

    const handleSort = (key: keyof T) => {
        let direction: "ascending" | "descending" = "ascending";
        if (
            sortConfig &&
            sortConfig.key === key &&
            sortConfig.direction === "ascending"
        ) {
            direction = "descending";
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    const handleSelectAll = () => {
        if (isAllSelected) {
            setIsAllSelected(false);
            setSelectedRowKeys(new Set());
        } else {
            setIsAllSelected(true);
            if (isServerSide) {
                setSelectedRowKeys(new Set());
            } else {
                const allKeys = new Set<T[K]>(tableData.map(row => row[rowKey]));
                setSelectedRowKeys(allKeys);
            }
        }
    }

    const handleSelectRow = (key: T[K]) => {
        if (isServerSide) {
            if (isAllSelected) {
                setIsAllSelected(false);
                setSelectedRowKeys(new Set([key]));
            } else {
                setSelectedRowKeys((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(key)) {
                        newSet.delete(key);
                    } else {
                        newSet.add(key);
                    }
                    return newSet;
                });
            }
        } else {
            setSelectedRowKeys((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(key)) {
                    newSet.delete(key);
                } else {
                    newSet.add(key);
                }
                return newSet;
            });
        }
    };

    const handleCellClick = (row: T, column: Column<T>) => {
        if (column.editable && column.accessor) {
            setEditingCell({ rowKeyValue: row[rowKey], columnKey: column.accessor });
            setEditingValue(row[column.accessor]);
        }
    }

    const handleSaveChanges = async (rowKeyValue: T[K], columnKey: keyof T, value: any) => {
        try {
            if (onCellUpdate) {
                await onCellUpdate(rowKeyValue, columnKey, value);
            } else {
                console.warn('onCellUpdate function not defined!');
            }

            setTableData((prevData) =>
                prevData.map((row) =>
                    row[rowKey] === rowKeyValue ? { ...row, [columnKey]: value } : row
                )
            );
        } catch (error) {
            console.error('Update failed: ', error);
        }
    };

    const handleItemsPerPageChange = (value: number) => {
        setItemsPerPageState(value);
        setCurrentPage(1);
    }

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const handleColumnFilterChange = (key: keyof T, value: any) => {
        setColumnFilters(prev => ({
            ...prev,
            [key]: value,
        }));
        setCurrentPage(1);
    };

    const renderFilterInput = (column: Column<T>) => {
        const key = column.accessor as keyof T;
        const filterValue = columnFilters[key];

        switch (column.filterType) {
            case FilterType.NUMBER:
                return (
                    <div className="flex space-x-2 mt-1">
                        <input
                            type="number"
                            placeholder="Min"
                            value={filterValue?.min || ''}
                            onChange={(e) => handleColumnFilterChange(key, {
                                ...filterValue,
                                min: e.target.value,
                            })}
                            className="p-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition duration-200 w-1/2"
                        />
                        <input
                            type="number"
                            placeholder="Max"
                            value={filterValue?.max || ''}
                            onChange={(e) => handleColumnFilterChange(key, {
                                ...filterValue,
                                max: e.target.value,
                            })}
                            className="p-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition duration-200 w-1/2"
                        />
                    </div>
                );
            case FilterType.SELECT:
                return (
                    <select
                        value={filterValue || ''}
                        onChange={(e) => handleColumnFilterChange(key, e.target.value)}
                        className="mt-1 p-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition duration-200 w-full"
                    >
                        <option value="">Tümü</option>
                        {column.filterOptions?.map((option: any) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                );
            case FilterType.DATE:
                return (
                    <input
                        type="date"
                        value={filterValue || ''}
                        onChange={(e) => handleColumnFilterChange(key, e.target.value)}
                        className="mt-1 p-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition duration-200 w-full"
                    />
                );
            case FilterType.TEXT:
            default:
                return (
                    <input
                        type="text"
                        placeholder={`Filtrele ${column.header}`}
                        value={filterValue || ''}
                        onChange={(e) => handleColumnFilterChange(key, e.target.value)}
                        className="mt-1 p-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition duration-200 w-full"
                    />
                );
        }
    }

    const renderEditor = (row: T, column: Column<T>) => {
        const key = column.accessor as keyof T;

        const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            setEditingValue(e.target.value);
        };

        const handleSave = async () => {
            await handleSaveChanges(row[rowKey], key, editingValue);
            setEditingCell({ rowKeyValue: null, columnKey: null });
        };

        const handleCancel = () => {
            setEditingCell({ rowKeyValue: null, columnKey: null });
            setEditingValue(null);
        };

        switch (column.editorType) {
            case EditorType.NUMBER:
                return (
                    <div className="flex items-center">
                        <input
                            type="number"
                            value={editingValue}
                            onChange={handleChange}
                            className="p-1 border border-gray-300 rounded w-full"
                        />
                        <button onClick={handleSave} className="ml-2 text-green-500">
                            ✔
                        </button>
                        <button onClick={handleCancel} className="ml-1 text-red-500">
                            ✖
                        </button>
                    </div>
                );
            case EditorType.SELECT:
                return (
                    <div className="flex items-center">
                        <select
                            value={editingValue}
                            onChange={handleChange}
                            className="p-1 border border-gray-300 rounded w-full"
                        >
                            {column.editorOptions?.map((option: any) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <button onClick={handleSave} className="ml-2 text-green-500">
                            ✔
                        </button>
                        <button onClick={handleCancel} className="ml-1 text-red-500">
                            ✖
                        </button>
                    </div>
                );
            case EditorType.DATE:
                return (
                    <div className="flex items-center">
                        <input
                            type="date"
                            value={editingValue}
                            onChange={handleChange}
                            className="p-1 border border-gray-300 rounded w-full"
                        />
                        <button onClick={handleSave} className="ml-2 text-green-500">
                            ✔
                        </button>
                        <button onClick={handleCancel} className="ml-1 text-red-500">
                            ✖
                        </button>
                    </div>
                );
            case EditorType.TEXT:
            default:
                return (
                    <div className="flex items-center">
                        <input
                            type="text"
                            value={editingValue}
                            onChange={handleChange}
                            className="p-1 border border-gray-300 rounded w-full"
                        />
                        <button onClick={handleSave} className="ml-2 text-green-500">
                            ✔
                        </button>
                        <button onClick={handleCancel} className="ml-1 text-red-500">
                            ✖
                        </button>
                    </div>
                );
        }
    }

    const generatePageNumbers = () => {
        const pageNumbers = [];
        const totalPageCount = totalPages;
        const delta = 2; // numbers of pages to display around the active pages
        const range = [];

        for (
            let i = Math.max(2, currentPage - delta);
            i <= Math.min(totalPageCount - 1, currentPage + delta);
            i++
        ) {
            range.push(i);
        }

        if (currentPage - delta > 2) {
            pageNumbers.push(1, "...", ...range);
        } else {
            pageNumbers.push(1, ...range);
        }

        if (currentPage + delta < totalPageCount - 1) {
            pageNumbers.push("...", totalPageCount);
        } else {
            if (totalPageCount > 1 && !range.includes(totalPageCount)) {
                pageNumbers.push(totalPageCount);
            }
        }

        return pageNumbers;
    }

    const pageNumbers = generatePageNumbers();

    const formatValue = (value: any, column: Column<T>) => {
        if (column.formatter) {
            return column.formatter(value);
        }
        return value;
    }

    const allColumns = useMemo(() => {
        if (actions.length > 0) {
            return [
                ...columns,
                {
                    header: 'Actions',
                    accessor: '__actions__' as keyof T,
                    render: (_: any, row: T) => (
                        <div className="flex space-x-2">
                            {actions.map((action, index) => (
                                <button
                                    key={index}
                                    onClick={() => action.onClick(row)}
                                    className={action.className}
                                >
                                    {action.icon}
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    ),
                } as Column<T>,
            ];
        }
        return columns;
    }, [columns, actions]);

    return (
        <div className="w-full h-full p-4">
            <div className="mx-auto">
                {(filterable || customHeaderComponent) && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                        {customHeaderComponent && (
                            <div>
                                {customHeaderComponent}
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                            {filterable && (
                                <input
                                    type="text"
                                    placeholder="Filtrele..."
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="mb-2 sm:mb-0 px-4 py-2 bg-gray-200 border-2 border-gray-200 rounded focus:outline-none focus:bg-white focus:border-blue-500 transition duration-200 w-full sm:w-auto"
                                />
                            )}
                            {loading && (
                                <div className="ml-4">
                                    {mergedTheme.loadingIcon}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <div className="shadow overflow-x-auto border-b border-gray-200 sm:rounded-lg">
                    <table className={mergedTheme.tableClassName}>
                        <thead className={mergedTheme.headerClassName}>
                        <tr>
                            {selectable && (
                                <th className={mergedTheme.headerCellClassName}>
                                    <input
                                        type="checkbox"
                                        ref={selectAllRef}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                            )}
                            {allColumns.map(column => (
                                <th
                                    key={String(column.accessor)}
                                    className={mergedTheme.headerCellClassName}
                                >
                                    {mergedTheme.customHeaderCellRender
                                        ? mergedTheme.customHeaderCellRender(column)
                                        : (
                                            <div className="flex flex-col">
                                                <div
                                                    className={`flex items-center ${sortable && column.accessor && column.accessor !== '__actions__' ? 'cursor-pointer' : ''}`}
                                                    onClick={
                                                        sortable && column.accessor && column.accessor !== '__actions__'
                                                            ? () => handleSort(column.accessor as keyof T)
                                                            : undefined
                                                    }
                                                >
                                                    {column.header}
                                                    {sortable && column.accessor && column.accessor !== '__actions__' && (
                                                        <span className="ml-2">
                                                    {sortConfig?.key === column.accessor ? (
                                                        sortConfig.direction === 'ascending' ? (
                                                            mergedTheme.sortAscendingIcon
                                                        ) : (
                                                            mergedTheme.sortDescendingIcon
                                                        )
                                                    ) : (
                                                        mergedTheme.sortDefaultIcon
                                                    )}
                                                </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody className={mergedTheme.bodyClassName}>
                        <tr className={mergedTheme.filterRowClassName}>
                            {selectable && <td className={mergedTheme.filterCellClassName}></td>}
                            {allColumns.map((column) => (
                                <td key={String(column.accessor)} className={mergedTheme.filterCellClassName}>
                                    {column.filterable && column.accessor && column.accessor !== '__actions__'
                                        ? renderFilterInput(column)
                                        : null}
                                </td>
                            ))}
                        </tr>
                        {error ? (
                            <tr>
                                <td colSpan={selectable ? allColumns.length + 1 : allColumns.length}
                                    className="text-center py-4 text-red-500">
                                    {error}
                                </td>
                            </tr>
                        ) : tableData && tableData.length > 0 ? (
                            tableData.map((row, index) => {
                                const rowClassName = typeof mergedTheme.rowClassName === 'function'
                                    ? mergedTheme.rowClassName(row, index)
                                    : mergedTheme.rowClassName;
                                return (
                                    <tr key={`tableData-${index}`} className={rowClassName}>
                                        {selectable && (
                                            <td className={mergedTheme.cellClassName?.toString()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isAllSelected || selectedRowKeys.has(row[rowKey])}
                                                    onChange={() => handleSelectRow(row[rowKey])}
                                                />
                                            </td>
                                        )}
                                        {allColumns.map((column) => {
                                            const cellClassName = typeof mergedTheme.cellClassName === 'function'
                                                ? mergedTheme.cellClassName(row, column, index)
                                                : mergedTheme.cellClassName;

                                            return (
                                                <td key={String(column.accessor)} className={cellClassName}>
                                                    {mergedTheme.customCellRender
                                                        ? mergedTheme.customCellRender(row, column, index)
                                                        : (
                                                            editingCell.rowKeyValue === row[rowKey] && editingCell.columnKey === column.accessor ? (
                                                                renderEditor(row, column)
                                                            ) : column.editable && column.accessor ? (
                                                                <div
                                                                    onClick={() => handleCellClick(row, column)}
                                                                    className="cursor-pointer"
                                                                >
                                                                    {column.render
                                                                        ? column.render(
                                                                            row[column.accessor as keyof T],
                                                                            row
                                                                        )
                                                                        : formatValue(
                                                                            row[column.accessor as keyof T],
                                                                            column
                                                                        )}
                                                                </div>
                                                            ) : column.render ? (
                                                                column.render(
                                                                    row[column.accessor as keyof T],
                                                                    row
                                                                )
                                                            ) : (
                                                                formatValue(
                                                                    row[column.accessor as keyof T],
                                                                    column
                                                                )
                                                            )
                                                        )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                )
                            })
                        ) : (
                            <tr>
                                <td colSpan={selectable ? allColumns.length + 1 : allColumns.length}
                                    className="text-center py-4">
                                    Hiç veri bulunamadı
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                    {pageable && (
                        <div className={mergedTheme.paginationClassName}>
                            <div className="flex items-center">
                                <span className="mr-2">Per page:</span>
                                <select
                                    value={itemsPerPageState}
                                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                                    className="p-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition duration-200"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>

                            <div className="flex space-x-1">
                                {currentPage > 1 && (
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        className="px-3 py-1 bg-gray-200 rounded"
                                    >
                                        {"<"}
                                    </button>
                                )}
                                {pageNumbers.map((number, index) =>
                                    number === "..." ? (
                                        <span key={index} className="px-3 py-1">
                                        ...
                                    </span>
                                    ) : (
                                        <button
                                            key={index}
                                            onClick={() => handlePageChange(Number(number))}
                                            className={`px-3 py-1 rounded ${
                                                number === currentPage
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-gray-200"
                                            }`}
                                        >
                                            {number}
                                        </button>
                                    )
                                )}
                                {currentPage < totalPages && (
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        className="px-3 py-1 bg-gray-200 rounded"
                                    >
                                        {">"}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default QuiksaTable;