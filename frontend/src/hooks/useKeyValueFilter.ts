import { useState, useMemo, useDeferredValue } from 'react';

export type FilterType = 'text' | 'number' | 'select';

export interface FilterColumn {
    key: string;
    label: string;
    type: FilterType;
    options?: { value: string; label: string }[]; // For 'select' type
    accessor?: (item: any) => any;
}

export interface ActiveFilter {
    key: string;
    value: string;
}

export function useKeyValueFilter<T>(
    data: T[],
    columns: FilterColumn[],
    initialFilter?: ActiveFilter
) {
    const [activeFilter, setActiveFilter] = useState<ActiveFilter | null | undefined>(initialFilter);
    const deferredActiveFilter = useDeferredValue(activeFilter);

    const filteredData = useMemo(() => {
        if (!deferredActiveFilter || !deferredActiveFilter.value) {
            return data;
        }

        const column = columns.find(col => col.key === deferredActiveFilter.key);
        if (!column) return data;

        return data.filter(item => {
            let itemValue;

            if (column.accessor) {
                try {
                    itemValue = column.accessor(item);
                } catch (e) {
                    itemValue = undefined;
                }
            } else {
                // Support nested keys via dot notation
                const keys = deferredActiveFilter!.key.split('.');
                itemValue = item;
                for (const k of keys) {
                    if (itemValue === undefined || itemValue === null) break;
                    itemValue = (itemValue as any)[k];
                }
            }

            if (itemValue === undefined || itemValue === null) return false;

            switch (column.type) {
                case 'text':
                    return String(itemValue).toLowerCase().includes(deferredActiveFilter.value.toLowerCase());
                case 'number':
                    // precise match for numbers, but handle string inputs
                    return Number(itemValue) === Number(deferredActiveFilter.value);
                case 'select':
                    return String(itemValue) === deferredActiveFilter.value;
                default:
                    return true;
            }
        });
    }, [data, deferredActiveFilter, columns]);

    return {
        filteredData,
        activeFilter,
        setActiveFilter,
    };
}
